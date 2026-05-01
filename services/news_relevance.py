from __future__ import annotations

from dataclasses import dataclass
import logging
import pickle
import re

from backend.utils.gemini_client import analyze_news_with_gemini
from config import settings

logger = logging.getLogger(__name__)

POSITIVE_CATEGORIES = {"Road Blockages", "Finance/Transport"}
NEGATIVE_CATEGORIES = {"Municipality", "Local Politics", "Geopolitics"}
KEYWORD_IMPACT = {
    "road": "road_blockage",
    "block": "road_blockage",
    "strike": "labor_disruption",
    "protest": "labor_disruption",
    "freight": "logistics_disruption",
    "transport": "logistics_disruption",
    "flood": "weather_disruption",
    "rain": "weather_disruption",
    "accident": "road_blockage",
}
REVIEWED_VALIDATION_SET = [
    ("Road Blockages", "Massive protest blocks ring road near Bengaluru logistics park.", 1),
    ("Finance/Transport", "Transport unions demand higher freight rates and halt operations.", 1),
    ("Municipality", "City corporation starts a flower show this weekend.", 0),
    ("Local Politics", "Minister visits district office for routine review.", 0),
    ("War", "Army convoy movement causes temporary highway diversions near the city.", 1),
    ("Geopolitics", "New export rule affects cargo inspection timelines at ports.", 1),
    ("Municipality", "Public park renovation opens to visitors this month.", 0),
    ("Road Blockages", "Flyover repair shuts major entry route for heavy vehicles.", 1),
]


@dataclass(slots=True)
class NewsPrediction:
    relevant: bool
    impact_type: str
    impact_score: float
    model_probability: float


class NewsRelevanceService:
    def __init__(self) -> None:
        self.vectorizer = None
        self.model = None
        self.validation_accuracy: float | None = None
        self.validation_samples: int = len(REVIEWED_VALIDATION_SET)
        self._trained = False

    def ensure_trained(self) -> None:
        if self._trained:
            return

        artifact_path = settings.news_model_artifact_path
        if artifact_path.exists():
            try:
                with artifact_path.open("rb") as file_obj:
                    artifact = pickle.load(file_obj)
                from sklearn.feature_extraction.text import TfidfVectorizer
                from sklearn.linear_model import LogisticRegression

                if isinstance(artifact, dict):
                    self.vectorizer = artifact.get("vectorizer")
                    self.model = artifact.get("model")
                    accuracy = artifact.get("validation_accuracy")
                    if isinstance(accuracy, (int, float)):
                        self.validation_accuracy = round(float(accuracy), 3)
                elif isinstance(artifact, tuple) and len(artifact) >= 2:
                    self.vectorizer = artifact[0]
                    self.model = artifact[1]

                if self.model is not None and self.vectorizer is not None:
                    print(f"[INFO] Loaded news relevance model artifact from {artifact_path}.")
                else:
                    self.model = None
                    self.vectorizer = None
                    print("[INFO] News model artifact missing required objects. Using heuristic fallback.")
            except Exception as exc:
                self.model = None
                self.vectorizer = None
                print(f"[INFO] Failed to load news model artifact: {exc}. Using heuristic fallback.")
        else:
            print("[INFO] News model artifact not found. Using heuristic fallback.")

        self._trained = True

    def predict(self, category: str, headline: str) -> NewsPrediction:
        # Try Gemini-powered analysis first
        try:
            gemini_result = analyze_news_with_gemini(headline)
            if gemini_result is not None:
                return self._map_gemini_to_prediction(gemini_result)
        except Exception as exc:
            logger.error("Gemini prediction failed, falling back to NLP: %s", exc)

        # Fallback to existing NLP pipeline
        self.ensure_trained()
        heuristic_probability = self._heuristic_probability(category, headline)
        model_probability = heuristic_probability
        if self.model is not None and self.vectorizer is not None:
            matrix = self.vectorizer.transform([self._compose_text(category, headline)])
            model_probability = float(self.model.predict_proba(matrix)[0][1])

        probability = max(heuristic_probability, model_probability)
        impact_type = self._impact_type(category, headline, probability)
        impact_score = round(min(1.0, probability + (0.08 if impact_type != "none" else 0.0)), 3)
        return NewsPrediction(
            relevant=probability >= 0.55,
            impact_type=impact_type,
            impact_score=impact_score if probability >= 0.55 else round(impact_score * 0.45, 3),
            model_probability=round(model_probability, 3),
        )

    def _compose_text(self, category: str, headline: str) -> str:
        return f"{category.lower()} :: {headline.lower()}"

    def _weak_label(self, category: str, headline: str) -> int:
        category = category.strip()
        if category in POSITIVE_CATEGORIES:
            return 1
        if category in NEGATIVE_CATEGORIES:
            return 0
        keywords = self._keyword_hits(headline)
        return 1 if keywords >= 2 else 0

    def _keyword_hits(self, headline: str) -> int:
        text = headline.lower()
        return sum(1 for keyword in KEYWORD_IMPACT if keyword in text)

    def _heuristic_probability(self, category: str, headline: str) -> float:
        category = category.strip()
        if category == "Road Blockages":
            return 0.95
        if category == "Finance/Transport":
            return 0.72
        keyword_hits = self._keyword_hits(headline)
        if category == "War" and keyword_hits > 0:
            return 0.63
        if category == "Geopolitics" and re.search(r"port|export|inspection|border", headline.lower()):
            return 0.58
        return min(0.9, 0.18 + keyword_hits * 0.18)

    def _impact_type(self, category: str, headline: str, probability: float) -> str:
        lowered = headline.lower()
        if probability < 0.4:
            return "none"
        if category == "Road Blockages" or any(token in lowered for token in ("road", "block", "accident", "closure", "diversion")):
            return "road_blockage"
        if any(token in lowered for token in ("strike", "union", "protest", "freight")):
            return "labor_disruption"
        if any(token in lowered for token in ("flood", "rain", "storm")):
            return "weather_disruption"
        if any(token in lowered for token in ("port", "export", "inspection")):
            return "port_disruption"
        return "logistics_disruption"

    def _map_gemini_to_prediction(self, gemini_result: dict) -> NewsPrediction:
        """Convert Gemini structured JSON into the internal NewsPrediction format."""
        event_type = str(gemini_result.get("event_type", "")).lower().strip()
        severity = str(gemini_result.get("severity", "")).lower().strip()

        # Map Gemini severity to probability / score
        severity_map = {
            "high": 0.92,
            "medium": 0.72,
            "low": 0.35,
        }
        probability = severity_map.get(severity, 0.5)

        # Map event_type to internal impact_type taxonomy
        if any(k in event_type for k in ("protest", "strike", "union", "labor", "riot")):
            impact_type = "labor_disruption"
        elif any(k in event_type for k in ("flood", "storm", "rain", "weather", "cyclone", "earthquake")):
            impact_type = "weather_disruption"
        elif any(k in event_type for k in ("road", "block", "accident", "closure", "traffic", "diversion", "highway")):
            impact_type = "road_blockage"
        elif any(k in event_type for k in ("port", "dock", "shipping", "harbor", "vessel")):
            impact_type = "port_disruption"
        else:
            impact_type = "logistics_disruption"

        relevant = probability >= 0.55
        impact_score = round(
            min(1.0, probability + (0.08 if impact_type != "none" else 0.0)), 3
        )
        if not relevant:
            impact_score = round(impact_score * 0.45, 3)

        logger.info(
            "Gemini-mapped prediction: relevant=%s, impact_type=%s, impact_score=%s",
            relevant,
            impact_type,
            impact_score,
        )
        return NewsPrediction(
            relevant=relevant,
            impact_type=impact_type,
            impact_score=impact_score,
            model_probability=round(probability, 3),
        )

    def _evaluate_validation_set(self) -> float | None:
        if self.model is None or self.vectorizer is None:
            return None
        correct = 0
        for category, headline, label in REVIEWED_VALIDATION_SET:
            matrix = self.vectorizer.transform([self._compose_text(category, headline)])
            probability = float(self.model.predict_proba(matrix)[0][1])
            prediction = 1 if max(probability, self._heuristic_probability(category, headline)) >= 0.55 else 0
            correct += int(prediction == label)
        return round(correct / len(REVIEWED_VALIDATION_SET), 3)
