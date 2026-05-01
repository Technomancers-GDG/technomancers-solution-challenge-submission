from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class FacilityBase(BaseModel):
    name: str
    city: str
    facility_type: str = Field(pattern="^(warehouse|port)$")
    latitude: float
    longitude: float
    base_capacity_units: int
    current_inventory_units: int = 0
    initial_inventory_units: int = 0
    queue_capacity_units: int = 0
    active: bool = True


class FacilityCreate(FacilityBase):
    pass


class FacilityUpdate(BaseModel):
    name: str | None = None
    city: str | None = None
    base_capacity_units: int | None = None
    current_inventory_units: int | None = None
    initial_inventory_units: int | None = None
    queue_capacity_units: int | None = None
    active: bool | None = None


class FacilityRead(FacilityBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class PortLinkBase(BaseModel):
    warehouse_id: int
    port_id: int
    reserved_capacity_units: int = 0
    spillover_threshold_pct: float = 80.0
    max_spillover_units: int = 0
    active: bool = True


class PortLinkCreate(PortLinkBase):
    pass


class PortLinkRead(PortLinkBase, ORMModel):
    id: int


class DriverProfileBase(BaseModel):
    name: str
    override_rating: float = 1.0
    confidence: float = 0.5
    accept_recommendation_bias: float = 0.5
    active: bool = True


class DriverProfileCreate(DriverProfileBase):
    pass


class DriverProfileRead(DriverProfileBase, ORMModel):
    id: int


class VehicleBase(BaseModel):
    identifier: str
    vehicle_type: str = "truck"
    payload_capacity_units: int
    home_facility_id: int
    current_facility_id: int | None = None
    driver_profile_id: int
    default_objective_id: int | None = None
    average_speed_kmph: float = 48.0
    emission_kg_per_km: float = 1.6
    rest_every_hours: float = 8.0
    rest_duration_minutes: int = 45
    status: str = "idle"


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    current_facility_id: int | None = None
    default_objective_id: int | None = None
    status: str | None = None


class VehicleRead(VehicleBase, ORMModel):
    id: int
    available_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ObjectiveBase(BaseModel):
    name: str
    commodity: str
    origin_facility_id: int
    destination_facility_id: int
    dispatch_interval_minutes: int = 120
    loading_duration_minutes: int = 30
    unloading_duration_minutes: int = 35
    sla_minutes: int = 720
    priority: int = 1
    assigned_vehicle_ids: list[int] = Field(default_factory=list)
    fallback_facility_ids: list[int] = Field(default_factory=list)
    active: bool = True


class ObjectiveCreate(ObjectiveBase):
    pass


class ObjectiveUpdate(BaseModel):
    assigned_vehicle_ids: list[int] | None = None
    fallback_facility_ids: list[int] | None = None
    dispatch_interval_minutes: int | None = None
    loading_duration_minutes: int | None = None
    unloading_duration_minutes: int | None = None
    sla_minutes: int | None = None
    priority: int | None = None
    active: bool | None = None


class ObjectiveRead(ObjectiveBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class RouteTemplateRead(ORMModel):
    id: int
    route_key: str
    origin_facility_id: int
    destination_facility_id: int
    distance_km: float
    duration_minutes: float
    encoded_polyline: str
    steps: list[dict[str, Any]]
    source: str
    refreshed_at: datetime


class RecommendationRead(ORMModel):
    id: int
    created_at: datetime
    simulation_time: datetime
    vehicle_id: int
    objective_id: int
    current_facility_id: int | None
    original_destination_id: int
    recommended_destination_id: int | None
    action: str
    explanation: str
    score_breakdown: dict[str, Any]
    baseline_cost: float
    recommended_cost: float
    financial_impact_usd: float
    status: str
    confidence: float | None = None


class DriverDecisionRead(ORMModel):
    id: int
    decided_at: datetime
    recommendation_id: int
    driver_profile_id: int
    vehicle_id: int
    decision: str
    actual_trip_cost: float
    recommended_trip_cost: float
    rating_delta: float
    note: str


class NewsEventRead(ORMModel):
    id: int
    original_date: date
    simulation_date: date
    city: str
    category: str
    headline: str
    relevant: bool
    impact_type: str
    impact_score: float
    model_probability: float


class WeatherEventRead(ORMModel):
    id: int
    original_date: date
    simulation_date: date
    city: str
    max_temp_c: float
    min_temp_c: float
    precipitation_mm: float
    closure_risk: float
    eta_multiplier: float


class ImportSummary(BaseModel):
    news_imported: int = 0
    weather_imported: int = 0
    news_model_accuracy: float | None = None
    validation_samples: int | None = None


class SimulationControlRequest(BaseModel):
    speed_multiplier: float | None = None


class SimulationStatus(BaseModel):
    status: str
    simulation_time: datetime
    speed_multiplier: float
    queued_events: int
    error_message: str | None = None


class FleetScaleRequest(BaseModel):
    target_vehicle_count: int = Field(default=80, ge=12, le=2000)
    reset_simulation: bool = True
    auto_start: bool = True
    speed_multiplier: float = 180.0


class FleetScaleResult(BaseModel):
    previous_vehicle_count: int
    new_vehicle_count: int
    created_vehicles: int
    previous_driver_count: int
    new_driver_count: int
    created_drivers: int
    objective_assignment_counts: dict[str, int]
    simulation: SimulationStatus


class FacilityLoadView(BaseModel):
    facility_id: int
    facility_name: str
    facility_type: str
    city: str
    utilization_pct: float
    effective_available_units: int
    queue_capacity_units: int
    current_inventory_units: int


class VehicleStateView(BaseModel):
    vehicle_id: int
    identifier: str
    status: str
    objective_id: int | None
    current_facility_id: int | None
    next_facility_id: int | None
    progress_pct: float
    eta: datetime | None
    payload_units: int
    recommendation_action: str | None = None


class MetricsSnapshotRead(ORMModel):
    id: int
    captured_at: datetime
    co2_saved_kg: float
    idle_minutes_prevented: float
    on_time_delivery_pct: float
    warehouse_utilization_pct: float
    reroute_count: int
    active_trucks: int
    queued_trucks: int
    financial_costs_saved_usd: float
    financial_costs_incurred_usd: float
    stockouts_prevented: int = 0
    critical_deliveries_saved: int = 0
    beneficiary_locations_served: int = 0
    spoilage_or_wastage_prevented: int = 0


class MetricsSummary(BaseModel):
    co2_saved_kg: float
    idle_minutes_prevented: float
    on_time_delivery_pct: float
    warehouse_utilization_pct: float
    reroute_count: int
    active_trucks: int
    queued_trucks: int
    financial_costs_saved_usd: float = 0.0
    financial_costs_incurred_usd: float = 0.0
    stockouts_prevented: int = 0
    critical_deliveries_saved: int = 0
    beneficiary_locations_served: int = 0
    spoilage_or_wastage_prevented: int = 0


class DashboardSnapshot(BaseModel):
    simulation: SimulationStatus
    facilities: list[FacilityLoadView]
    vehicles: list[VehicleStateView]
    alerts: list[RecommendationRead]
    metrics: MetricsSummary
    active_events: list[dict[str, Any]]


class ScenarioPresetRead(ORMModel):
    id: int
    scenario_key: str
    name: str
    description: str
    event_city: str
    event_type: str
    severity: float
    eta_multiplier: float
    inventory_pressure_pct: float
    active: bool


class ScenarioComparisonMetrics(BaseModel):
    on_time_delivery_pct: float
    average_delay_minutes: float
    overflow_events: int
    reroute_count: int
    idle_minutes_prevented: float
    co2_saved_kg: float
    stockouts_prevented: int


class ScenarioComparisonRead(BaseModel):
    scenario_key: str
    scenario_name: str
    baseline: ScenarioComparisonMetrics
    ai: ScenarioComparisonMetrics
    improvement_summary: dict[str, float]


class DriverInstructionRead(BaseModel):
    recommendation_id: int
    created_at: datetime
    vehicle_id: int
    vehicle_identifier: str
    objective_name: str
    action: str
    explanation: str
    status: str


class DriverResponseRequest(BaseModel):
    recommendation_id: int
    decision: str = Field(pattern="^(accepted|ignored)$")
    note: str = ""


class RecommendationDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(accept|ignore)$")


class DriverIncidentCreate(BaseModel):
    driver_profile_id: int
    vehicle_id: int | None = None
    city: str
    incident_type: str
    severity: float = 0.6
    note: str = ""


class DriverIncidentRead(ORMModel):
    id: int
    reported_at: datetime
    driver_profile_id: int
    vehicle_id: int | None
    city: str
    incident_type: str
    severity: float
    note: str
    linked_news_event_id: int | None


class DriverMobileSnapshot(BaseModel):
    driver_id: int
    driver_name: str
    override_rating: float
    confidence: float
    pending_instructions: list[DriverInstructionRead]
    recent_incidents: list[DriverIncidentRead]


class RLDecisionRequest(BaseModel):
    facility_utilization: float
    route_risk: float
    eta_multiplier: float
    sla_remaining_minutes: float
    sla_total_minutes: float
    payload_capacity: int
    facility_capacity: int
    priority: int
    port_pressure: float
    weather_severity: float
    news_severity: float
    simulation_hour: int
    valid_actions: list[str] | None = None


class RLDecisionResponse(BaseModel):
    action: str
    confidence: float
    action_probs: dict[str, float]
    engine: str = "dqn_numpy"


class RiskForecastRead(BaseModel):
    city: str
    risk: float
    eta_multiplier: float
    closure_risk: float
    confidence: float
    factors: list[str]
    forecast_time: str
    prediction_interval: list[float] | None = None
    trend: str | None = None


class BlockchainBlockRead(BaseModel):
    index: int
    timestamp: str
    decision_type: str
    entity_id: int
    action: str
    explanation: str
    previous_hash: str
    metadata: dict[str, Any]
    nonce: int
    hash: str | None = None


class BlockchainVerifyRead(BaseModel):
    valid: bool
    block_count: int
    tampered_indices: list[int]
    last_block_hash: str | None


class InventoryForecastRead(BaseModel):
    facility_id: int
    facility_name: str
    predicted_demand_units: int
    safety_stock_units: int
    reorder_point: int
    recommended_dispatch_count: int
    confidence: float
    forecast_period_hours: int
    trend: str


class ProactiveDispatchRead(BaseModel):
    origin_facility_id: int
    destination_facility_id: int
    recommended_units: int
    urgency: str
    reason: str
    eta_hours: float


class EdgeSyncStatusRead(BaseModel):
    driver_profile_id: int
    pending_operations: list[dict[str, Any]]
    last_sync_at: str | None
    offline_since: str | None
    cached_routes: list[dict[str, Any]]
    cached_recommendations: list[dict[str, Any]]
    pending_count: int


class CloudHealthRead(BaseModel):
    firebase_rtdb: dict[str, Any]
    pubsub: dict[str, Any]
    vertex_ai: dict[str, Any]
    bigquery: dict[str, Any]
    fcm: dict[str, Any]
    overall: str


class ParetoFrontRead(BaseModel):
    objectives: list[float]
    genome: list[dict[str, Any]]
    rank: int
    crowding_distance: float
