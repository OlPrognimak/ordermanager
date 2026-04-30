"""End-of-session flattening for round settlement / session end."""

from __future__ import annotations

import uuid

from pmbacktest.core.hooks import ExecutionEventSink
from pmbacktest.core.portfolio_manager import PortfolioManager
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderRecord, OrderStatus, TickEvent, TokenSide
from pmbacktest.execution.fill_engine import FillEngine


def _binary_settlement_fill(order: OrderRecord, last: TickEvent) -> Fill:
    """
    Create a synthetic close fill at binary payout:
    - winning side exits at 1.0 (100c)
    - losing side exits at 0.0 (0c)

    Winner is chosen by the higher settlement mid at ``last`` (YES on ties).
    """
    yes_wins = float(last.yes) >= float(last.no)
    if order.action == OrderAction.CLOSE_YES:
        px = 1.0 if yes_wins else 0.0
        side = TokenSide.YES
    else:
        px = 0.0 if yes_wins else 1.0
        side = TokenSide.NO
    return Fill(
        fill_id=uuid.uuid4().hex,
        order_id=order.order_id,
        run_id=order.run_id,
        timestamp_ms=last.timestamp_ms,
        action=order.action,
        side=side,
        quantity=order.quantity,
        price_per_share=px,
        fee=0.0,
        slippage_cost=0.0,
        metadata=dict(order.metadata),
    )


def liquidate_open_positions(
    *,
    last: TickEvent,
    portfolio: PortfolioManager,
    fill_engine: FillEngine,
    sink: ExecutionEventSink,
    ctx: RunContext,
    strict: bool = False,
    binary_settlement: bool = False,
) -> list[str]:
    """
    Market-close any open inventory at the last observed quote (synthetic immediate orders).

    Returns human-readable failure reasons. If ``strict`` and any leg fails to fill, raises
    ``RuntimeError`` (inventory would remain open — silent failure is a scaling footgun).
    """
    failures: list[str] = []
    for side in portfolio.positions.all_positions():
        if side.quantity <= 1e-12:
            continue
        action = OrderAction.CLOSE_YES if side.side == TokenSide.YES else OrderAction.CLOSE_NO
        order = OrderRecord(
            order_id=f"liq-{uuid.uuid4().hex}",
            run_id=portfolio.run_id,
            action=action,
            quantity=side.quantity,
            created_ts_ms=last.timestamp_ms,
            execute_after_ts_ms=last.timestamp_ms,
            status=OrderStatus.PENDING,
            metadata={"liquidation": True},
        )
        fill = _binary_settlement_fill(order, last) if binary_settlement else fill_engine.try_fill(order, last)
        if fill is None:
            failures.append(
                f"liquidation_no_fill:{action.value}:qty={side.quantity}"
            )
            continue
        _, upd = portfolio.apply_fill(fill)
        sink.on_order_fill(fill, ctx)
        sink.on_position_update(upd, ctx)
    if strict and failures:
        raise RuntimeError(
            "liquidation incomplete — open risk remains: " + "; ".join(failures)
        )
    return failures
