"""Pluggable fill simulation at a tick (execution abstraction boundary)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Protocol

from pmbacktest.core.types import Fill, OrderAction, OrderRecord, OrderStatus, TickEvent, TokenSide
from pmbacktest.execution.models import ExecutionConfig


class FillEngine(Protocol):
    """Maps a due order and market snapshot to an optional fill (liquidity model hook)."""

    def try_fill(self, order: OrderRecord, event: TickEvent) -> Fill | None:
        ...


def _token_side_for_action(action: OrderAction) -> TokenSide:
    if action in (OrderAction.OPEN_YES, OrderAction.CLOSE_YES):
        return TokenSide.YES
    return TokenSide.NO


def _is_open(action: OrderAction) -> bool:
    return action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO)


# Cent-scale (0–100) field names on ``TickEvent.data`` — aligned with ``mongo_own.resolve_up_down_book`` output.
_ASK_KEYS_YES: tuple[str, ...] = ("up_best_ask", "yes_ask", "upAsk", "yesAsk")
_ASK_KEYS_NO: tuple[str, ...] = ("down_best_ask", "no_ask", "downAsk", "noAsk")
_BID_KEYS_YES: tuple[str, ...] = ("up_best_bid", "yes_bid", "upBid", "yesBid")
_BID_KEYS_NO: tuple[str, ...] = ("down_best_bid", "no_bid", "downBid", "noBid")


def _first_finite_cent_quote(d: dict[str, object], keys: tuple[str, ...]) -> float | None:
    for key in keys:
        q = d.get(key)
        if isinstance(q, (int, float)):
            qf = float(q)
            if qf == qf:
                return qf
    return None


def _best_quote_for_order(order: OrderRecord, event: TickEvent) -> float:
    """
    Execution quote selection (Polymarket-style YES/NO tokens, prices as cents 0–100 on the wire):

    - **OPEN_*** (buy token): best **ask** — ``up_best_ask`` / ``down_best_ask`` and aliases; else YES/NO **mid**.
    - **CLOSE_*** (sell token): best **bid** — ``up_best_bid`` / ``down_best_bid`` and aliases; else mid.

    ``mongo_own`` attaches cent-scale ``up_best_*`` / ``down_best_*`` on every merged tick.
    """
    side = _token_side_for_action(order.action)
    mid = event.yes / 100.0 if side == TokenSide.YES else event.no / 100.0
    d = event.data if isinstance(event.data, dict) else {}
    if _is_open(order.action):
        keys = _ASK_KEYS_YES if side == TokenSide.YES else _ASK_KEYS_NO
    else:
        keys = _BID_KEYS_YES if side == TokenSide.YES else _BID_KEYS_NO
    qf = _first_finite_cent_quote(d, keys)
    if qf is not None:
        return qf / 100.0
    return mid


@dataclass(slots=True)
class MarketFillEngine:
    """
    Mid-quote execution with configurable slippage and fees (default v1 behavior).

    Implements ``FillEngine``; swap for custom microstructure / depth models.
    """

    config: ExecutionConfig

    def try_fill(self, order: OrderRecord, event: TickEvent) -> Fill | None:
        if order.status != OrderStatus.PENDING:
            return None
        side = _token_side_for_action(order.action)
        raw = _best_quote_for_order(order, event)
        is_buy = _is_open(order.action)
        eff = self.config.slippage.adjust_price(
            raw, side=side, is_buy=is_buy, event=event
        )
        notional = eff * order.quantity
        fee = self.config.fees.fee_on_trade(notional, action=order.action, side=side)
        slip_vs_mid = abs(eff - raw) * order.quantity
        fill_id = uuid.uuid4().hex
        return Fill(
            fill_id=fill_id,
            order_id=order.order_id,
            run_id=order.run_id,
            timestamp_ms=event.timestamp_ms,
            action=order.action,
            side=side,
            quantity=order.quantity,
            price_per_share=eff,
            fee=fee,
            slippage_cost=slip_vs_mid,
            metadata=dict(order.metadata),
        )
