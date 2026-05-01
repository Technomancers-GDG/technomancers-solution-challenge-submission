from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)
    facility_type: Mapped[str] = mapped_column(String(40), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    base_capacity_units: Mapped[int] = mapped_column(Integer)
    current_inventory_units: Mapped[int] = mapped_column(Integer, default=0)
    initial_inventory_units: Mapped[int] = mapped_column(Integer, default=0)
    queue_capacity_units: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class PortLink(Base):
    __tablename__ = "port_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    port_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), index=True)
    reserved_capacity_units: Mapped[int] = mapped_column(Integer, default=0)
    spillover_threshold_pct: Mapped[float] = mapped_column(Float, default=80.0)
    max_spillover_units: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    warehouse: Mapped[Facility] = relationship(
        "Facility", foreign_keys=[warehouse_id], lazy="joined"
    )
    port: Mapped[Facility] = relationship("Facility", foreign_keys=[port_id], lazy="joined")


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    override_rating: Mapped[float] = mapped_column(Float, default=1.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    accept_recommendation_bias: Mapped[float] = mapped_column(Float, default=0.5)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    identifier: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    vehicle_type: Mapped[str] = mapped_column(String(40), default="truck")
    payload_capacity_units: Mapped[int] = mapped_column(Integer)
    home_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    current_facility_id: Mapped[int] = mapped_column(
        ForeignKey("facilities.id"), nullable=True
    )
    driver_profile_id: Mapped[int] = mapped_column(ForeignKey("driver_profiles.id"))
    default_objective_id: Mapped[int] = mapped_column(
        ForeignKey("objectives.id"), nullable=True
    )
    average_speed_kmph: Mapped[float] = mapped_column(Float, default=48.0)
    emission_kg_per_km: Mapped[float] = mapped_column(Float, default=1.6)
    rest_every_hours: Mapped[float] = mapped_column(Float, default=8.0)
    rest_duration_minutes: Mapped[int] = mapped_column(Integer, default=45)
    status: Mapped[str] = mapped_column(String(40), default="idle")
    available_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    home_facility: Mapped[Facility] = relationship("Facility", foreign_keys=[home_facility_id])
    current_facility: Mapped[Facility] = relationship("Facility", foreign_keys=[current_facility_id])
    driver_profile: Mapped[DriverProfile] = relationship("DriverProfile", lazy="joined")


class Objective(Base):
    __tablename__ = "objectives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    commodity: Mapped[str] = mapped_column(String(80))
    origin_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    destination_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    dispatch_interval_minutes: Mapped[int] = mapped_column(Integer, default=120)
    loading_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    unloading_duration_minutes: Mapped[int] = mapped_column(Integer, default=35)
    sla_minutes: Mapped[int] = mapped_column(Integer, default=720)
    priority: Mapped[int] = mapped_column(Integer, default=1)
    assigned_vehicle_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    fallback_facility_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    origin_facility: Mapped[Facility] = relationship(
        "Facility", foreign_keys=[origin_facility_id], lazy="joined"
    )
    destination_facility: Mapped[Facility] = relationship(
        "Facility", foreign_keys=[destination_facility_id], lazy="joined"
    )


class RouteTemplate(Base):
    __tablename__ = "route_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    origin_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    destination_facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    distance_km: Mapped[float] = mapped_column(Float)
    duration_minutes: Mapped[float] = mapped_column(Float)
    encoded_polyline: Mapped[str] = mapped_column(Text, default="")
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(40), default="estimated")
    refreshed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ScenarioPreset(Base):
    __tablename__ = "scenario_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(140), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    event_city: Mapped[str] = mapped_column(String(80), index=True)
    event_type: Mapped[str] = mapped_column(String(80), default="disruption")
    severity: Mapped[float] = mapped_column(Float, default=0.6)
    eta_multiplier: Mapped[float] = mapped_column(Float, default=1.2)
    inventory_pressure_pct: Mapped[float] = mapped_column(Float, default=12.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class NewsEvent(Base):
    __tablename__ = "news_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    original_date: Mapped[Date] = mapped_column(Date, index=True)
    simulation_date: Mapped[Date] = mapped_column(Date, index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    headline: Mapped[str] = mapped_column(Text)
    relevant: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    impact_type: Mapped[str] = mapped_column(String(80), default="none")
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)
    model_probability: Mapped[float] = mapped_column(Float, default=0.0)


class WeatherEvent(Base):
    __tablename__ = "weather_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    original_date: Mapped[Date] = mapped_column(Date, index=True)
    simulation_date: Mapped[Date] = mapped_column(Date, index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)
    max_temp_c: Mapped[float] = mapped_column(Float)
    min_temp_c: Mapped[float] = mapped_column(Float)
    precipitation_mm: Mapped[float] = mapped_column(Float, default=0.0)
    closure_risk: Mapped[float] = mapped_column(Float, default=0.0)
    eta_multiplier: Mapped[float] = mapped_column(Float, default=1.0)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    simulation_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True)
    objective_id: Mapped[int] = mapped_column(ForeignKey("objectives.id"), index=True)
    current_facility_id: Mapped[int] = mapped_column(
        ForeignKey("facilities.id"), nullable=True
    )
    original_destination_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"))
    recommended_destination_id: Mapped[int] = mapped_column(
        ForeignKey("facilities.id"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(80), index=True)
    explanation: Mapped[str] = mapped_column(Text)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    baseline_cost: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_cost: Mapped[float] = mapped_column(Float, default=0.0)
    financial_impact_usd: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(40), default="suggested")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)


class DriverDecision(Base):
    __tablename__ = "driver_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    recommendation_id: Mapped[int] = mapped_column(ForeignKey("recommendations.id"))
    driver_profile_id: Mapped[int] = mapped_column(ForeignKey("driver_profiles.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    decision: Mapped[str] = mapped_column(String(40), index=True)
    actual_trip_cost: Mapped[float] = mapped_column(Float, default=0.0)
    recommended_trip_cost: Mapped[float] = mapped_column(Float, default=0.0)
    rating_delta: Mapped[float] = mapped_column(Float, default=0.0)
    note: Mapped[str] = mapped_column(Text, default="")


class DriverIncident(Base):
    __tablename__ = "driver_incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    driver_profile_id: Mapped[int] = mapped_column(ForeignKey("driver_profiles.id"), index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=True, index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)
    incident_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[float] = mapped_column(Float, default=0.6)
    note: Mapped[str] = mapped_column(Text, default="")
    linked_news_event_id: Mapped[int] = mapped_column(ForeignKey("news_events.id"), nullable=True)


class SimEvent(Base):
    __tablename__ = "sim_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    processed_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    objective_id: Mapped[int] = mapped_column(ForeignKey("objectives.id"), nullable=True)
    facility_id: Mapped[int] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class MetricsSnapshot(Base):
    __tablename__ = "metrics_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    co2_saved_kg: Mapped[float] = mapped_column(Float, default=0.0)
    idle_minutes_prevented: Mapped[float] = mapped_column(Float, default=0.0)
    on_time_delivery_pct: Mapped[float] = mapped_column(Float, default=100.0)
    warehouse_utilization_pct: Mapped[float] = mapped_column(Float, default=0.0)
    reroute_count: Mapped[int] = mapped_column(Integer, default=0)
    active_trucks: Mapped[int] = mapped_column(Integer, default=0)
    queued_trucks: Mapped[int] = mapped_column(Integer, default=0)
    financial_costs_saved_usd: Mapped[float] = mapped_column(Float, default=0.0)
    financial_costs_incurred_usd: Mapped[float] = mapped_column(Float, default=0.0)
