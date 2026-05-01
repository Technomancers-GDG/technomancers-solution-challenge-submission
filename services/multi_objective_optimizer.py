"""
Multi-Objective Optimization using NSGA-II (Non-dominated Sorting Genetic Algorithm).
Optimizes dispatch decisions across conflicting objectives: time, CO2, cost, balance, SLA.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Callable

import numpy as np


@dataclass(slots=True)
class DecisionGene:
    """A gene representing a dispatch decision for one vehicle-objective pair."""

    action: str  # continue, reroute_warehouse, reroute_port, wait, defer
    destination_id: int | None
    priority_weight: float = 1.0


@dataclass
class Individual:
    genome: list[DecisionGene]
    objectives: np.ndarray = field(default_factory=lambda: np.zeros(5))
    rank: int = 0
    crowding_distance: float = 0.0
    domination_count: int = 0
    dominated_solutions: set[int] = field(default_factory=set)


class NSGA2Optimizer:
    """
    NSGA-II optimizer for supply chain dispatch decisions.
    Optimizes 5 objectives simultaneously:
    1. Total delivery time (minimize)
    2. Total CO2 emissions (minimize)
    3. Warehouse balance / overload penalty (minimize)
    4. SLA compliance rate (maximize -> negate for minimization)
    5. Total operational cost (minimize)
    """

    ACTIONS = ["continue", "reroute_warehouse", "reroute_port", "wait", "defer_dispatch"]

    def __init__(
        self,
        population_size: int = 60,
        generations: int = 40,
        crossover_prob: float = 0.9,
        mutation_prob: float = 0.15,
    ) -> None:
        self.population_size = population_size
        self.generations = generations
        self.crossover_prob = crossover_prob
        self.mutation_prob = mutation_prob
        self.num_objectives = 5

    def _evaluate_individual(
        self,
        individual: Individual,
        eval_fn: Callable[[list[DecisionGene]], list[float]],
    ) -> None:
        # eval_fn returns [time, co2, overload, -sla_rate, cost]
        individual.objectives = np.array(eval_fn(individual.genome), dtype=np.float32)

    def _dominates(self, a: Individual, b: Individual) -> bool:
        return np.all(a.objectives <= b.objectives) and np.any(a.objectives < b.objectives)

    def _non_dominated_sort(self, population: list[Individual]) -> list[list[int]]:
        fronts: list[list[int]] = [[]]
        for i, p in enumerate(population):
            p.domination_count = 0
            p.dominated_solutions = set()
            for j, q in enumerate(population):
                if i == j:
                    continue
                if self._dominates(p, q):
                    p.dominated_solutions.add(j)
                elif self._dominates(q, p):
                    p.domination_count += 1
            if p.domination_count == 0:
                p.rank = 0
                fronts[0].append(i)

        i = 0
        while fronts[i]:
            next_front: list[int] = []
            for p_idx in fronts[i]:
                p = population[p_idx]
                for q_idx in p.dominated_solutions:
                    q = population[q_idx]
                    q.domination_count -= 1
                    if q.domination_count == 0:
                        q.rank = i + 1
                        next_front.append(q_idx)
            i += 1
            fronts.append(next_front)
        if not fronts[-1]:
            fronts.pop()
        return fronts

    def _crowding_distance(self, front: list[int], population: list[Individual]) -> None:
        if len(front) <= 2:
            for idx in front:
                population[idx].crowding_distance = float("inf")
            return
        for idx in front:
            population[idx].crowding_distance = 0.0
        for m in range(self.num_objectives):
            front.sort(key=lambda idx: population[idx].objectives[m])
            min_val = population[front[0]].objectives[m]
            max_val = population[front[-1]].objectives[m]
            population[front[0]].crowding_distance = float("inf")
            population[front[-1]].crowding_distance = float("inf")
            if max_val - min_val < 1e-9:
                continue
            for i in range(1, len(front) - 1):
                distance = (
                    population[front[i + 1]].objectives[m]
                    - population[front[i - 1]].objectives[m]
                ) / (max_val - min_val)
                population[front[i]].crowding_distance += distance

    def _tournament_selection(self, population: list[Individual], tournament_size: int = 3) -> Individual:
        contestants = random.sample(population, min(tournament_size, len(population)))
        contestants.sort(key=lambda ind: (ind.rank, -ind.crowding_distance))
        return contestants[0]

    def _crossover(self, parent1: Individual, parent2: Individual) -> tuple[Individual, Individual]:
        if random.random() > self.crossover_prob:
            return (
                Individual(genome=[g for g in parent1.genome]),
                Individual(genome=[g for g in parent2.genome]),
            )
        point = random.randint(1, max(1, len(parent1.genome) - 1))
        child1_genome = parent1.genome[:point] + parent2.genome[point:]
        child2_genome = parent2.genome[:point] + parent1.genome[point:]
        return Individual(genome=child1_genome), Individual(genome=child2_genome)

    def _mutate(self, individual: Individual, available_destinations: list[list[int]]) -> None:
        for i in range(len(individual.genome)):
            if random.random() < self.mutation_prob:
                individual.genome[i] = DecisionGene(
                    action=random.choice(self.ACTIONS),
                    destination_id=random.choice(available_destinations[i]) if available_destinations[i] else None,
                    priority_weight=random.uniform(0.8, 1.2),
                )

    def optimize(
        self,
        genome_length: int,
        available_destinations: list[list[int]],
        eval_fn: Callable[[list[DecisionGene]], list[float]],
    ) -> list[Individual]:
        # Initialize population
        population: list[Individual] = []
        for _ in range(self.population_size):
            genome = [
                DecisionGene(
                    action=random.choice(self.ACTIONS),
                    destination_id=random.choice(dests) if dests else None,
                    priority_weight=random.uniform(0.8, 1.2),
                )
                for dests in available_destinations
            ]
            ind = Individual(genome=genome)
            self._evaluate_individual(ind, eval_fn)
            population.append(ind)

        for generation in range(self.generations):
            fronts = self._non_dominated_sort(population)
            for front in fronts:
                self._crowding_distance(front, population)

            offspring: list[Individual] = []
            while len(offspring) < self.population_size:
                p1 = self._tournament_selection(population)
                p2 = self._tournament_selection(population)
                c1, c2 = self._crossover(p1, p2)
                self._mutate(c1, available_destinations)
                self._mutate(c2, available_destinations)
                self._evaluate_individual(c1, eval_fn)
                self._evaluate_individual(c2, eval_fn)
                offspring.extend([c1, c2])

            combined = population + offspring
            fronts = self._non_dominated_sort(combined)
            for front in fronts:
                self._crowding_distance(front, combined)

            # Select next generation
            next_pop: list[Individual] = []
            for front in fronts:
                if len(next_pop) + len(front) <= self.population_size:
                    next_pop.extend(combined[i] for i in front)
                else:
                    remaining = self.population_size - len(next_pop)
                    front_individuals = sorted(
                        [combined[i] for i in front],
                        key=lambda ind: -ind.crowding_distance,
                    )
                    next_pop.extend(front_individuals[:remaining])
                    break
            population = next_pop

        # Return Pareto front
        fronts = self._non_dominated_sort(population)
        if not fronts:
            return population[:10]
        pareto_front = [population[i] for i in fronts[0]]
        pareto_front.sort(key=lambda ind: ind.objectives[0])
        return pareto_front[:10]

    @staticmethod
    def select_best_compromise(individuals: list[Individual], weights: list[float] | None = None) -> Individual:
        """Select the individual closest to the ideal point using weighted compromise."""
        if not individuals:
            raise ValueError("No individuals to select from")
        w = np.array(weights or [0.25, 0.2, 0.2, 0.2, 0.15], dtype=np.float32)
        objs = np.stack([ind.objectives for ind in individuals])
        ideal = np.min(objs, axis=0)
        nadir = np.max(objs, axis=0)
        denom = nadir - ideal
        denom[denom < 1e-9] = 1.0
        normalized = (objs - ideal) / denom
        scores = np.sum(normalized * w, axis=1)
        best_idx = int(np.argmin(scores))
        return individuals[best_idx]
