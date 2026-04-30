"""Scheduled entries/exits for 5m BTC up/down rounds using spot move vs round-open BTC."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

from pmbacktest.core.broker import MARKET_WINDOW_MS
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy

_MS_1M = 60_000
_MS_2M = 2 * _MS_1M
_MS_4M = 4 * _MS_1M


def _open_action(side: TokenSide) -> OrderAction:
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _close_action(side: TokenSide) -> OrderAction:
    return OrderAction.CLOSE_YES if side == TokenSide.YES else OrderAction.CLOSE_NO


def _ask_cents(event: TickEvent, side: TokenSide) -> float:
    d = event.data if isinstance(event.data, dict) else {}
    if side == TokenSide.YES:
        v = d.get("up_best_ask")
    else:
        v = d.get("down_best_ask")
    if isinstance(v, (int, float)) and isfinite(float(v)):
        return float(v)
    return float(event.yes if side == TokenSide.YES else event.no)


def _bid_cents(event: TickEvent, side: TokenSide) -> float:
    d = event.data if isinstance(event.data, dict) else {}
    if side == TokenSide.YES:
        v = d.get("up_best_bid")
    else:
        v = d.get("down_best_bid")
    if isinstance(v, (int, float)) and isfinite(float(v)):
        return float(v)
    return float(event.yes if side == TokenSide.YES else event.no)


def _pos_qty(ctx: RunContext, side: TokenSide) -> float:
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


def _avg_entry(ctx: RunContext, side: TokenSide) -> float | None:
    for p in ctx.positions():
        if p.side == side and p.quantity > 1e-12:
            px = float(p.avg_entry_price)
            return px if isfinite(px) and px > 0 else None
    return None


@dataclass(slots=True)
class _SideFlags:
    early_filled: bool = False
    mid_filled: bool = False
    winddown_submitted: bool = False


class TimedBtcDiffRoundV1Strategy(Strategy):
    """
    Per YES/NO leg (when ``side`` is ``both``):

    - **Open A**: first 2 minutes of the UTC 5m round, one OPEN of ``order_qty`` shares when best ask
      is strictly below ``early_ask_max_cents`` and |BTC − round_open_BTC| < ``early_btc_diff_max_usd``.
    - **Open B**: from 2:00 through 4:00 into the round (``[120s, 240s]`` inclusive on the endpoints),
      one OPEN of ``order_qty`` when ask is in ``[mid_ask_min_cents, mid_ask_max_cents]`` and BTC diff
      < ``mid_btc_diff_max_usd``.
    - **Take profit**: same 2:00–4:00 window, CLOSE all when best bid is at least ``tp_mult`` × avg entry
      and BTC diff < ``tp_btc_diff_max_usd``.
    - **Late scratch**: in the last 1 minute (``elapsed ≥ 240s``), CLOSE all when bid is strictly below
      ``tp_mult`` × avg entry and BTC diff > ``late_exit_btc_diff_min_usd``.
    - **Wind-down**: in the final ``winddown_last_ms`` of the round, submit one CLOSE for any remaining
      shares (covers leftovers when earlier rules do not fire).

    **BTC diff** is ``abs(event.price − first_positive_BTC_in_round)`` in USD, using the first finite
    strictly positive ``event.price`` observed after each round boundary as the reference.
    """

    def __init__(
        self,
        *,
        side: str = "both",
        order_qty: float = 10.0,
        early_ask_max_cents: float = 25.0,
        early_btc_diff_max_usd: float = 35.0,
        mid_ask_min_cents: float = 30.0,
        mid_ask_max_cents: float = 45.0,
        mid_btc_diff_max_usd: float = 15.0,
        tp_mult: float = 2.0,
        tp_btc_diff_max_usd: float = 30.0,
        late_exit_btc_diff_min_usd: float = 25.0,
        winddown_last_ms: int = 3000,
        **extras: object,
    ) -> None:
        _ = extras
        s = side.lower().strip()
        if s not in {"yes", "no", "both"}:
            raise ValueError("side must be one of: yes, no, both")
        if order_qty <= 0:
            raise ValueError("order_qty must be > 0")
        if mid_ask_min_cents > mid_ask_max_cents:
            raise ValueError("mid_ask_min_cents must be <= mid_ask_max_cents")
        if tp_mult <= 0:
            raise ValueError("tp_mult must be > 0")
        if winddown_last_ms <= 0 or winddown_last_ms >= MARKET_WINDOW_MS:
            raise ValueError("winddown_last_ms must be in (0, MARKET_WINDOW_MS)")

        self._trade_side = s
        self.order_qty = float(order_qty)
        self.early_ask_max_cents = float(early_ask_max_cents)
        self.early_btc_diff_max_usd = float(early_btc_diff_max_usd)
        self.mid_ask_min_cents = float(mid_ask_min_cents)
        self.mid_ask_max_cents = float(mid_ask_max_cents)
        self.mid_btc_diff_max_usd = float(mid_btc_diff_max_usd)
        self.tp_mult = float(tp_mult)
        self.tp_btc_diff_max_usd = float(tp_btc_diff_max_usd)
        self.late_exit_btc_diff_min_usd = float(late_exit_btc_diff_min_usd)
        self.winddown_last_ms = int(winddown_last_ms)

        self._round_start_ms: int | None = None
        self._btc_open_usd: float | None = None
        self._yes = _SideFlags()
        self._no = _SideFlags()

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._round_start_ms = None
        self._btc_open_usd = None
        self._yes = _SideFlags()
        self._no = _SideFlags()

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        rs = utc_five_minute_round_start_ms(int(event.timestamp_ms))
        if self._round_start_ms is None:
            self._round_start_ms = rs
        elif rs != self._round_start_ms:
            self._round_start_ms = rs
            self._btc_open_usd = None
            self._yes = _SideFlags()
            self._no = _SideFlags()

        px = float(event.price)
        if self._btc_open_usd is None and isfinite(px) and px > 0.0:
            self._btc_open_usd = px

        btc_diff: float | None = None
        if self._btc_open_usd is not None and isfinite(px) and px > 0.0:
            btc_diff = abs(px - float(self._btc_open_usd))

        elapsed = int(event.timestamp_ms) - rs
        if elapsed < 0:
            elapsed = 0

        first_two = elapsed < _MS_2M
        mid_band = _MS_2M <= elapsed <= _MS_4M
        last_one = elapsed >= _MS_4M
        winddown = elapsed >= MARKET_WINDOW_MS - self.winddown_last_ms

        if self._trade_side in {"yes", "both"}:
            self._process_side(TokenSide.YES, self._yes, event, ctx, btc_diff, first_two, mid_band, last_one, winddown)
        if self._trade_side in {"no", "both"}:
            self._process_side(TokenSide.NO, self._no, event, ctx, btc_diff, first_two, mid_band, last_one, winddown)

    def _process_side(
        self,
        side: TokenSide,
        st: _SideFlags,
        event: TickEvent,
        ctx: RunContext,
        btc_diff: float | None,
        first_two: bool,
        mid_band: bool,
        last_one: bool,
        winddown: bool,
    ) -> None:
        qty = _pos_qty(ctx, side)
        ask = _ask_cents(event, side)
        bid = _bid_cents(event, side)
        bid_usd = bid / 100.0

        if qty > 0:
            entry = _avg_entry(ctx, side)
            if entry is not None:
                target = self.tp_mult * float(entry)
                if mid_band and btc_diff is not None and bid_usd >= target and btc_diff < self.tp_btc_diff_max_usd:
                    self._close_all(ctx, side, qty, reason="tp_2x_mid")
                    return
                if (
                    last_one
                    and btc_diff is not None
                    and bid_usd < target
                    and btc_diff > self.late_exit_btc_diff_min_usd
                ):
                    self._close_all(ctx, side, qty, reason="late_scratch_below_2x")
                    return

        if winddown and qty > 0 and not st.winddown_submitted:
            if self._close_all(ctx, side, qty, reason="round_winddown"):
                st.winddown_submitted = True
            return

        if qty > 0 and st.mid_filled:
            return
        if qty > 0 and not st.early_filled and not st.mid_filled:
            return

        if btc_diff is None:
            return

        if not st.early_filled and first_two and ask < self.early_ask_max_cents and btc_diff < self.early_btc_diff_max_usd:
            if self._open_lot(ctx, side, reason="early_cheap"):
                st.early_filled = True
            return

        if (
            not st.mid_filled
            and mid_band
            and self.mid_ask_min_cents <= ask <= self.mid_ask_max_cents
            and btc_diff < self.mid_btc_diff_max_usd
        ):
            if self._open_lot(ctx, side, reason="mid_band"):
                st.mid_filled = True

    def _open_lot(self, ctx: RunContext, side: TokenSide, *, reason: str) -> bool:
        q = self.order_qty
        if ctx.max_position_shares_per_side is not None:
            cur = _pos_qty(ctx, side)
            cap = float(ctx.max_position_shares_per_side)
            q = min(q, max(0.0, cap - cur))
        if q <= 0:
            return False
        intent = OrderIntent(
            action=_open_action(side),
            quantity=q,
            metadata={"reason": reason, "order_qty": self.order_qty},
        )
        try:
            ctx.submit_order(intent)
            return True
        except ValueError:
            return False

    def _close_all(self, ctx: RunContext, side: TokenSide, qty: float, *, reason: str) -> bool:
        if qty <= 0:
            return False
        intent = OrderIntent(
            action=_close_action(side),
            quantity=qty,
            metadata={"reason": reason},
        )
        try:
            ctx.submit_order(intent)
            return True
        except ValueError:
            return False
