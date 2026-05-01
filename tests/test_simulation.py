from __future__ import annotations

from datetime import date, datetime

from models import Facility, Objective, PortLink, RouteTemplate, Vehicle
from services.event_ingestion import compute_weather_risk
from services.news_relevance import NewsRelevanceService
from services.route_planner import RoutePlanner
from services.simulation import DecisionEngine, LiveVehicleState, SimulationEngine


def make_facility(
    facility_id: int,
    name: str,
    city: str,
    facility_type: str,
    capacity: int,
    inventory: int,
) -> Facility:
    return Facility(
        id=facility_id,
        name=name,
        city=city,
        facility_type=facility_type,
        latitude=0.0,
        longitude=0.0,
        base_capacity_units=capacity,
        current_inventory_units=inventory,
        initial_inventory_units=inventory,
        queue_capacity_units=1000,
        active=True,
    )


def make_route(route_key: str, origin_id: int, destination_id: int, distance_km: float, minutes: float) -> RouteTemplate:
    return RouteTemplate(
        route_key=route_key,
        origin_facility_id=origin_id,
        destination_facility_id=destination_id,
        distance_km=distance_km,
        duration_minutes=minutes,
        encoded_polyline="",
        steps=[],
        source="estimated",
    )


def test_effective_capacity_accounts_for_port_spillover() -> None:
    engine = DecisionEngine()
    warehouse = make_facility(1, "Warehouse", "Delhi", "warehouse", 10000, 7000)
    port = make_facility(2, "Port", "Mumbai", "port", 15000, 14000)
    link = PortLink(
        warehouse_id=1,
        port_id=2,
        reserved_capacity_units=1000,
        spillover_threshold_pct=80,
        max_spillover_units=1800,
        active=True,
    )

    available = engine.effective_available_units(
        1, {1: warehouse, 2: port}, [link], {1: 500}
    )

    assert available == -300


def test_reroutes_when_destination_is_near_capacity() -> None:
    engine = DecisionEngine()
    origin = make_facility(1, "Delhi Hub", "Delhi", "warehouse", 10000, 3500)
    destination = make_facility(2, "Chennai Warehouse", "Chennai", "warehouse", 10000, 9600)
    fallback = make_facility(3, "Bengaluru Warehouse", "Bengaluru", "warehouse", 12000, 4000)
    objective = Objective(
        id=1,
        name="Iron Ore",
        commodity="Iron Ore",
        origin_facility_id=1,
        destination_facility_id=2,
        dispatch_interval_minutes=120,
        loading_duration_minutes=30,
        unloading_duration_minutes=35,
        sla_minutes=1400,
        priority=2,
        assigned_vehicle_ids=[1],
        fallback_facility_ids=[3],
        active=True,
    )
    vehicle = Vehicle(
        id=1,
        identifier="DL-001",
        payload_capacity_units=1000,
        home_facility_id=1,
        current_facility_id=1,
        driver_profile_id=1,
        default_objective_id=1,
        average_speed_kmph=48,
        emission_kg_per_km=1.5,
        rest_every_hours=8,
        rest_duration_minutes=45,
        status="idle",
    )
    routes = {
        2: make_route("1:2", 1, 2, 1900, 2100),
        3: make_route("1:3", 1, 3, 1700, 1800),
    }
    risks = {
        2: {"route_risk": 0.62, "eta_multiplier": 1.12},
        3: {"route_risk": 0.18, "eta_multiplier": 1.03},
    }

    decision = engine.score_dispatch_options(
        sim_time=datetime(2026, 1, 1, 9, 0),
        vehicle=vehicle,
        objective=objective,
        current_facility=origin,
        facilities={1: origin, 2: destination, 3: fallback},
        port_links=[],
        inbound_reserved={2: 400},
        route_data=routes,
        risk_lookup=risks,
    )

    assert decision.action == "reroute_warehouse"
    assert decision.destination_id == 3


def test_continue_when_capacity_and_risk_are_healthy() -> None:
    engine = DecisionEngine()
    origin = make_facility(1, "Delhi Hub", "Delhi", "warehouse", 10000, 2500)
    destination = make_facility(2, "Chennai Warehouse", "Chennai", "warehouse", 12000, 5000)
    objective = Objective(
        id=1,
        name="Iron Ore",
        commodity="Iron Ore",
        origin_facility_id=1,
        destination_facility_id=2,
        dispatch_interval_minutes=120,
        loading_duration_minutes=30,
        unloading_duration_minutes=35,
        sla_minutes=1600,
        priority=2,
        assigned_vehicle_ids=[1],
        fallback_facility_ids=[],
        active=True,
    )
    vehicle = Vehicle(
        id=1,
        identifier="DL-001",
        payload_capacity_units=1000,
        home_facility_id=1,
        current_facility_id=1,
        driver_profile_id=1,
        default_objective_id=1,
        average_speed_kmph=48,
        emission_kg_per_km=1.5,
        rest_every_hours=8,
        rest_duration_minutes=45,
        status="idle",
    )
    decision = engine.score_dispatch_options(
        sim_time=datetime(2026, 1, 1, 9, 0),
        vehicle=vehicle,
        objective=objective,
        current_facility=origin,
        facilities={1: origin, 2: destination},
        port_links=[],
        inbound_reserved={},
        route_data={2: make_route("1:2", 1, 2, 1900, 2100)},
        risk_lookup={2: {"route_risk": 0.12, "eta_multiplier": 1.0}},
    )

    assert decision.action == "continue"
    assert decision.destination_id == 2


def test_weather_risk_thresholds_raise_eta_multiplier() -> None:
    closure_risk, eta_multiplier = compute_weather_risk(48.0, 41.0, 19.0)
    assert closure_risk > 0.5
    assert eta_multiplier > 1.3


def test_news_relevance_flags_route_impacting_story() -> None:
    service = NewsRelevanceService()
    prediction = service.predict(
        "Road Blockages",
        "Heavy vehicle strike blocks highway access to the Chennai logistics corridor.",
    )

    assert prediction.relevant is True
    assert prediction.impact_type in {"road_blockage", "labor_disruption"}
    assert prediction.impact_score >= 0.75


def test_route_planner_estimation_returns_steps() -> None:
    planner = RoutePlanner(osrm_base_url="http://127.0.0.1:9999")
    origin = Facility(
        id=1,
        name="Delhi",
        city="Delhi",
        facility_type="warehouse",
        latitude=28.6139,
        longitude=77.2090,
        base_capacity_units=10000,
        current_inventory_units=1000,
        initial_inventory_units=1000,
        queue_capacity_units=400,
        active=True,
    )
    destination = Facility(
        id=2,
        name="Mumbai",
        city="Mumbai",
        facility_type="port",
        latitude=19.0760,
        longitude=72.8777,
        base_capacity_units=12000,
        current_inventory_units=3000,
        initial_inventory_units=3000,
        queue_capacity_units=800,
        active=True,
    )
    route = planner._estimated_route(origin, destination)

    assert route["distance_km"] > 1000
    assert route["duration_minutes"] > 1000
    assert len(route["steps"]) == 3


def test_simulation_seed_handles_large_vehicle_state_counts() -> None:
    engine = SimulationEngine(RoutePlanner())
    engine.live_vehicle_states = {
        idx: LiveVehicleState(
            vehicle_id=idx,
            identifier=f"TRK-{idx}",
            status="in_transit" if idx % 3 == 0 else "waiting",
            current_facility_id=None,
        )
        for idx in range(1, 10001)
    }

    active = sum(1 for state in engine.live_vehicle_states.values() if state.status == "in_transit")
    waiting = sum(1 for state in engine.live_vehicle_states.values() if state.status == "waiting")

    assert active == 3333
    assert waiting == 6667


def test_decision_breakdown_includes_baseline_stockout_signals() -> None:
    engine = DecisionEngine()
    origin = make_facility(1, "Delhi Hub", "Delhi", "warehouse", 10000, 4200)
    destination = make_facility(2, "Chennai Health Warehouse", "Chennai", "warehouse", 10000, 9300)
    fallback = make_facility(3, "Bengaluru Relief Warehouse", "Bengaluru", "warehouse", 12000, 3800)
    objective = Objective(
        id=1,
        name="Emergency Medicines",
        commodity="Emergency Medicines",
        origin_facility_id=1,
        destination_facility_id=2,
        dispatch_interval_minutes=120,
        loading_duration_minutes=30,
        unloading_duration_minutes=35,
        sla_minutes=1100,
        priority=3,
        assigned_vehicle_ids=[1],
        fallback_facility_ids=[3],
        active=True,
    )
    vehicle = Vehicle(
        id=1,
        identifier="MED-001",
        payload_capacity_units=1000,
        home_facility_id=1,
        current_facility_id=1,
        driver_profile_id=1,
        default_objective_id=1,
        average_speed_kmph=48,
        emission_kg_per_km=1.5,
        rest_every_hours=8,
        rest_duration_minutes=45,
        status="idle",
    )

    decision = engine.score_dispatch_options(
        sim_time=datetime(2026, 1, 1, 9, 0),
        vehicle=vehicle,
        objective=objective,
        current_facility=origin,
        facilities={1: origin, 2: destination, 3: fallback},
        port_links=[],
        inbound_reserved={2: 600},
        route_data={
            2: make_route("1:2", 1, 2, 1900, 2200),
            3: make_route("1:3", 1, 3, 1700, 1850),
        },
        risk_lookup={
            2: {"route_risk": 0.68, "eta_multiplier": 1.15},
            3: {"route_risk": 0.22, "eta_multiplier": 1.04},
        },
    )

    assert "baseline_overload_risk" in decision.breakdown
    assert "baseline_event_severity" in decision.breakdown


def test_critical_and_perishable_detection_for_relief_objectives() -> None:
    engine = SimulationEngine(RoutePlanner())
    objective = Objective(
        id=1,
        name="Emergency Medicines Delhi to Flood Relief",
        commodity="Emergency Medicines",
        origin_facility_id=1,
        destination_facility_id=2,
        dispatch_interval_minutes=120,
        loading_duration_minutes=30,
        unloading_duration_minutes=35,
        sla_minutes=1100,
        priority=3,
        assigned_vehicle_ids=[1],
        fallback_facility_ids=[3],
        active=True,
    )

    assert engine._is_critical_objective(objective) is True
    assert engine._is_perishable_objective(objective) is True
