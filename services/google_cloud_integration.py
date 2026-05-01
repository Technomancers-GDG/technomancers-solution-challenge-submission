"""
Google Cloud / Firebase Integration Stubs.
Provides hooks for Firebase Realtime Database, Cloud Pub/Sub, Vertex AI,
BigQuery, and Cloud Messaging. Actual credentials required for production.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from config import settings


@dataclass(slots=True)
class CloudEvent:
    topic: str
    payload: dict[str, Any]
    published_at: str


class FirebaseRealtimeDB:
    """Stub for Firebase Realtime Database sync."""

    def __init__(self) -> None:
        self.enabled = settings.firebase_enabled
        self.project_id = settings.gcp_project_id
        self._buffer: list[dict[str, Any]] = []

    def push_driver_state(self, driver_id: int, state: dict[str, Any]) -> dict[str, Any]:
        record = {
            "driver_id": driver_id,
            "state": state,
            "timestamp": datetime.utcnow().isoformat(),
            "synced": False,
        }
        if self.enabled:
            # In production: firebase_admin.db.reference(f'drivers/{driver_id}').set(state)
            record["synced"] = True
            return {"status": "synced", "driver_id": driver_id}
        self._buffer.append(record)
        return {"status": "buffered", "driver_id": driver_id, "buffer_size": len(self._buffer)}

    def get_driver_state(self, driver_id: int) -> dict[str, Any] | None:
        # In production: firebase_admin.db.reference(f'drivers/{driver_id}').get()
        return {"driver_id": driver_id, "status": "stub", "note": "Enable FIREBASE_ENABLED for real sync"}


class CloudPubSub:
    """Stub for Google Cloud Pub/Sub event streaming."""

    def __init__(self) -> None:
        self.enabled = settings.pubsub_enabled
        self.project_id = settings.gcp_project_id
        self._local_queue: list[CloudEvent] = []

    def publish(self, topic: str, payload: dict[str, Any]) -> dict[str, Any]:
        event = CloudEvent(topic=topic, payload=payload, published_at=datetime.utcnow().isoformat())
        if self.enabled:
            # In production: publisher.publish(topic_path, data=json.dumps(payload).encode())
            return {"status": "published", "topic": topic, "message_id": f"msg-{datetime.utcnow().timestamp()}"}
        self._local_queue.append(event)
        return {"status": "queued", "topic": topic, "queue_depth": len(self._local_queue)}

    def subscribe(self, topic: str, callback: Any) -> dict[str, Any]:
        if self.enabled:
            return {"status": "subscribed", "topic": topic}
        return {"status": "stub", "topic": topic, "note": "Enable PUBSUB_ENABLED for real streaming"}


class VertexAIClient:
    """Stub for Google Vertex AI model hosting."""

    def __init__(self) -> None:
        self.enabled = settings.vertex_ai_enabled
        self.project_id = settings.gcp_project_id
        self.region = settings.gcp_region

    def predict(self, endpoint_id: str, instances: list[dict[str, Any]]) -> dict[str, Any]:
        if self.enabled:
            # In production: aiplatform.Endpoint(endpoint_id).predict(instances)
            return {"status": "predicted", "endpoint": endpoint_id, "predictions": instances}
        return {
            "status": "stub",
            "endpoint": endpoint_id,
            "note": "Enable VERTEX_AI_ENABLED and configure GCP_PROJECT_ID",
            "predictions": [{"score": 0.5, "action": "continue"} for _ in instances],
        }

    def deploy_model(self, model_name: str, artifact_path: str) -> dict[str, Any]:
        return {
            "status": "stub_deploy",
            "model": model_name,
            "path": artifact_path,
            "note": "Requires gcloud auth and Vertex AI API enabled",
        }


class BigQueryClient:
    """Stub for Google BigQuery analytics."""

    def __init__(self) -> None:
        self.enabled = settings.bigquery_enabled
        self.project_id = settings.gcp_project_id
        self.dataset = settings.bigquery_dataset

    def query_metrics(self, query: str) -> dict[str, Any]:
        if self.enabled:
            # In production: bigquery.Client().query(query).result()
            return {"status": "queried", "rows": [], "query": query}
        return {"status": "stub", "query": query, "note": "Enable BIGQUERY_ENABLED for analytics"}

    def stream_metrics(self, table: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
        if self.enabled:
            return {"status": "streamed", "table": table, "row_count": len(rows)}
        return {"status": "stub", "table": table, "note": "Enable BIGQUERY_ENABLED for streaming"}


class CloudMessaging:
    """Stub for Firebase Cloud Messaging (push notifications)."""

    def __init__(self) -> None:
        self.enabled = settings.fcm_enabled

    def send_to_driver(self, driver_id: int, title: str, body: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        if self.enabled:
            # In production: messaging.send(Message(..., token=driver_fcm_token))
            return {"status": "sent", "driver_id": driver_id, "message_id": f"fcm-{driver_id}-{datetime.utcnow().timestamp()}"}
        return {
            "status": "stub",
            "driver_id": driver_id,
            "title": title,
            "body": body,
            "note": "Enable FCM_ENABLED and configure Firebase credentials",
        }

    def send_to_topic(self, topic: str, title: str, body: str) -> dict[str, Any]:
        if self.enabled:
            return {"status": "sent", "topic": topic}
        return {"status": "stub", "topic": topic, "note": "Enable FCM_ENABLED for push notifications"}


class GoogleCloudIntegration:
    """Unified facade for all Google Cloud integrations."""

    def __init__(self) -> None:
        self.firebase_db = FirebaseRealtimeDB()
        self.pubsub = CloudPubSub()
        self.vertex_ai = VertexAIClient()
        self.bigquery = BigQueryClient()
        self.fcm = CloudMessaging()

    def health_check(self) -> dict[str, Any]:
        return {
            "firebase_rtdb": {"enabled": self.firebase_db.enabled, "project": self.firebase_db.project_id},
            "pubsub": {"enabled": self.pubsub.enabled, "project": self.pubsub.project_id},
            "vertex_ai": {"enabled": self.vertex_ai.enabled, "region": self.vertex_ai.region},
            "bigquery": {"enabled": self.bigquery.enabled, "dataset": self.bigquery.dataset},
            "fcm": {"enabled": self.fcm.enabled},
            "overall": "healthy" if any([
                self.firebase_db.enabled,
                self.pubsub.enabled,
                self.vertex_ai.enabled,
                self.bigquery.enabled,
                self.fcm.enabled,
            ]) else "stub_mode",
        }


# Singleton
_gcp_integration: GoogleCloudIntegration | None = None


def get_gcp_integration() -> GoogleCloudIntegration:
    global _gcp_integration
    if _gcp_integration is None:
        _gcp_integration = GoogleCloudIntegration()
    return _gcp_integration
