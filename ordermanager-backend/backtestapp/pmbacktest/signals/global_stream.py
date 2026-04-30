"""Global signal stream adapter for strategy-side feature inputs.

This module defines a canonical per-tick quote view shared by strategies.
"""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.core.types import TickEvent, TokenSide


@dataclass(frozen=True, slots=True)
class SignalTick:
    """Normalized quote snapshot for one engine tick."""

    timestamp_ms: int
    price: float
    yes_ask_cents: float
    yes_bid_cents: float
    no_ask_cents: float
    no_bid_cents: float

    def ask_cents(self, side: TokenSide) -> float:
        return self.yes_ask_cents if side == TokenSide.YES else self.no_ask_cents

    def bid_cents(self, side: TokenSide) -> float:
        return self.yes_bid_cents if side == TokenSide.YES else self.no_bid_cents


def to_signal_tick(event: TickEvent) -> SignalTick:
    """Build canonical signal view from raw TickEvent (causal, per tick)."""
    d = event.data if isinstance(event.data, dict) else {}
    ya = float(d.get("up_best_ask")) if isinstance(d.get("up_best_ask"), (int, float)) else float(event.yes)
    yb = float(d.get("up_best_bid")) if isinstance(d.get("up_best_bid"), (int, float)) else float(event.yes)
    na = float(d.get("down_best_ask")) if isinstance(d.get("down_best_ask"), (int, float)) else float(event.no)
    nb = float(d.get("down_best_bid")) if isinstance(d.get("down_best_bid"), (int, float)) else float(event.no)
    return SignalTick(
        timestamp_ms=int(event.timestamp_ms),
        price=float(event.price),
        yes_ask_cents=ya,
        yes_bid_cents=yb,
        no_ask_cents=na,
        no_bid_cents=nb,
    )

