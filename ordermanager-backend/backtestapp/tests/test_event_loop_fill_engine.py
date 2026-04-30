"""Engine loop accepts arbitrary FillEngine implementations (test double)."""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.clock import SimulationClock
from pmbacktest.core.event_loop import process_tick
from pmbacktest.core.order_manager import OrderManager
from pmbacktest.core.portfolio_manager import PortfolioManager, RiskLimits
from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import (
    Fill,
    OrderAction,
    OrderIntent,
    OrderRecord,
    OrderStatus,
    TickEvent,
    TokenSide,
)
from pmbacktest.execution.fill_engine import FillEngine
@dataclass
class _NoopHooks:
    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        _ = event, ctx

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        _ = fill, ctx

    def on_order_rejected(self, order: OrderRecord, ctx: RunContext) -> None:
        _ = order, ctx

    def on_position_update(self, update, ctx: RunContext) -> None:  # noqa: ANN001
        _ = update, ctx


class _CountingFillEngine:
    """Returns None (reject) after recording try_fill calls."""

    def __init__(self, inner: FillEngine) -> None:
        self.inner = inner
        self.calls = 0

    def try_fill(self, order: OrderRecord, event: TickEvent):
        self.calls += 1
        if self.calls > 100:
            return None
        return self.inner.try_fill(order, event)


def test_custom_fill_engine_wraps_default() -> None:
    from pmbacktest.core.broker import SimulationBroker
    from pmbacktest.core.engine_bundle import EngineBundle
    from pmbacktest.execution.fill_engine import MarketFillEngine

    ex = execution_from_mapping({"fee_rate": 0.0, "latency_ms": 0})
    inner = MarketFillEngine(ex)
    wrapped = _CountingFillEngine(inner)
    bundle = EngineBundle(fill_engine=wrapped, latency=ex.latency)

    clock = SimulationClock(0)
    orders = OrderManager("run")
    portfolio = PortfolioManager(
        initial_cash=1_000.0,
        positions=PositionManager(),
        risk=risk_from_mapping({}),
        run_id="run",
    )
    broker = SimulationBroker(clock=clock, orders=orders, portfolio=portfolio, latency=bundle.latency)
    ctx = RunContext(run_id="run", params={}, seed=None, _broker=broker)
    ev = TickEvent(1, 100.0, 50.0, 50.0)
    broker.set_event(ev)
    orders.submit(
        OrderIntent(OrderAction.OPEN_YES, 1.0),
        created_ts_ms=1,
        execute_after_ts_ms=1,
    )
    process_tick(
        event=ev,
        clock=clock,
        orders=orders,
        portfolio=portfolio,
        fill_engine=wrapped,
        hooks=_NoopHooks(),
        ctx=ctx,
        forbid_open_first_ms_in_round=0,
    )
    assert wrapped.calls == 1
