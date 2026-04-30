"""EMA trough strategy using smoothed first-derivative slippage on best asks."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from math import atan, degrees, isfinite
from typing import Deque

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy


def _open_action(side: TokenSide) -> OrderAction:
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _safe_float(x: object) -> float | None:
    if isinstance(x, (int, float)):
        v = float(x)
        if isfinite(v):
            return v
    return None


def _pos_qty(ctx: RunContext, side: TokenSide) -> float:
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


def _ask_cents(event: TickEvent, side: TokenSide) -> float:
    """
    Read best ask from tick extras when available, else fall back to yes/no mids.

    Expected extras from mongo_own source:
      - up_best_ask / down_best_ask (cents scale 0..100)
    """
    d = event.data if isinstance(event.data, dict) else {}
    if side == TokenSide.YES:
        v = _safe_float(d.get("up_best_ask"))
        return float(v if v is not None else event.yes)
    v = _safe_float(d.get("down_best_ask"))
    return float(v if v is not None else event.no)


@dataclass(slots=True)
class _SideState:
    ema_ask: float | None = None
    prev_ema_ask: float | None = None
    prev_ts_ms: int | None = None
    slip_ema: float | None = None
    prev_slip_ema: float | None = None
    slip_hist: Deque[float] | None = None

    def __post_init__(self) -> None:
        if self.slip_hist is None:
            self.slip_hist = deque(maxlen=16)


class EmaTroughSlippageV1Strategy(Strategy):
    """
    For each side (YES/NO), compute:
      1) EMA(alpha=0.3) on best ask.
      2) Slippage derivative per second:
           (ema[i] - ema[i-1]) / (ts[i] - ts[i-1]) * 1000
      3) Smoothed slippage via EMA(alpha=0.3).

    Buy $1 at every trough where:
      - smoothed slippage crosses negative -> positive, and
      - angle change between smoothed slippage 5 ticks back and current is < 90 degrees.
    """

    def __init__(
        self,
        *,
        alpha_price: float = 0.3,
        alpha_slippage: float = 0.3,
        bet_usd_per_trough: float = 1.0,
        buy_opposite_on_trough: bool = True,
        min_dt_ms: int = 1,
        debug_trace: bool = True,
        max_debug_events: int = 20_000,
        **extras: object,
    ) -> None:
        _ = extras
        if not (0.0 < alpha_price <= 1.0):
            raise ValueError("alpha_price must be in (0, 1]")
        if not (0.0 < alpha_slippage <= 1.0):
            raise ValueError("alpha_slippage must be in (0, 1]")
        if bet_usd_per_trough <= 0.0:
            raise ValueError("bet_usd_per_trough must be > 0")
        if min_dt_ms <= 0:
            raise ValueError("min_dt_ms must be > 0")

        self.alpha_price = float(alpha_price)
        self.alpha_slippage = float(alpha_slippage)
        self.bet_usd_per_trough = float(bet_usd_per_trough)
        self.buy_opposite_on_trough = bool(buy_opposite_on_trough)
        self.min_dt_ms = int(min_dt_ms)
        self._debug_trace = bool(debug_trace)
        self._max_debug_events = max(0, int(max_debug_events))
        self._debug_events: list[dict[str, object]] = []
        self._yes = _SideState()
        self._no = _SideState()
        self._trough_detected_count = 0
        self._trough_rejected_count = 0
        self._buy_submitted_count = 0
        self._buy_rejected_count = 0
        self._buy_skipped_cap_count = 0
        self._rej_insufficient_history = 0
        self._rej_angle_ge_90 = 0
        self._last_reject_reason: str | None = None
        self._last_reject_side: str | None = None
        self._last_reject_angle_deg: float | None = None

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._debug_events = []
        self._yes = _SideState()
        self._no = _SideState()
        self._trough_detected_count = 0
        self._trough_rejected_count = 0
        self._buy_submitted_count = 0
        self._buy_rejected_count = 0
        self._buy_skipped_cap_count = 0
        self._rej_insufficient_history = 0
        self._rej_angle_ge_90 = 0
        self._last_reject_reason = None
        self._last_reject_side = None
        self._last_reject_angle_deg = None

    def _trace(self, row: dict[str, object]) -> None:
        if not self._debug_trace or self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        self._debug_events.append(row)

    def _update_side(self, *, st: _SideState, ask_cents: float, ts_ms: int) -> tuple[float | None, float | None]:
        # Price EMA
        if st.ema_ask is None:
            ema = ask_cents
        else:
            ema = (self.alpha_price * ask_cents) + ((1.0 - self.alpha_price) * st.ema_ask)

        # Derivative of EMA per second
        deriv: float | None = None
        if st.prev_ema_ask is not None and st.prev_ts_ms is not None:
            dt = max(self.min_dt_ms, ts_ms - st.prev_ts_ms)
            deriv = ((ema - st.prev_ema_ask) / float(dt)) * 1000.0

        # Slippage EMA
        slip_ema: float | None = st.slip_ema
        if deriv is not None:
            if st.slip_ema is None:
                slip_ema = deriv
            else:
                slip_ema = (self.alpha_slippage * deriv) + ((1.0 - self.alpha_slippage) * st.slip_ema)

        st.prev_ema_ask = ema
        st.ema_ask = ema
        st.prev_ts_ms = ts_ms
        if slip_ema is not None:
            st.prev_slip_ema = st.slip_ema
            st.slip_ema = slip_ema
            st.slip_hist.append(slip_ema)
        return deriv, slip_ema

    def _angle_change_deg(self, *, st: _SideState, current_slip: float) -> float | None:
        if len(st.slip_hist) < 6:
            return None
        past = st.slip_hist[-6]  # 5 ticks back
        # Convert scalar slope proxy to angle; compare absolute angular change.
        return abs(degrees(atan(current_slip)) - degrees(atan(past)))

    def _maybe_buy(self, *, side: TokenSide, ask_cents: float, ctx: RunContext, ts_ms: int, angle_deg: float) -> None:
        px = ask_cents / 100.0
        if px <= 1e-12:
            return
        qty = self.bet_usd_per_trough / px
        if qty <= 1e-12:
            return
        if ctx.max_position_shares_per_side is not None:
            cur = _pos_qty(ctx, side)
            cap = float(ctx.max_position_shares_per_side)
            remaining = max(0.0, cap - cur)
            if remaining <= 1e-12:
                self._trace(
                    {
                        "ts_ms": int(ts_ms),
                        "phase": "buy_skipped",
                        "side": side.value,
                        "reason": "max_position_shares_per_side_reached",
                        "current_qty": float(cur),
                        "cap": float(cap),
                    }
                )
                self._buy_skipped_cap_count += 1
                return
            qty = min(qty, remaining)
            if qty <= 1e-12:
                return
        intent = OrderIntent(
            action=_open_action(side),
            quantity=qty,
            metadata={
                "bet_usd_amount": self.bet_usd_per_trough,
                "reason": "ema_slippage_trough",
                "angle_change_deg": float(angle_deg),
            },
        )
        try:
            ctx.submit_order(intent)
            self._buy_submitted_count += 1
            self._trace(
                {
                    "ts_ms": int(ts_ms),
                    "phase": "buy_trough",
                    "side": side.value,
                    "ask_cents": float(ask_cents),
                    "quantity": float(qty),
                    "bet_usd": float(self.bet_usd_per_trough),
                    "angle_change_deg": float(angle_deg),
                }
            )
        except ValueError as e:
            # Risk guard rejections (e.g. max_position_shares_per_side) should not crash replay.
            self._buy_rejected_count += 1
            self._trace(
                {
                    "ts_ms": int(ts_ms),
                    "phase": "buy_rejected",
                    "side": side.value,
                    "ask_cents": float(ask_cents),
                    "quantity": float(qty),
                    "bet_usd": float(self.bet_usd_per_trough),
                    "angle_change_deg": float(angle_deg),
                    "error": str(e),
                }
            )

    def _process_side(self, *, side: TokenSide, st: _SideState, event: TickEvent, ctx: RunContext) -> None:
        ts_ms = int(event.timestamp_ms)
        ask = _ask_cents(event, side)
        deriv, slip = self._update_side(st=st, ask_cents=ask, ts_ms=ts_ms)
        prev_slip = st.prev_slip_ema

        self._trace(
            {
                "ts_ms": ts_ms,
                "phase": "tick_side",
                "side": side.value,
                "ask_cents": float(ask),
                "ema_ask": st.ema_ask,
                "slippage_raw": deriv,
                "slippage_ema": slip,
                "slippage_prev": prev_slip,
                "trough_detected_count": int(self._trough_detected_count),
                "trough_rejected_count": int(self._trough_rejected_count),
                "buy_submitted_count": int(self._buy_submitted_count),
                "buy_rejected_count": int(self._buy_rejected_count),
                "buy_skipped_cap_count": int(self._buy_skipped_cap_count),
                "rej_insufficient_history_count": int(self._rej_insufficient_history),
                "rej_angle_ge_90_count": int(self._rej_angle_ge_90),
                "last_reject_reason": self._last_reject_reason,
                "last_reject_side": self._last_reject_side,
                "last_reject_angle_deg": self._last_reject_angle_deg,
                "buy_opposite_on_trough": bool(self.buy_opposite_on_trough),
            }
        )

        if slip is None or prev_slip is None:
            return
        # Inclusive on previous point, exclusive on current for fewer misses around exact-zero samples.
        zero_cross_up = prev_slip <= 0.0 and slip > 0.0
        if not zero_cross_up:
            return

        angle_deg = self._angle_change_deg(st=st, current_slip=slip)
        if angle_deg is None:
            self._trough_rejected_count += 1
            self._rej_insufficient_history += 1
            self._last_reject_reason = "insufficient_history_5_ticks_back"
            self._last_reject_side = side.value
            self._last_reject_angle_deg = None
            self._trace(
                {
                    "ts_ms": ts_ms,
                    "phase": "trough_rejected",
                    "side": side.value,
                    "reason": "insufficient_history_5_ticks_back",
                    "slippage_prev": prev_slip,
                    "slippage_ema": slip,
                }
            )
            return
        if angle_deg >= 90.0:
            self._trough_rejected_count += 1
            self._rej_angle_ge_90 += 1
            self._last_reject_reason = "angle>=90"
            self._last_reject_side = side.value
            self._last_reject_angle_deg = float(angle_deg)
            self._trace(
                {
                    "ts_ms": ts_ms,
                    "phase": "trough_rejected",
                    "side": side.value,
                    "reason": "angle>=90",
                    "angle_change_deg": float(angle_deg),
                }
            )
            return

        self._trough_detected_count += 1
        self._trace(
            {
                "ts_ms": ts_ms,
                "phase": "trough_detected",
                "side": side.value,
                "buy_side": (TokenSide.NO if side == TokenSide.YES else TokenSide.YES).value
                if self.buy_opposite_on_trough
                else side.value,
                "angle_change_deg": float(angle_deg),
                "slippage_prev": prev_slip,
                "slippage_ema": slip,
            }
        )
        # Most important rule: buy $1 at all valid troughs.
        buy_side = TokenSide.NO if (self.buy_opposite_on_trough and side == TokenSide.YES) else (
            TokenSide.YES if (self.buy_opposite_on_trough and side == TokenSide.NO) else side
        )
        buy_ask = _ask_cents(event, buy_side)
        self._maybe_buy(side=buy_side, ask_cents=buy_ask, ctx=ctx, ts_ms=ts_ms, angle_deg=angle_deg)

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        self._process_side(side=TokenSide.YES, st=self._yes, event=event, ctx=ctx)
        self._process_side(side=TokenSide.NO, st=self._no, event=event, ctx=ctx)

