"""Strategy-facing context: isolated from portfolio internals."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol

from pmbacktest.core.types import OrderIntent, PositionView, TickEvent


class BrokerFacade(Protocol):
    """Narrow interface strategies use to interact with execution."""

    def submit_order(self, intent: OrderIntent) -> str:
        """Queue an order; returns order_id or raises ValueError on reject."""
        ...

    def cash(self) -> float:
        ...

    def positions(self) -> list[PositionView]:
        ...

    def last_tick(self) -> TickEvent | None:
        ...


@dataclass(slots=True)
class RunContext:
    """Per-run facade passed into strategy callbacks."""

    run_id: str
    params: Mapping[str, Any]
    seed: int | None
    _broker: BrokerFacade = field(repr=False)
    #: From session risk limits; strategies may clamp OPEN size to ``cap - current_shares(side)``.
    max_position_shares_per_side: float | None = None

    def submit_order(self, intent: OrderIntent) -> str:
        return self._broker.submit_order(intent)

    def cash(self) -> float:
        return self._broker.cash()

    def positions(self) -> list[PositionView]:
        return self._broker.positions()

    def last_tick(self) -> TickEvent | None:
        return self._broker.last_tick()
