"""Narrow protocols for engine callbacks (avoid importing concrete strategy types)."""

from __future__ import annotations

from typing import Protocol

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderRecord, PositionUpdate, TickEvent


class ReplayHooks(Protocol):
    """Hooks invoked during tick replay (fills + market data)."""

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None: ...

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None: ...

    def on_order_rejected(self, order: OrderRecord, ctx: RunContext) -> None: ...

    def on_position_update(self, update: PositionUpdate, ctx: RunContext) -> None: ...


class ExecutionEventSink(Protocol):
    """Subset used by liquidation and fill application."""

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None: ...

    def on_position_update(self, update: PositionUpdate, ctx: RunContext) -> None: ...


class SessionLifecycleHooks(Protocol):
    """Session boundary hooks."""

    def on_start(self, ctx: RunContext) -> None: ...

    def on_finish(self, ctx: RunContext) -> None: ...
