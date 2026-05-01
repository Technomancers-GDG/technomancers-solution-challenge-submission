"""
Dynamic Inventory Optimization + Demand Forecasting.
Predicts demand per destination using historical patterns and recommends
safety stock levels and proactive dispatch timing.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Facility, Objective, Vehicle


@dataclass(slots=True)
class DemandForecast:
    facility_id: int
    facility_name: str
    predicted_demand_units: int
    safety_stock_units: int
    reorder_point: int
    recommended_dispatch_count: int
    confidence: float
    forecast_period_hours: int
    trend: str  # rising, falling, stable


@dataclass(slots=True)
class ProactiveDispatchRecommendation:
    origin_facility_id: int
    destination_facility_id: int
    recommended_units: int
    urgency: str  # low, medium, high, critical
    reason: str
    eta_hours: float


class InventoryOptimizer:
    """
    Demand forecasting using moving averages + trend detection.
    Recommends safety stock, reorder points, and proactive dispatches.
    """

    def __init__(self, forecast_window_hours: int = 48, z_score: float = 1.65) -> None:
        self.forecast_window_hours = forecast_window_hours
        self.z_score = z_score  # 95% service level

    def _simulate_historical_demand(
        self, session: Session, facility_id: int, days: int = 14
    ) -> list[float]:
        """
        Derive approximate demand from completed trips (vehicle payloads arriving).
        In production this would use actual consumption data.
        """
        # For demo: use facility current inventory changes as proxy
        facility = session.get(Facility, facility_id)
        if not facility:
            return []
        # Simulate daily demand as a function of facility throughput
        base_demand = facility.base_capacity_units * 0.08
        # Add seasonality and noise
        daily_demands = []
        for day in range(days):
            noise = np.random.normal(0, base_demand * 0.15)
            weekend_factor = 0.7 if day % 7 in {5, 6} else 1.0
            daily_demands.append(max(0, base_demand * weekend_factor + noise))
        return daily_demands

    def forecast_facility(self, session: Session, facility_id: int) -> DemandForecast | None:
        facility = session.get(Facility, facility_id)
        if not facility or facility.facility_type != "warehouse":
            return None

        history = self._simulate_historical_demand(session, facility_id)
        if len(history) < 3:
            return None

        # Moving average forecast
        ma3 = np.mean(history[-3:])
        ma7 = np.mean(history[-7:]) if len(history) >= 7 else ma3
        forecast_demand = (ma3 * 0.6 + ma7 * 0.4) * (self.forecast_window_hours / 24.0)

        # Trend
        if len(history) >= 7:
            slope = np.polyfit(np.arange(len(history[-7:])), history[-7:], 1)[0]
        else:
            slope = 0.0
        trend = "rising" if slope > history[-1] * 0.05 else "falling" if slope < -history[-1] * 0.05 else "stable"

        # Safety stock = z * sigma * sqrt(lead time)
        std_demand = np.std(history)
        lead_time_days = 1.0  # simplified
        safety_stock = int(self.z_score * std_demand * np.sqrt(lead_time_days))
        reorder_point = int(forecast_demand + safety_stock)

        current_inventory = facility.current_inventory_units
        projected_inventory = current_inventory - forecast_demand
        shortage = max(0, reorder_point - projected_inventory)
        recommended_dispatch_count = int(np.ceil(shortage / max(1, facility.base_capacity_units * 0.1)))

        confidence = min(0.9, 0.5 + len(history) * 0.03)

        return DemandForecast(
            facility_id=facility.id,
            facility_name=facility.name,
            predicted_demand_units=int(forecast_demand),
            safety_stock_units=safety_stock,
            reorder_point=reorder_point,
            recommended_dispatch_count=recommended_dispatch_count,
            confidence=round(confidence, 3),
            forecast_period_hours=self.forecast_window_hours,
            trend=trend,
        )

    def get_all_forecasts(self, session: Session) -> list[DemandForecast]:
        facilities = session.scalars(select(Facility).where(Facility.facility_type == "warehouse")).all()
        results = []
        for facility in facilities:
            fc = self.forecast_facility(session, facility.id)
            if fc:
                results.append(fc)
        return results

    def recommend_proactive_dispatches(self, session: Session) -> list[ProactiveDispatchRecommendation]:
        """
        Recommend sending goods BEFORE predicted disruptions cause stockouts.
        """
        forecasts = self.get_all_forecasts(session)
        objectives = session.scalars(select(Objective).where(Objective.active.is_(True))).all()
        vehicles = session.scalars(select(Vehicle)).all()

        avg_payload = int(np.mean([v.payload_capacity_units for v in vehicles])) if vehicles else 1000
        avg_speed = float(np.mean([v.average_speed_kmph for v in vehicles])) if vehicles else 48.0

        recommendations = []
        for fc in forecasts:
            if fc.recommended_dispatch_count <= 0:
                continue

            # Find best origin for this destination
            matching_objectives = [o for o in objectives if o.destination_facility_id == fc.facility_id]
            if not matching_objectives:
                continue

            objective = matching_objectives[0]
            origin = session.get(Facility, objective.origin_facility_id)
            if not origin:
                continue

            # Estimate travel time
            from services.route_planner import haversine_km
            distance = haversine_km(
                origin.latitude, origin.longitude,
                session.get(Facility, fc.facility_id).latitude,
                session.get(Facility, fc.facility_id).longitude,
            )
            eta_hours = (distance / max(avg_speed, 1)) * 1.22

            urgency = "low"
            if fc.trend == "rising" and fc.recommended_dispatch_count > 2:
                urgency = "critical"
            elif fc.trend == "rising" or fc.recommended_dispatch_count > 1:
                urgency = "high"
            elif fc.recommended_dispatch_count > 0:
                urgency = "medium"

            recommendations.append(
                ProactiveDispatchRecommendation(
                    origin_facility_id=objective.origin_facility_id,
                    destination_facility_id=fc.facility_id,
                    recommended_units=fc.recommended_dispatch_count * avg_payload,
                    urgency=urgency,
                    reason=(
                        f"{fc.facility_name} projected shortage of {fc.predicted_demand_units} units "
                        f"over next {self.forecast_window_hours}h. Trend: {fc.trend}."
                    ),
                    eta_hours=round(eta_hours, 1),
                )
            )

        recommendations.sort(key=lambda r: {"critical": 0, "high": 1, "medium": 2, "low": 3}[r.urgency])
        return recommendations
