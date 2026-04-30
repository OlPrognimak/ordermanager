"""Beginner-friendly strategy template for pmbacktest.

How to use:
1) Copy this file to a new name without a leading underscore, for example:
     my_first_strategy.py
2) Rename the class to something meaningful (keep one Strategy subclass per file).
3) Edit signal logic in `on_tick()`.

Why underscore?
- Files starting with "_" are ignored by the uploaded strategy loader.
- This keeps the template visible in repo but not runnable by accident.
"""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy


def _mid_cents(event: TickEvent, side: TokenSide) -> float:
    """Return the YES/NO mid quote in cents (0..100) for this side.

    Use this when bid/ask are not available in tick extras.
    """
    return float(event.yes if side == TokenSide.YES else event.no)


def _ask_cents(event: TickEvent, side: TokenSide) -> float:
    """Return best ask in cents for this side (buy price).

    Preference order:
    1) `event.data["up_best_ask"]` / `event.data["down_best_ask"]`
    2) Mid fallback (`event.yes` / `event.no`)
    """
    d = event.data if isinstance(event.data, dict) else {}
    if side == TokenSide.YES:
        v = d.get("up_best_ask")
    else:
        v = d.get("down_best_ask")
    return float(v) if isinstance(v, (int, float)) else _mid_cents(event, side)


def _bid_cents(event: TickEvent, side: TokenSide) -> float:
    """Return best bid in cents for this side (sell price).

    Preference order:
    1) `event.data["up_best_bid"]` / `event.data["down_best_bid"]`
    2) Mid fallback (`event.yes` / `event.no`)
    """
    d = event.data if isinstance(event.data, dict) else {}
    if side == TokenSide.YES:
        v = d.get("up_best_bid")
    else:
        v = d.get("down_best_bid")
    return float(v) if isinstance(v, (int, float)) else _mid_cents(event, side)


def _open_action(side: TokenSide) -> OrderAction:
    """Translate YES/NO side into OPEN order action."""
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _close_action(side: TokenSide) -> OrderAction:
    """Translate YES/NO side into CLOSE order action."""
    return OrderAction.CLOSE_YES if side == TokenSide.YES else OrderAction.CLOSE_NO


def _position_qty(ctx: RunContext, side: TokenSide) -> float:
    """Current position size (shares/contracts) for one side."""
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


@dataclass(slots=True)
class _SideState:
    """Per-side rolling state (kept separately for YES and NO).

    Attributes:
    - `prev_ask`: previous ask price used by simple momentum/rebound rules.
    - `prev_ts_ms`: previous tick timestamp for optional spacing guards.
    """

    prev_ask: float | None = None
    prev_ts_ms: int | None = None


class TemplateStrategy(Strategy):
    """Simple, readable template strategy.

    Default behavior:
    - Buy a fixed USD amount when ask drops by `entry_drop_cents` vs previous tick.
    - Sell all shares for that side when bid rises by `take_profit_cents` vs previous bid.

    Replace this with your own logic as needed.
    """

    def __init__(
        self,
        *,
        side: str = "yes",  # "yes" | "no" | "both"
        entry_drop_cents: float = 0.25,
        take_profit_cents: float = 0.25,
        bet_usd_amount: float = 1.0,
        min_tick_gap_ms: int = 1,
        **extras: object,
    ) -> None:
        _ = extras
        side = side.lower().strip()
        if side not in {"yes", "no", "both"}:
            raise ValueError("side must be one of: yes, no, both")
        if bet_usd_amount <= 0:
            raise ValueError("bet_usd_amount must be > 0")
        if min_tick_gap_ms <= 0:
            raise ValueError("min_tick_gap_ms must be > 0")

        self.side = side
        self.entry_drop_cents = float(entry_drop_cents)
        self.take_profit_cents = float(take_profit_cents)
        self.bet_usd_amount = float(bet_usd_amount)
        self.min_tick_gap_ms = int(min_tick_gap_ms)

        self._yes = _SideState()
        self._no = _SideState()

    def on_start(self, ctx: RunContext) -> None:
        """Reset internal state before replay starts."""
        _ = ctx
        self._yes = _SideState()
        self._no = _SideState()

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        """Main strategy callback called for every tick in chronological order."""
        if self.side in {"yes", "both"}:
            self._process_side(TokenSide.YES, self._yes, event, ctx)
        if self.side in {"no", "both"}:
            self._process_side(TokenSide.NO, self._no, event, ctx)

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        # Optional hook:
        # Update your own metrics, counters, or adaptive parameters from fills.
        _ = fill, ctx

    def on_finish(self, ctx: RunContext) -> None:
        # Optional hook:
        # Emit custom summary stats or perform cleanup after replay ends.
        _ = ctx

    def _process_side(self, side: TokenSide, st: _SideState, event: TickEvent, ctx: RunContext) -> None:
        """Apply entry/exit rules for one side on one tick.

        Flow:
        1) Read current ask/bid.
        2) Optional minimum time spacing.
        3) If flat: evaluate entry.
        4) If in position: evaluate exit.
        5) Update rolling state.
        """
        ts = int(event.timestamp_ms)
        ask = _ask_cents(event, side)
        bid = _bid_cents(event, side)

        if st.prev_ts_ms is not None and ts - st.prev_ts_ms < self.min_tick_gap_ms:
            return

        qty = _position_qty(ctx, side)

        # Example entry: buy when ask falls enough from previous ask.
        if st.prev_ask is not None and qty <= 0:
            if st.prev_ask - ask >= self.entry_drop_cents:
                self._buy_usd(ctx, side, ask, reason="entry_drop")

        # Example exit: close all when bid rises enough from previous bid proxy.
        if st.prev_ask is not None and qty > 0:
            if bid - st.prev_ask >= self.take_profit_cents:
                self._close_all(ctx, side, qty, reason="take_profit")

        st.prev_ask = ask
        st.prev_ts_ms = ts

    def _buy_usd(self, ctx: RunContext, side: TokenSide, ask_cents: float, *, reason: str) -> None:
        """Submit an OPEN order sized from USD notional at current ask.

        Example:
        - ask=40c, bet_usd_amount=1.0 -> quantity=2.5 shares.
        """
        price = ask_cents / 100.0
        if price <= 0:
            return
        qty = self.bet_usd_amount / price
        if qty <= 0:
            return

        # Respect per-side cap if provided by session risk settings.
        if ctx.max_position_shares_per_side is not None:
            cur = _position_qty(ctx, side)
            remaining = max(0.0, float(ctx.max_position_shares_per_side) - cur)
            qty = min(qty, remaining)
            if qty <= 0:
                return

        intent = OrderIntent(
            action=_open_action(side),
            quantity=qty,
            metadata={"reason": reason, "bet_usd_amount": self.bet_usd_amount},
        )
        try:
            ctx.submit_order(intent)
        except ValueError:
            # Rejections (cash/cap/etc.) are expected sometimes; keep strategy running.
            return

    def _close_all(self, ctx: RunContext, side: TokenSide, qty: float, *, reason: str) -> None:
        """Submit a CLOSE order for the full current side position."""
        if qty <= 0:
            return
        intent = OrderIntent(
            action=_close_action(side),
            quantity=qty,
            metadata={"reason": reason},
        )
        try:
            ctx.submit_order(intent)
        except ValueError:
            return

