from __future__ import annotations

from collections.abc import Iterable
from datetime import date

from sqlalchemy import delete
from sqlalchemy.orm import Session

from config import settings
from models import NewsEvent, WeatherEvent
from schemas import ImportSummary
from services.news_relevance import NewsRelevanceService
from services.workbook_reader import WorkbookXmlReader


def normalize_simulation_date(
    original_date: date, source_start_year: int, simulation_start_year: int
) -> date:
    target_year = simulation_start_year + (original_date.year - source_start_year)
    try:
        return date(target_year, original_date.month, original_date.day)
    except ValueError:
        if original_date.month == 2 and original_date.day == 29:
            return date(target_year, 2, 28)
        raise


def compute_weather_risk(
    precipitation_mm: float, max_temp_c: float, min_temp_c: float
) -> tuple[float, float]:
    closure_risk = 0.03
    eta_multiplier = 1.0
    if precipitation_mm >= 40:
        closure_risk += 0.52
        eta_multiplier += 0.35
    elif precipitation_mm >= 20:
        closure_risk += 0.26
        eta_multiplier += 0.18
    elif precipitation_mm >= 5:
        closure_risk += 0.12
        eta_multiplier += 0.08
    if max_temp_c >= 42 or min_temp_c <= 4:
        closure_risk += 0.08
        eta_multiplier += 0.05
    return round(min(0.95, closure_risk), 3), round(eta_multiplier, 3)


class EventIngestionService:
    def __init__(self, news_model: NewsRelevanceService) -> None:
        self.news_model = news_model

    def import_all(
        self, session: Session, full_news_import: bool = False, sample_per_sheet: int = 500
    ) -> ImportSummary:
        news_imported = self.import_news(
            session, full_news_import=full_news_import, sample_per_sheet=sample_per_sheet
        )
        weather_imported = self.import_weather(session)
        return ImportSummary(
            news_imported=news_imported,
            weather_imported=weather_imported,
            news_model_accuracy=self.news_model.validation_accuracy,
            validation_samples=self.news_model.validation_samples,
        )

    def import_news(
        self, session: Session, full_news_import: bool = False, sample_per_sheet: int = 500
    ) -> int:
        path = settings.news_dataset_path
        if not path.exists():
            return 0

        self.news_model.ensure_trained()
        reader = WorkbookXmlReader(path)
        session.execute(delete(NewsEvent))
        session.commit()

        imported = 0
        source_start_year = 2020
        batch: list[NewsEvent] = []
        for sheet_name in reader.sheet_names():
            rows = reader.iter_sheet_rows(sheet_name)
            if not full_news_import:
                rows = rows[:sample_per_sheet]
            for row in rows:
                date_text = row.get("Date")
                headline = (row.get("News") or "").strip()
                if not date_text or not headline:
                    continue
                original_date = date.fromisoformat(str(date_text))
                prediction = self.news_model.predict(
                    str(row.get("Category") or ""), headline
                )
                batch.append(
                    NewsEvent(
                        original_date=original_date,
                        simulation_date=normalize_simulation_date(
                            original_date, source_start_year, settings.simulation_start_date.year
                        ),
                        city=str(row.get("City") or sheet_name),
                        category=str(row.get("Category") or ""),
                        headline=headline,
                        relevant=prediction.relevant,
                        impact_type=prediction.impact_type,
                        impact_score=prediction.impact_score,
                        model_probability=prediction.model_probability,
                    )
                )
                if len(batch) >= 500:
                    session.add_all(batch)
                    session.commit()
                    imported += len(batch)
                    batch.clear()
        if batch:
            session.add_all(batch)
            session.commit()
            imported += len(batch)
        return imported

    def import_weather(self, session: Session) -> int:
        path = settings.weather_dataset_path
        if not path.exists():
            return 0

        reader = WorkbookXmlReader(path)
        session.execute(delete(WeatherEvent))
        session.commit()

        rows = reader.iter_sheet_rows("Historical Weather Data")
        imported = 0
        batch: list[WeatherEvent] = []
        source_start_year = 2024
        for row in rows:
            date_text = row.get("Date")
            city = row.get("City")
            if not date_text or not city:
                continue
            original_date = date.fromisoformat(str(date_text))
            max_temp = float(row.get("Max Temp (°C)") or 0.0)
            min_temp = float(row.get("Min Temp (°C)") or 0.0)
            precipitation = float(row.get("Precipitation (mm)") or 0.0)
            closure_risk, eta_multiplier = compute_weather_risk(
                precipitation, max_temp, min_temp
            )
            batch.append(
                WeatherEvent(
                    original_date=original_date,
                    simulation_date=normalize_simulation_date(
                        original_date, source_start_year, settings.simulation_start_date.year
                    ),
                    city=str(city),
                    max_temp_c=max_temp,
                    min_temp_c=min_temp,
                    precipitation_mm=precipitation,
                    closure_risk=closure_risk,
                    eta_multiplier=eta_multiplier,
                )
            )
            if len(batch) >= 500:
                session.add_all(batch)
                session.commit()
                imported += len(batch)
                batch.clear()

        if batch:
            session.add_all(batch)
            session.commit()
            imported += len(batch)
        return imported
