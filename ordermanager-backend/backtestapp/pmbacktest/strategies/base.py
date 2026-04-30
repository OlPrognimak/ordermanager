"""Abstract strategy interface (MT4/MT5-style tester hooks)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderRecord, PositionUpdate, TickEvent


class Strategy(ABC):
    """Pluggable strategy; engine calls hooks in deterministic order."""

    @property
    def name(self) -> str:
        return self.__class__.__name__

    def on_start(self, ctx: RunContext) -> None:
        """Called once before the first tick."""

    @abstractmethod
    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        """Main signal handler on each event."""

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        """Optional: react to executions."""

    def on_order_rejected(self, order: OrderRecord, ctx: RunContext) -> None:
        """OPEN/CLOSE rejected at execution (e.g. guard, no fill, cash); default no-op."""
        _ = order, ctx

    def on_position_update(self, update: PositionUpdate, ctx: RunContext) -> None:
        """Optional: book change after a fill."""

    def on_finish(self, ctx: RunContext) -> None:
        """Called after the last tick (and optional liquidation)."""
