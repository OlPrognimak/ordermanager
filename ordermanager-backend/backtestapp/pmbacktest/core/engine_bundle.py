"""Injectable execution bundle: fill simulation + signal latency (order scheduling)."""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.execution.fill_engine import FillEngine, MarketFillEngine
from pmbacktest.execution.models import ExecutionConfig, LatencyModel


@dataclass(frozen=True, slots=True)
class EngineBundle:
    """Groups components the replay loop needs from the execution subsystem."""

    fill_engine: FillEngine
    latency: LatencyModel

    @classmethod
    def from_execution_config(cls, cfg: ExecutionConfig) -> EngineBundle:
        return cls(fill_engine=MarketFillEngine(cfg), latency=cfg.latency)
