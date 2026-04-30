"""
Deterministic tick replay: due orders fill first, then strategy on_tick.

Benchmark note: the hot path is ``process_tick`` + ``PortfolioManager.apply_fill``.
For multi-million tick runs, profile here first; vectorized analytics belong outside the loop.
"""

from __future__ import annotations

from pmbacktest.core.clock import SimulationClock
from pmbacktest.core.hooks import ReplayHooks
from pmbacktest.core.order_manager import OrderManager
from pmbacktest.core.portfolio_manager import InsufficientCashForFillError, PortfolioManager
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import EquityPoint, OrderAction, TickEvent
from pmbacktest.execution.fill_engine import FillEngine

MARKET_WINDOW_MS = 5 * 60 * 1000


def _extra_num(event: TickEvent, key: str) -> float | None:
    d = event.data if isinstance(event.data, dict) else None
    if not d:
        return None
    v = d.get(key)
    if isinstance(v, (int, float)):
        x = float(v)
        if x == x:
            return x
    return None


def process_tick(
    *,
    event: TickEvent,
    clock: SimulationClock,
    orders: OrderManager,
    portfolio: PortfolioManager,
    fill_engine: FillEngine,
    hooks: ReplayHooks,
    ctx: RunContext,
    forbid_open_first_ms_in_round: int = 1_000,
    forbid_open_last_ms_in_round: int = 0,
    allow_same_tick_fills: bool = False,
) -> EquityPoint:
    """Execute one tick: clock advance, fills for due orders, strategy hook, equity sample."""
    clock.set(event.timestamp_ms)

    def _fill_due_orders() -> None:
        for order in orders.pop_due(event.timestamp_ms):
            # Guard execution-time opens too (latency can shift a valid submit into forbidden boundary time).
            if order.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
                rs = utc_five_minute_round_start_ms(event.timestamp_ms)
                if forbid_open_first_ms_in_round > 0 and event.timestamp_ms < rs + forbid_open_first_ms_in_round:
                    orders.mark_rejected(order.order_id, "round_start_guard_at_fill")
                    hooks.on_order_rejected(order, ctx)
                    continue
                if forbid_open_last_ms_in_round > 0:
                    re = rs + MARKET_WINDOW_MS
                    if event.timestamp_ms >= re - forbid_open_last_ms_in_round:
                        orders.mark_rejected(order.order_id, "end_of_round_guard_at_fill")
                        hooks.on_order_rejected(order, ctx)
                        continue
            # TODO(v2): Re-validate risk vs current quote for latent orders (submit-time checks can stale).
            fill = fill_engine.try_fill(order, event)
            if fill is None:
                orders.mark_rejected(order.order_id, "no_fill")
                hooks.on_order_rejected(order, ctx)
                continue
            try:
                _, upd = portfolio.apply_fill(fill)
            except InsufficientCashForFillError:
                orders.mark_rejected(order.order_id, "insufficient_cash_at_fill")
                hooks.on_order_rejected(order, ctx)
                continue
            except ValueError as exc:
                msg = str(exc)
                if msg in {
                    "Close fill on empty position",
                    "Close quantity exceeds position",
                    "Cannot close empty position",
                }:
                    orders.mark_rejected(order.order_id, "insufficient_position_at_fill")
                    hooks.on_order_rejected(order, ctx)
                    continue
                raise
            orders.mark_filled(order.order_id)
            hooks.on_order_fill(fill, ctx)
            hooks.on_position_update(upd, ctx)

    _fill_due_orders()

    hooks.on_tick(event, ctx)
    if allow_same_tick_fills:
        # Optional realism override: zero-latency orders submitted in on_tick can fill on this same tick.
        _fill_due_orders()
    eq = portfolio.equity(event)
    unreal = eq - portfolio.cash
    yes_ask = _extra_num(event, "up_best_ask")
    yes_bid = _extra_num(event, "up_best_bid")
    no_ask = _extra_num(event, "down_best_ask")
    no_bid = _extra_num(event, "down_best_bid")
    return EquityPoint(
        timestamp_ms=event.timestamp_ms,
        equity=eq,
        cash=portfolio.cash,
        unrealized_pnl=unreal,
        price=event.price,
        yes=event.yes,
        no=event.no,
        yes_bid=yes_bid,
        yes_ask=yes_ask,
        no_bid=no_bid,
        no_ask=no_ask,
    )
