"""
Reinforcement Learning Decision Engine for Supply Chain Optimization.
Implements a DQN-style agent using PyTorch that learns optimal
reroute policies from simulation outcomes.
"""
from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from config import settings


@dataclass(slots=True)
class StateVector:
    """Compact state representation for the RL agent."""

    utilization_norm: float  # 0-1 normalized facility utilization
    route_risk: float  # 0-1 closure risk
    eta_multiplier: float  # 1.0+ delay factor
    sla_urgency: float  # 0-1 how close to SLA breach
    payload_norm: float  # 0-1 normalized payload vs capacity
    priority_norm: float  # 0-1 normalized priority
    port_pressure: float  # 0-1 port spillover pressure
    weather_severity: float  # 0-1 weather impact
    news_severity: float  # 0-1 news impact
    time_of_day: float  # 0-1 hour normalized

    def to_array(self) -> np.ndarray:
        return np.array(
            [
                self.utilization_norm,
                self.route_risk,
                self.eta_multiplier - 1.0,
                self.sla_urgency,
                self.payload_norm,
                self.priority_norm,
                self.port_pressure,
                self.weather_severity,
                self.news_severity,
                self.time_of_day,
            ],
            dtype=np.float32,
        )

    @classmethod
    def from_sim_context(
        cls,
        *,
        facility_utilization: float,
        route_risk: float,
        eta_multiplier: float,
        sla_remaining_minutes: float,
        sla_total_minutes: float,
        payload_capacity: int,
        facility_capacity: int,
        priority: int,
        port_pressure: float,
        weather_severity: float,
        news_severity: float,
        simulation_hour: int,
    ) -> "StateVector":
        return cls(
            utilization_norm=min(1.0, max(0.0, facility_utilization)),
            route_risk=min(1.0, max(0.0, route_risk)),
            eta_multiplier=max(1.0, eta_multiplier),
            sla_urgency=min(
                1.0, max(0.0, 1.0 - (sla_remaining_minutes / max(sla_total_minutes, 1)))
            ),
            payload_norm=min(1.0, max(0.0, payload_capacity / max(facility_capacity, 1))),
            priority_norm=min(1.0, priority / 5.0),
            port_pressure=min(1.0, max(0.0, port_pressure)),
            weather_severity=min(1.0, max(0.0, weather_severity)),
            news_severity=min(1.0, max(0.0, news_severity)),
            time_of_day=simulation_hour / 24.0,
        )


class ReplayBuffer:
    def __init__(self, capacity: int = 5000) -> None:
        self.capacity = capacity
        self.buffer: list[tuple[np.ndarray, int, float, np.ndarray, bool]] = []
        self.position = 0

    def push(self, state: np.ndarray, action: int, reward: float, next_state: np.ndarray, done: bool) -> None:
        if len(self.buffer) < self.capacity:
            self.buffer.append((state, action, reward, next_state, done))
        else:
            self.buffer[self.position] = (state, action, reward, next_state, done)
        self.position = (self.position + 1) % self.capacity

    def sample(self, batch_size: int, device: torch.device) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor] | None:
        if len(self.buffer) < batch_size:
            return None
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            torch.tensor(np.stack(states), dtype=torch.float32, device=device),
            torch.tensor(actions, dtype=torch.long, device=device),
            torch.tensor(rewards, dtype=torch.float32, device=device),
            torch.tensor(np.stack(next_states), dtype=torch.float32, device=device),
            torch.tensor(dones, dtype=torch.float32, device=device),
        )

    def __len__(self) -> int:
        return len(self.buffer)


class QNetwork(nn.Module):
    def __init__(self, input_dim: int = 10, hidden_dim: int = 64, output_dim: int = 5) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class RLDecisionEngine:
    """
    DQN-based decision engine that learns optimal dispatch decisions using PyTorch.
    Actions: 0=continue, 1=reroute_warehouse, 2=reroute_port, 3=wait, 4=defer
    """

    ACTIONS = ["continue", "reroute_warehouse", "reroute_port", "wait", "defer_dispatch"]

    def __init__(self, model_path: Path | None = None) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.q_network = QNetwork(input_dim=10, hidden_dim=64, output_dim=5).to(self.device)
        self.target_network = QNetwork(input_dim=10, hidden_dim=64, output_dim=5).to(self.device)
        self.target_network.load_state_dict(self.q_network.state_dict())
        self.optimizer = optim.Adam(self.q_network.parameters(), lr=0.001)
        self.loss_fn = nn.MSELoss()
        
        self.replay_buffer = ReplayBuffer(capacity=8000)
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.05
        self.epsilon_decay = 0.995
        self.batch_size = 32
        self.target_update_freq = 200
        self.train_step = 0
        
        # Keep original extension but we load as torch now
        self.model_path = model_path or Path(settings.rl_model_path)
        self._load_weights()

    def _load_weights(self) -> None:
        if self.model_path.exists():
            try:
                checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=True)
                self.q_network.load_state_dict(checkpoint["q_network_state_dict"])
                self.target_network.load_state_dict(checkpoint["target_network_state_dict"])
                self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
                self.epsilon = max(self.epsilon_min, checkpoint.get("epsilon", 1.0))
                self.train_step = checkpoint.get("train_step", 0)
                print(f"[RL] Loaded PyTorch weights from {self.model_path}")
            except Exception as exc:
                print(f"[RL] Could not load PyTorch weights: {exc}. Starting fresh.")

    def save_weights(self) -> None:
        checkpoint = {
            "q_network_state_dict": self.q_network.state_dict(),
            "target_network_state_dict": self.target_network.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "epsilon": float(self.epsilon),
            "train_step": self.train_step,
        }
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(checkpoint, self.model_path)

    def select_action(self, state: StateVector, valid_actions: list[str] | None = None) -> tuple[str, float]:
        state_tensor = torch.tensor(state.to_array(), dtype=torch.float32, device=self.device).unsqueeze(0)
        valid = valid_actions or self.ACTIONS
        valid_indices = [self.ACTIONS.index(a) for a in valid if a in self.ACTIONS]
        if not valid_indices:
            valid_indices = [0]

        if random.random() < self.epsilon:
            action_idx = random.choice(valid_indices)
            with torch.no_grad():
                q_value = self.q_network(state_tensor)[0, action_idx].item()
        else:
            with torch.no_grad():
                q_values = self.q_network(state_tensor)[0]
                masked = torch.full_like(q_values, -1e9)
                masked[valid_indices] = q_values[valid_indices]
                action_idx = int(torch.argmax(masked).item())
                q_value = q_values[action_idx].item()

        return self.ACTIONS[action_idx], float(q_value)

    def compute_reward(
        self,
        *,
        sla_met: bool,
        overflow_avoided: bool,
        co2_delta: float,
        idle_minutes: float,
        stockout_prevented: bool,
        reroute_successful: bool,
    ) -> float:
        reward = 0.0
        if sla_met:
            reward += 10.0
        else:
            reward -= 8.0
        if overflow_avoided:
            reward += 5.0
        if stockout_prevented:
            reward += 15.0
        if reroute_successful:
            reward += 3.0
        reward -= co2_delta * 0.5
        reward -= idle_minutes * 0.1
        return reward

    def train_step_update(self) -> dict[str, float] | None:
        batch = self.replay_buffer.sample(self.batch_size, self.device)
        if batch is None:
            return None
        states, actions, rewards, next_states, dones = batch

        # Forward pass
        q_values = self.q_network(states)
        q_pred = q_values.gather(1, actions.unsqueeze(1)).squeeze(1)

        # Target Q-values
        with torch.no_grad():
            q_next = self.target_network(next_states)
            max_q_next = q_next.max(1)[0]
            targets = rewards + self.gamma * max_q_next * (1.0 - dones)

        loss = self.loss_fn(q_pred, targets)

        # Backprop through network
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        self.train_step += 1
        if self.train_step % self.target_update_freq == 0:
            self.target_network.load_state_dict(self.q_network.state_dict())

        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        return {"loss": loss.item(), "epsilon": self.epsilon, "train_step": self.train_step}

    def store_transition(self, state: StateVector, action: str, reward: float, next_state: StateVector, done: bool) -> None:
        self.replay_buffer.push(
            state.to_array(),
            self.ACTIONS.index(action),
            reward,
            next_state.to_array(),
            done,
        )

    def get_action_confidence(self, state: StateVector) -> dict[str, float]:
        state_tensor = torch.tensor(state.to_array(), dtype=torch.float32, device=self.device).unsqueeze(0)
        with torch.no_grad():
            q_values = self.q_network(state_tensor)[0]
            exp_q = torch.exp(q_values - torch.max(q_values))
            probs = exp_q / torch.sum(exp_q)
        return {action: float(probs[i].item()) for i, action in enumerate(self.ACTIONS)}


# Singleton instance
rl_engine_instance: RLDecisionEngine | None = None


def get_rl_engine() -> RLDecisionEngine:
    global rl_engine_instance
    if rl_engine_instance is None:
        rl_engine_instance = RLDecisionEngine()
    return rl_engine_instance
