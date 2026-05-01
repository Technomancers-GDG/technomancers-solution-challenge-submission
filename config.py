from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str
    database_url: str
    osrm_base_url: str
    simulation_start_date: date
    simulation_speed: float
    news_dataset_path: Path
    weather_dataset_path: Path
    allow_demo_seed: bool
    demo_mode: bool
    route_use_osrm: bool
    news_model_artifact_path: Path
    demo_disruption_delay_seconds: int
    demo_disruption_city: str
    demo_disruption_severity: float
    # RL & Optimization
    rl_model_path: str
    use_rl_engine: bool
    use_nsga2_optimizer: bool
    # Blockchain
    blockchain_ledger_path: str
    # Google Cloud
    gcp_project_id: str
    gcp_region: str
    firebase_enabled: bool
    pubsub_enabled: bool
    vertex_ai_enabled: bool
    bigquery_enabled: bool
    bigquery_dataset: str
    fcm_enabled: bool
    cost_point_to_inr: float
    # Gemini
    gemini_api_key: str


def _get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _get_bool_env(name: str, default: str) -> bool:
    return _get_env(name, default).lower() in {"1", "true", "yes"}


def load_settings() -> Settings:
    return Settings(
        app_name=_get_env("APP_NAME", "Resilient Essential Goods Coordinator"),
        database_url=_get_env("DATABASE_URL", "sqlite:///./supply_chain.db"),
        osrm_base_url=_get_env("OSRM_BASE_URL", "https://router.project-osrm.org"),
        simulation_start_date=date.fromisoformat(
            _get_env("SIMULATION_START_DATE", "2026-01-01")
        ),
        simulation_speed=float(_get_env("SIMULATION_SPEED", "120.0")),
        news_dataset_path=Path(_get_env("NEWS_DATASET_PATH", "All_Cities_News_v2.xlsx")),
        weather_dataset_path=Path(
            _get_env("WEATHER_DATASET_PATH", "Historical_Weather_Data_2024_2026.xlsx")
        ),
        allow_demo_seed=_get_bool_env("ALLOW_DEMO_SEED", "true"),
        demo_mode=_get_bool_env("DEMO_MODE", "true"),
        route_use_osrm=_get_bool_env("ROUTE_USE_OSRM", "false"),
        news_model_artifact_path=Path(_get_env("NEWS_MODEL_ARTIFACT_PATH", "news_model.pkl")),
        demo_disruption_delay_seconds=int(_get_env("DEMO_DISRUPTION_DELAY_SECONDS", "12")),
        demo_disruption_city=_get_env("DEMO_DISRUPTION_CITY", "Chennai"),
        demo_disruption_severity=float(_get_env("DEMO_DISRUPTION_SEVERITY", "0.82")),
        # RL & Optimization
        rl_model_path=_get_env("RL_MODEL_PATH", "data/rl_model.json"),
        use_rl_engine=_get_bool_env("USE_RL_ENGINE", "true"),
        use_nsga2_optimizer=_get_bool_env("USE_NSGA2_OPTIMIZER", "true"),
        # Blockchain
        blockchain_ledger_path=_get_env("BLOCKCHAIN_LEDGER_PATH", "data/blockchain_ledger.json"),
        # Google Cloud
        gcp_project_id=_get_env("GCP_PROJECT_ID", ""),
        gcp_region=_get_env("GCP_REGION", "asia-south1"),
        firebase_enabled=_get_bool_env("FIREBASE_ENABLED", "false"),
        pubsub_enabled=_get_bool_env("PUBSUB_ENABLED", "false"),
        vertex_ai_enabled=_get_bool_env("VERTEX_AI_ENABLED", "false"),
        bigquery_enabled=_get_bool_env("BIGQUERY_ENABLED", "false"),
        bigquery_dataset=_get_env("BIGQUERY_DATASET", "supply_chain"),
        fcm_enabled=_get_bool_env("FCM_ENABLED", "false"),
        # Financial calibration: 1 cost point = ₹15 INR (based on ~₹45/km Indian truck ops)
        cost_point_to_inr=float(_get_env("COST_POINT_TO_INR", "15.0")),
        # Gemini
        gemini_api_key=_get_env("GEMINI_API_KEY", "YOUR_API_KEY_HERE"),
    )


settings = load_settings()

# Explicit demo flag for fast, deterministic startup
DEMO_MODE = settings.demo_mode
