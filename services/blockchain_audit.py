"""
Blockchain-Backed Audit Trail for Supply Chain Transparency.
Implements a simple hash-chain ledger that records all critical decisions
with SHA-256 linking, making tampering detectable.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from config import settings


@dataclass(slots=True)
class AuditBlock:
    index: int
    timestamp: str
    decision_type: str
    entity_id: int
    action: str
    explanation: str
    previous_hash: str
    metadata: dict[str, Any]
    nonce: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "decision_type": self.decision_type,
            "entity_id": self.entity_id,
            "action": self.action,
            "explanation": self.explanation,
            "previous_hash": self.previous_hash,
            "metadata": self.metadata,
            "nonce": self.nonce,
        }

    def compute_hash(self) -> str:
        block_string = json.dumps(self.to_dict(), sort_keys=True)
        return hashlib.sha256(block_string.encode("utf-8")).hexdigest()


class BlockchainLedger:
    """
    Lightweight immutable ledger for supply chain audit trail.
    Each block contains a decision (AI reroute, driver override, etc.)
    and is linked to the previous block via SHA-256 hash.
    """

    def __init__(self, chain_path: Path | None = None) -> None:
        self.chain_path = chain_path or Path(settings.blockchain_ledger_path)
        self.chain: list[AuditBlock] = []
        self._load_chain()
        if not self.chain:
            self._create_genesis_block()

    def _create_genesis_block(self) -> None:
        genesis = AuditBlock(
            index=0,
            timestamp=datetime.utcnow().isoformat(),
            decision_type="genesis",
            entity_id=0,
            action="chain_initialized",
            explanation="Genesis block for supply chain audit trail.",
            previous_hash="0" * 64,
            metadata={"version": "1.0", "system": "Resilient Essential Goods Coordinator"},
        )
        self.chain.append(genesis)
        self._persist()

    def _load_chain(self) -> None:
        if not self.chain_path.exists():
            return
        try:
            with self.chain_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            for block_data in data.get("chain", []):
                self.chain.append(AuditBlock(**block_data))
            if self.chain and not self._validate_chain():
                print("[BLOCKCHAIN] Chain validation failed. Starting fresh.")
                self.chain = []
        except Exception as exc:
            print(f"[BLOCKCHAIN] Load failed: {exc}. Starting fresh.")
            self.chain = []

    def _persist(self) -> None:
        self.chain_path.parent.mkdir(parents=True, exist_ok=True)
        with self.chain_path.open("w", encoding="utf-8") as f:
            json.dump(
                {"chain": [block.to_dict() for block in self.chain]},
                f,
                indent=2,
            )

    def _validate_chain(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.previous_hash != previous.compute_hash():
                return False
            if current.index != previous.index + 1:
                return False
        return True

    def add_block(
        self,
        decision_type: str,
        entity_id: int,
        action: str,
        explanation: str,
        metadata: dict[str, Any] | None = None,
    ) -> AuditBlock:
        previous = self.chain[-1]
        block = AuditBlock(
            index=len(self.chain),
            timestamp=datetime.utcnow().isoformat(),
            decision_type=decision_type,
            entity_id=entity_id,
            action=action,
            explanation=explanation,
            previous_hash=previous.compute_hash(),
            metadata=metadata or {},
        )
        self.chain.append(block)
        self._persist()
        return block

    def get_chain(self, limit: int = 100) -> list[dict[str, Any]]:
        return [block.to_dict() for block in self.chain[-limit:]]

    def get_entity_history(self, entity_id: int, decision_type: str | None = None) -> list[dict[str, Any]]:
        results = []
        for block in self.chain:
            if block.entity_id == entity_id:
                if decision_type is None or block.decision_type == decision_type:
                    results.append({**block.to_dict(), "hash": block.compute_hash()})
        return results

    def verify_integrity(self) -> dict[str, Any]:
        valid = self._validate_chain()
        tampered_indices = []
        for i in range(1, len(self.chain)):
            if self.chain[i].previous_hash != self.chain[i - 1].compute_hash():
                tampered_indices.append(i)
        return {
            "valid": valid,
            "block_count": len(self.chain),
            "tampered_indices": tampered_indices,
            "last_block_hash": self.chain[-1].compute_hash() if self.chain else None,
        }


# Singleton
_ledger_instance: BlockchainLedger | None = None


def get_ledger() -> BlockchainLedger:
    global _ledger_instance
    if _ledger_instance is None:
        _ledger_instance = BlockchainLedger()
    return _ledger_instance
