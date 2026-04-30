"""UTC 5m round boundaries and strategy order rules."""

from __future__ import annotations

from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.session import BacktestSession, SessionConfig
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent
from pmbacktest.strategies.base import Strategy


def test_utc_five_minute_round_start_ms() -> None:
    ts = 1_743_509_250_500  # 2025-04-01 12:07:30.500Z
    start = utc_five_minute_round_start_ms(ts)
    assert start == 1_743_509_100_000  # 12:05:00Z
    assert utc_five_minute_round_start_ms(start) == start


class _BuyYesOnce(Strategy):
    """Single OPEN_YES on first tick then hold."""

    name = "buy_yes_once"

    def __init__(self) -> None:
        self._done = False

    def on_tick(self, event: TickEvent, ctx) -> None:  # noqa: ANN001
        if self._done:
            return
        ctx.submit_order(OrderIntent(OrderAction.OPEN_YES, 1.0))
        self._done = True

    def on_order_fill(self, fill, ctx) -> None:  # noqa: ANN001
        _ = fill, ctx

    def on_position_update(self, update, ctx) -> None:  # noqa: ANN001
        _ = update, ctx


def test_round_boundary_settles_inventory() -> None:
    """Crossing UTC 5m boundary flattens at the previous round's last quote."""
    execution = execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0})
    risk = risk_from_mapping({})
    ticks = [
        TickEvent(1_743_509_040_000, 50_000.0, 60.0, 40.0),
        TickEvent(1_743_509_160_000, 50_100.0, 100.0, 0.0),
    ]
    cfg = SessionConfig(
        initial_cash=10_000.0,
        risk=risk,
        strategy_name="buy_yes_once",
        strategy_params={},
        settle_round_boundaries=True,
    )
    eng = BacktestSession(execution=execution)
    res = eng.run(tick_stream=iter(ticks), strategy=_BuyYesOnce(), config=cfg)
    assert res.meta.tick_count == 2
    assert len(res.closed_trades) >= 1
    assert res.performance.final_equity == res.equity_curve[-1].equity


class _OpenThenClose(Strategy):
    name = "open_then_close"

    def __init__(self) -> None:
        self._i = 0

    def on_tick(self, event: TickEvent, ctx) -> None:  # noqa: ANN001
        self._i += 1
        if self._i == 1:
            ctx.submit_order(OrderIntent(OrderAction.OPEN_YES, 1.0))
        elif self._i == 2:
            ctx.submit_order(OrderIntent(OrderAction.CLOSE_YES, 1.0))

    def on_order_fill(self, fill, ctx) -> None:  # noqa: ANN001
        _ = fill, ctx

    def on_position_update(self, update, ctx) -> None:  # noqa: ANN001
        _ = update, ctx


def test_strategy_close_orders_fill() -> None:
    """Strategies may submit CLOSE_*; fill runs on a later tick (after submit latency / pop_due)."""
    execution = execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0})
    risk = risk_from_mapping({})
    ticks = [
        TickEvent(1_743_509_040_000, 50_000.0, 50.0, 50.0),
        TickEvent(1_743_509_040_100, 50_000.0, 50.0, 50.0),
        TickEvent(1_743_509_040_200, 50_000.0, 50.0, 50.0),
    ]
    cfg = SessionConfig(
        initial_cash=10_000.0,
        risk=risk,
        settle_round_boundaries=False,
    )
    eng = BacktestSession(execution=execution)
    res = eng.run(tick_stream=iter(ticks), strategy=_OpenThenClose(), config=cfg)
    assert len(res.closed_trades) == 1
    assert abs(res.equity_curve[-1].unrealized_pnl) < 1e-6
