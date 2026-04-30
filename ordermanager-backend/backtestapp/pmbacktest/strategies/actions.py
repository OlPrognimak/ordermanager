"""Predefined strategy action helpers (qty/usd and close helpers)."""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import OrderAction, OrderIntent, TokenSide


def _open_action(side: TokenSide) -> OrderAction:
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _close_action(side: TokenSide) -> OrderAction:
    return OrderAction.CLOSE_YES if side == TokenSide.YES else OrderAction.CLOSE_NO


def position_qty(ctx: RunContext, side: TokenSide) -> float:
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


@dataclass(slots=True)
class StrategyActions:
    """Unified action API for strategy implementations."""

    ctx: RunContext

    def buy_qty(self, side: TokenSide, qty: float, *, reason: str) -> bool:
        q = float(qty)
        if self.ctx.max_position_shares_per_side is not None:
            cur = position_qty(self.ctx, side)
            q = min(q, max(0.0, float(self.ctx.max_position_shares_per_side) - cur))
        if q <= 0:
            return False
        try:
            self.ctx.submit_order(OrderIntent(action=_open_action(side), quantity=q, metadata={"reason": reason}))
            return True
        except ValueError:
            return False

    def buy_usd(self, side: TokenSide, usd: float, ask_cents: float, *, reason: str) -> bool:
        px = float(ask_cents) / 100.0
        if usd <= 0 or px <= 0:
            return False
        return self.buy_qty(side, float(usd) / px, reason=reason)

    def sell_qty(self, side: TokenSide, qty: float, *, reason: str) -> bool:
        q = float(qty)
        if q <= 0:
            return False
        try:
            self.ctx.submit_order(OrderIntent(action=_close_action(side), quantity=q, metadata={"reason": reason}))
            return True
        except ValueError:
            return False

    def sell_all(self, side: TokenSide, *, reason: str) -> bool:
        return self.sell_qty(side, position_qty(self.ctx, side), reason=reason)

