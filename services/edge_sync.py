"""
Edge Computing / Offline-First Sync Support.
Provides data structures and sync protocol for driver devices operating
in low-connectivity rural areas.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import hashlib
import json


@dataclass(slots=True)
class EdgeOperation:
    op_id: str
    op_type: str  # decision, incident, location_ping, delivery_confirm
    driver_profile_id: int
    vehicle_id: int | None
    payload: dict[str, Any]
    created_at: str
    checksum: str = ""
    synced: bool = False
    retry_count: int = 0

    def __post_init__(self) -> None:
        if not self.checksum:
            self.checksum = self._compute_checksum()

    def _compute_checksum(self) -> str:
        data = f"{self.op_id}:{self.op_type}:{self.driver_profile_id}:{json.dumps(self.payload, sort_keys=True)}:{self.created_at}"
        return hashlib.sha256(data.encode("utf-8")).hexdigest()[:16]

    def verify(self) -> bool:
        return self.checksum == self._compute_checksum()


@dataclass
class EdgeSyncState:
    driver_profile_id: int
    pending_operations: list[EdgeOperation] = field(default_factory=list)
    last_sync_at: str | None = None
    offline_since: str | None = None
    cached_routes: list[dict[str, Any]] = field(default_factory=list)
    cached_recommendations: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "driver_profile_id": self.driver_profile_id,
            "pending_operations": [
                {
                    "op_id": op.op_id,
                    "op_type": op.op_type,
                    "vehicle_id": op.vehicle_id,
                    "payload": op.payload,
                    "created_at": op.created_at,
                    "checksum": op.checksum,
                    "synced": op.synced,
                    "retry_count": op.retry_count,
                }
                for op in self.pending_operations
            ],
            "last_sync_at": self.last_sync_at,
            "offline_since": self.offline_since,
            "cached_routes": self.cached_routes,
            "cached_recommendations": self.cached_recommendations,
            "pending_count": len([op for op in self.pending_operations if not op.synced]),
        }


class EdgeSyncManager:
    """
    Manages offline-first sync queue for driver devices.
    Operations are queued locally and replayed when connectivity returns.
    """

    def __init__(self) -> None:
        # In-memory store; in production use Redis/embedded SQLite on edge device
        self._states: dict[int, EdgeSyncState] = {}

    def get_or_create_state(self, driver_profile_id: int) -> EdgeSyncState:
        if driver_profile_id not in self._states:
            self._states[driver_profile_id] = EdgeSyncState(driver_profile_id=driver_profile_id)
        return self._states[driver_profile_id]

    def queue_operation(
        self,
        driver_profile_id: int,
        op_type: str,
        payload: dict[str, Any],
        vehicle_id: int | None = None,
    ) -> EdgeOperation:
        state = self.get_or_create_state(driver_profile_id)
        op = EdgeOperation(
            op_id=f"{driver_profile_id}:{op_type}:{datetime.utcnow().timestamp()}",
            op_type=op_type,
            driver_profile_id=driver_profile_id,
            vehicle_id=vehicle_id,
            payload=payload,
            created_at=datetime.utcnow().isoformat(),
        )
        state.pending_operations.append(op)
        if state.offline_since is None:
            state.offline_since = datetime.utcnow().isoformat()
        return op

    def sync_operations(self, driver_profile_id: int) -> dict[str, Any]:
        state = self.get_or_create_state(driver_profile_id)
        synced = []
        failed = []
        for op in state.pending_operations:
            if op.synced:
                continue
            if not op.verify():
                failed.append({"op_id": op.op_id, "reason": "checksum_mismatch"})
                continue
            # Simulate sync success
            op.synced = True
            synced.append(op.op_id)

        state.last_sync_at = datetime.utcnow().isoformat()
        if all(op.synced for op in state.pending_operations):
            state.offline_since = None

        return {
            "driver_profile_id": driver_profile_id,
            "synced_count": len(synced),
            "failed_count": len(failed),
            "synced_ids": synced,
            "failed": failed,
            "pending_remaining": len([op for op in state.pending_operations if not op.synced]),
        }

    def get_sync_status(self, driver_profile_id: int) -> dict[str, Any]:
        state = self.get_or_create_state(driver_profile_id)
        return state.to_dict()

    def cache_routes(self, driver_profile_id: int, routes: list[dict[str, Any]]) -> None:
        state = self.get_or_create_state(driver_profile_id)
        state.cached_routes = routes[:20]  # limit cache size

    def cache_recommendations(self, driver_profile_id: int, recommendations: list[dict[str, Any]]) -> None:
        state = self.get_or_create_state(driver_profile_id)
        state.cached_recommendations = recommendations[:10]

    def clear_cache(self, driver_profile_id: int) -> None:
        if driver_profile_id in self._states:
            self._states[driver_profile_id].cached_routes = []
            self._states[driver_profile_id].cached_recommendations = []


# Singleton
_edge_sync_manager: EdgeSyncManager | None = None


def get_edge_sync_manager() -> EdgeSyncManager:
    global _edge_sync_manager
    if _edge_sync_manager is None:
        _edge_sync_manager = EdgeSyncManager()
    return _edge_sync_manager
