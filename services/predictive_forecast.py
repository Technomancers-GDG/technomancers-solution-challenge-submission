"""
Predictive Disruption Forecasting using Holt's Double Exponential Smoothing
with trend detection on weather and news patterns.
Forecasts route risk 6-24 hours ahead per city.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import NewsEvent, WeatherEvent


@dataclass(slots=True)
class RiskForecast:
    city: str
    forecast_time: datetime
    predicted_route_risk: float
    predicted_eta_multiplier: float
    predicted_closure_risk: float
    confidence: float
    contributing_factors: list[str]
    prediction_interval_low: float = 0.0
    prediction_interval_high: float = 1.0
    trend_direction: str = "stable"


class PredictiveForecastService:
    """
    Forecasting using Holt's Double Exponential Smoothing (additive trend)
    with weekly seasonality detection on historical weather/news patterns per city.
    """

    def __init__(self, history_window_days: int = 14) -> None:
        self.history_window_days = history_window_days
        self._cache: dict[tuple[str, date], RiskForecast] = {}
        self._cache_time: datetime | None = None

    def _invalidate_cache(self) -> None:
        self._cache.clear()
        self._cache_time = None

    def get_city_history(self, session: Session, city: str, end_date: date) -> list[dict[str, Any]]:
        start_date = end_date - timedelta(days=self.history_window_days)
        weather_rows = session.scalars(
            select(WeatherEvent).where(
                WeatherEvent.city == city,
                WeatherEvent.simulation_date >= start_date,
                WeatherEvent.simulation_date <= end_date,
            ).order_by(WeatherEvent.simulation_date)
        ).all()
        news_rows = session.scalars(
            select(NewsEvent).where(
                NewsEvent.city == city,
                NewsEvent.simulation_date >= start_date,
                NewsEvent.simulation_date <= end_date,
                NewsEvent.relevant.is_(True),
            ).order_by(NewsEvent.simulation_date)
        ).all()

        daily: dict[date, dict[str, Any]] = defaultdict(
            lambda: {"closure_risk": 0.0, "eta_multiplier": 1.0, "impact_score": 0.0, "precip": 0.0}
        )
        for w in weather_rows:
            d = daily[w.simulation_date]
            d["closure_risk"] = max(d["closure_risk"], w.closure_risk)
            d["eta_multiplier"] = max(d["eta_multiplier"], w.eta_multiplier)
            d["precip"] = max(d["precip"], w.precipitation_mm)
        for n in news_rows:
            d = daily[n.simulation_date]
            d["impact_score"] = max(d["impact_score"], n.impact_score)

        result = []
        for sim_date in sorted(daily.keys()):
            d = daily[sim_date]
            combined_risk = min(1.0, max(d["closure_risk"], d["impact_score"]) + d["precip"] * 0.01)
            result.append({
                "date": sim_date,
                "combined_risk": combined_risk,
                "eta_multiplier": d["eta_multiplier"],
                "precip": d["precip"],
                "impact_score": d["impact_score"],
                "day_of_week": sim_date.weekday(),
            })
        return result

    def _holts_double_exponential(
        self,
        values: list[float],
        alpha: float = 0.35,
        beta: float = 0.15,
    ) -> tuple[list[float], list[float]]:
        """
        Holt's Double Exponential Smoothing (additive trend).
        Returns (levels, trends) for each time step.
        """
        if not values:
            return [], []
        if len(values) == 1:
            return [values[0]], [0.0]

        # Initialize
        level = values[0]
        trend = values[1] - values[0]
        levels = [level]
        trends = [trend]

        for t in range(1, len(values)):
            new_level = alpha * values[t] + (1 - alpha) * (level + trend)
            new_trend = beta * (new_level - level) + (1 - beta) * trend
            level = new_level
            trend = new_trend
            levels.append(level)
            trends.append(trend)

        return levels, trends

    def _detect_weekly_seasonality(self, history: list[dict[str, Any]]) -> dict[int, float]:
        """Detect day-of-week seasonality pattern from historical data."""
        day_sums: dict[int, list[float]] = defaultdict(list)
        for h in history:
            day_sums[h["day_of_week"]].append(h["combined_risk"])

        overall_mean = np.mean([h["combined_risk"] for h in history]) if history else 0.0
        seasonal: dict[int, float] = {}
        for dow in range(7):
            if day_sums[dow]:
                seasonal[dow] = float(np.mean(day_sums[dow]) - overall_mean)
            else:
                seasonal[dow] = 0.0
        return seasonal

    def _prediction_interval(
        self,
        residuals: list[float],
        steps_ahead: float,
        confidence_level: float = 0.90,
    ) -> float:
        """Compute prediction interval half-width from forecast residuals."""
        if len(residuals) < 2:
            return 0.3  # wide default
        std = float(np.std(residuals, ddof=1))
        # Approximate z-score for 90% interval
        z = 1.645
        # Widen interval for further-ahead forecasts
        return z * std * (1.0 + 0.1 * steps_ahead)

    def forecast_city(self, session: Session, city: str, forecast_hours: int = 12, reference_date: date | None = None) -> RiskForecast | None:
        ref_dt = reference_date or datetime.utcnow().date()
        history = self.get_city_history(session, city, ref_dt)
        if len(history) < 3:
            predicted_risk = history[-1]["combined_risk"] if history else 0.1
            predicted_eta = history[-1]["eta_multiplier"] if history else 1.0
            return RiskForecast(
                city=city,
                forecast_time=datetime.combine(ref_dt, datetime.min.time()) + timedelta(hours=forecast_hours),
                predicted_route_risk=round(predicted_risk, 3),
                predicted_eta_multiplier=round(predicted_eta, 3),
                predicted_closure_risk=round(predicted_risk * 0.9, 3),
                confidence=0.1,
                contributing_factors=["insufficient history - using baseline"],
                prediction_interval_low=round(max(0.0, predicted_risk - 0.2), 3),
                prediction_interval_high=round(min(1.0, predicted_risk + 0.2), 3),
                trend_direction="stable",
            )

        risks = [h["combined_risk"] for h in history]
        etas = [h["eta_multiplier"] for h in history]

        # Apply Holt's double exponential smoothing
        risk_levels, risk_trends = self._holts_double_exponential(risks, alpha=0.35, beta=0.15)
        eta_levels, eta_trends = self._holts_double_exponential(etas, alpha=0.30, beta=0.10)

        # Weekly seasonality adjustment
        seasonal = self._detect_weekly_seasonality(history)
        forecast_date = ref_dt + timedelta(hours=forecast_hours)
        forecast_dow = forecast_date.weekday() if isinstance(forecast_date, date) else ref_dt.weekday()
        seasonal_adj = seasonal.get(forecast_dow, 0.0)

        # Forecast: level + trend * steps + seasonal
        steps = forecast_hours / 24.0
        predicted_risk = min(1.0, max(0.0,
            risk_levels[-1] + risk_trends[-1] * steps + seasonal_adj
        ))
        predicted_eta = max(1.0, eta_levels[-1] + eta_trends[-1] * steps)
        predicted_closure = predicted_risk * 0.9

        # Compute residuals for prediction interval
        residuals = []
        for i in range(1, len(risks)):
            one_step_forecast = risk_levels[i - 1] + risk_trends[i - 1]
            residuals.append(risks[i] - one_step_forecast)

        interval_hw = self._prediction_interval(residuals, steps)
        pi_low = max(0.0, predicted_risk - interval_hw)
        pi_high = min(1.0, predicted_risk + interval_hw)

        # Confidence based on data volume + residual tightness
        residual_std = float(np.std(residuals, ddof=1)) if len(residuals) >= 2 else 0.5
        data_conf = min(0.5, len(history) * 0.025)
        residual_conf = max(0.0, 0.5 - residual_std)
        confidence = min(0.95, data_conf + residual_conf)

        # Trend direction
        recent_trend = risk_trends[-1] if risk_trends else 0.0
        if recent_trend > 0.015:
            trend_direction = "rising"
        elif recent_trend < -0.015:
            trend_direction = "declining"
        else:
            trend_direction = "stable"

        # Contributing factors
        factors = []
        if trend_direction == "rising":
            factors.append(f"rising trend (+{recent_trend:.3f}/day)")
        elif trend_direction == "declining":
            factors.append(f"declining trend ({recent_trend:.3f}/day)")
        if seasonal_adj > 0.03:
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            factors.append(f"elevated {day_names[forecast_dow]} pattern")
        if history[-1].get("precip", 0) > 20:
            factors.append("heavy precipitation")
        if history[-1].get("impact_score", 0) > 0.5:
            factors.append("recent high-impact event")
        if residual_std > 0.3:
            factors.append("high volatility")

        return RiskForecast(
            city=city,
            forecast_time=datetime.combine(ref_dt, datetime.min.time()) + timedelta(hours=forecast_hours),
            predicted_route_risk=round(predicted_risk, 3),
            predicted_eta_multiplier=round(predicted_eta, 3),
            predicted_closure_risk=round(predicted_closure, 3),
            confidence=round(confidence, 3),
            contributing_factors=factors or ["stable conditions"],
            prediction_interval_low=round(pi_low, 3),
            prediction_interval_high=round(pi_high, 3),
            trend_direction=trend_direction,
        )

    def forecast_all_cities(self, session: Session, cities: set[str], forecast_hours: int = 12, reference_date: date | None = None) -> list[RiskForecast]:
        forecasts = []
        for city in cities:
            fc = self.forecast_city(session, city, forecast_hours, reference_date=reference_date)
            if fc:
                forecasts.append(fc)
        forecasts.sort(key=lambda f: f.predicted_route_risk, reverse=True)
        return forecasts

    def get_heatmap_data(self, session: Session, cities: set[str], forecast_hours: int = 12, reference_date: date | None = None) -> list[dict[str, Any]]:
        forecasts = self.forecast_all_cities(session, cities, forecast_hours, reference_date=reference_date)
        return [
            {
                "city": f.city,
                "risk": f.predicted_route_risk,
                "eta_multiplier": f.predicted_eta_multiplier,
                "closure_risk": f.predicted_closure_risk,
                "confidence": f.confidence,
                "factors": f.contributing_factors,
                "forecast_time": f.forecast_time.isoformat(),
                "prediction_interval": [f.prediction_interval_low, f.prediction_interval_high],
                "trend": f.trend_direction,
            }
            for f in forecasts
        ]
