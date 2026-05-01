from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

from config import settings

GEMINI_API_KEY = settings.gemini_api_key
GEMINI_DEBUG = os.getenv("GEMINI_DEBUG", "false").lower() == "true"


def _call_gemini_json(prompt: str, max_retries: int = 1) -> dict | None:
    """Internal helper to call Gemini and parse JSON response with retry logic.
    
    Args:
        prompt: The prompt to send to Gemini
        max_retries: Number of times to retry on JSON parse failure
        
    Returns:
        Parsed JSON dict or None if failed
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; skipping Gemini call.")
        return None

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        
        attempt = 0
        while attempt <= max_retries:
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )

                raw_text = response.text or ""
                if GEMINI_DEBUG:
                    logger.debug(f"Gemini raw response (attempt {attempt + 1}): {raw_text}")

                # Strip markdown code fences if present
                cleaned = raw_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                elif cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

                result = json.loads(cleaned)
                if GEMINI_DEBUG:
                    logger.debug(f"Parsed JSON: {result}")
                return result

            except json.JSONDecodeError as exc:
                attempt += 1
                if attempt <= max_retries:
                    logger.warning(f"JSON decode failed on attempt {attempt}, retrying...")
                    continue
                else:
                    logger.error(f"Gemini returned invalid JSON after {max_retries + 1} attempts: {exc}")
                    return None

    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        return None

    return None


def analyze_news_with_gemini(text: str) -> dict | None:
    """Analyze raw news text with Gemini and return structured disruption signals.

    Returns a dict with keys:
        - event_type (str): e.g. protest, flood, strike, storm
        - severity (str): low, medium, high
        - location (str): affected location
        - summary (str): one-sentence summary

    Returns None if Gemini is unavailable, the API key is missing, or the
    response cannot be parsed into valid JSON.
    """
    if not text or not text.strip():
        logger.debug("Empty news text; skipping Gemini analysis.")
        return None

    prompt = (
        "Analyze the following news and return ONLY valid JSON with keys "
        "event_type, severity, location, summary. No extra text.\n\n"
        f"News text: {text.strip()}"
    )

    result = _call_gemini_json(prompt)
    
    if result is None:
        return None

    expected_keys = {"event_type", "severity", "location", "summary"}
    if not expected_keys.issubset(result.keys()):
        logger.warning("Gemini response missing expected keys. Got: %s", result)
        return None

    # Normalize values
    result["event_type"] = str(result.get("event_type", "")).lower().strip()
    result["severity"] = str(result.get("severity", "")).lower().strip()
    result["location"] = str(result.get("location", "")).strip()
    result["summary"] = str(result.get("summary", "")).strip()

    logger.info(
        "Gemini analysis successful: event_type=%s, severity=%s, location=%s",
        result["event_type"],
        result["severity"],
        result["location"],
    )
    return result


def analyze_multiple_news(news_list: list[str]) -> dict | None:
    """Analyze multiple news items and return unified disruption risk assessment.

    Args:
        news_list: List of news headlines/texts to analyze together

    Returns dict with keys:
        - event_type (str): Primary disruption type
        - severity (str): low, medium, high
        - affected_regions (list): List of affected locations
        - risk_score (float): 0.0 to 1.0
        - confidence (float): 0.0 to 1.0
        - reasoning (str): Short explanation

    Returns None if analysis fails.
    """
    if not news_list or len(news_list) == 0:
        logger.debug("Empty news list; skipping multi-news analysis.")
        return None

    # Combine news into a single analysis prompt
    combined_news = "\n---\n".join(f"News {i+1}: {item}" for i, item in enumerate(news_list))

    prompt = (
        "Analyze these news items together and return ONLY valid JSON with keys: "
        "event_type, severity (low/medium/high), affected_regions (list), risk_score (0-1), "
        "confidence (0-1), reasoning. No markdown or extra text.\n\n"
        f"{combined_news}"
    )

    result = _call_gemini_json(prompt)
    
    if result is None:
        logger.warning("Multi-news analysis failed; returning None")
        return None

    expected_keys = {"event_type", "severity", "affected_regions", "risk_score", "confidence", "reasoning"}
    if not expected_keys.issubset(result.keys()):
        logger.warning("Multi-news response missing keys. Got: %s", result.keys())
        return None

    # Normalize and validate
    try:
        result["event_type"] = str(result.get("event_type", "")).lower().strip()
        result["severity"] = str(result.get("severity", "medium")).lower().strip()
        result["affected_regions"] = result.get("affected_regions", [])
        if not isinstance(result["affected_regions"], list):
            result["affected_regions"] = [str(result["affected_regions"])]
        result["risk_score"] = float(result.get("risk_score", 0.5))
        result["risk_score"] = max(0.0, min(1.0, result["risk_score"]))
        result["confidence"] = float(result.get("confidence", 0.5))
        result["confidence"] = max(0.0, min(1.0, result["confidence"]))
        result["reasoning"] = str(result.get("reasoning", "")).strip()

        logger.info(
            "Multi-news analysis successful: event_type=%s, severity=%s, risk_score=%.2f",
            result["event_type"],
            result["severity"],
            result["risk_score"],
        )
        return result
    except (ValueError, TypeError) as exc:
        logger.error("Failed to normalize multi-news result: %s", exc)
        return None


def analyze_route_impact(route: str, disruption_data: dict) -> dict | None:
    """Analyze impact of disruption on a specific route.

    Args:
        route: String like "City A → City B"
        disruption_data: Output from analyze_multiple_news() with keys
                        event_type, severity, affected_regions, risk_score

    Returns dict with keys:
        - impact (str): low, medium, high
        - recommended_action (str): continue, reroute, delay
        - reason (str): Short explanation

    Returns None if analysis fails.
    """
    if not route or not isinstance(disruption_data, dict):
        logger.debug("Invalid route or disruption_data; skipping route impact analysis.")
        return None

    affected_regions = disruption_data.get("affected_regions", [])
    event_type = disruption_data.get("event_type", "unknown")
    severity = disruption_data.get("severity", "low")
    risk_score = disruption_data.get("risk_score", 0.0)

    prompt = (
        "Given this route and disruption, return ONLY valid JSON with keys: "
        "impact (low/medium/high), recommended_action (continue/reroute/delay), reason. "
        "No markdown or extra text.\n\n"
        f"Route: {route}\n"
        f"Event type: {event_type}\n"
        f"Severity: {severity}\n"
        f"Risk score: {risk_score}\n"
        f"Affected regions: {', '.join(affected_regions)}"
    )

    result = _call_gemini_json(prompt)
    
    if result is None:
        logger.warning("Route impact analysis failed; returning None")
        return None

    expected_keys = {"impact", "recommended_action", "reason"}
    if not expected_keys.issubset(result.keys()):
        logger.warning("Route impact response missing keys. Got: %s", result.keys())
        return None

    # Normalize
    result["impact"] = str(result.get("impact", "low")).lower().strip()
    result["recommended_action"] = str(result.get("recommended_action", "continue")).lower().strip()
    result["reason"] = str(result.get("reason", "")).strip()

    logger.info(
        "Route impact analysis: route=%s, impact=%s, action=%s",
        route,
        result["impact"],
        result["recommended_action"],
    )
    return result


def generate_driver_message(decision: dict, disruption_data: dict) -> str:
    """Generate a simple, human-readable explanation for drivers.

    Args:
        decision: Dict with keys like 'action', 'route', etc.
        disruption_data: From analyze_multiple_news() with event details

    Returns:
        String (max 2 sentences, no technical jargon)
    """
    if not isinstance(decision, dict) or not isinstance(disruption_data, dict):
        return "Please await system update."

    action = decision.get("recommended_action", "proceed as planned")
    event_type = disruption_data.get("event_type", "disruption")
    location = ", ".join(disruption_data.get("affected_regions", ["your route"]))
    severity = disruption_data.get("severity", "low")

    prompt = (
        "Create a short, friendly 1-2 sentence driver message (no jargon). "
        "Return ONLY valid JSON with key 'message'. No markdown.\n\n"
        f"Action: {action}\n"
        f"Event: {event_type}\n"
        f"Location: {location}\n"
        f"Severity: {severity}"
    )

    result = _call_gemini_json(prompt)
    
    if result is None or "message" not in result:
        # Fallback message
        action_text = {
            "continue": "continue on your planned route",
            "reroute": "take a different route",
            "delay": "wait for updates before departing",
        }.get(action, "await instructions")
        return f"Due to a {event_type} near {location}, please {action_text}. Stay safe!"

    message = str(result.get("message", "")).strip()
    if not message:
        return f"Your route has been optimized. {action.capitalize()} as recommended."
    
    return message[:200]  # Cap at 200 chars


def generate_simulation_event(news_text: str) -> dict | None:
    """Generate a structured simulation event from news text.

    Args:
        news_text: Raw news headline or text

    Returns dict with keys:
        - event (str): Name of the event
        - severity (str): low, medium, high
        - location (str): Where it happens
        - estimated_duration_hours (int): How long it might last

    Returns None if generation fails.
    """
    if not news_text or not news_text.strip():
        logger.debug("Empty news text; skipping simulation event generation.")
        return None

    prompt = (
        "Convert this news into a simulation event. Return ONLY valid JSON with keys: "
        "event (event name), severity (low/medium/high), location (city/region), "
        "estimated_duration_hours (int). No markdown or extra text.\n\n"
        f"News: {news_text.strip()}"
    )

    result = _call_gemini_json(prompt)
    
    if result is None:
        return None

    expected_keys = {"event", "severity", "location", "estimated_duration_hours"}
    if not expected_keys.issubset(result.keys()):
        logger.warning("Simulation event response missing keys. Got: %s", result.keys())
        return None

    # Normalize
    try:
        result["event"] = str(result.get("event", "")).strip()
        result["severity"] = str(result.get("severity", "medium")).lower().strip()
        result["location"] = str(result.get("location", "")).strip()
        result["estimated_duration_hours"] = int(result.get("estimated_duration_hours", 2))
        result["estimated_duration_hours"] = max(1, min(168, result["estimated_duration_hours"]))

        logger.info(
            "Simulation event generated: event=%s, severity=%s, location=%s",
            result["event"],
            result["severity"],
            result["location"],
        )
        return result
    except (ValueError, TypeError) as exc:
        logger.error("Failed to normalize simulation event: %s", exc)
        return None
