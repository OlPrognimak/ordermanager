"""Custom 5m BTC up/down strategy with EMA slippage trough detection.

This strategy is intended for dashboarding/visualization rather than trading:
- It computes an EMA for two input streams ("up" and "down") from best-ask prices.
- It computes EMA slippage as a first-derivative (Δema/Δt) and smooths it with EMA.
- It detects confirmed troughs when smoothed slippage crosses from negative -> positive,
  with an additional angle-change constraint.
- It stores detected troughs in memory for later inspection.

Optionally, it can submit BUY orders when troughs are confirmed so events are
visible in order/fill-based dashboards.
"""

from __future__ import annotations

import math

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderIntent, TickEvent
from pmbacktest.strategies.base import Strategy


class MyDashboardStrategy(Strategy):
    """EMA slippage trough detection for two price streams.

    Parameters (passed as JSON kwargs):
        alpha:
            EMA smoothing factor in (0, 1]. Used for both price EMA and slippage EMA.
        min_move:
            Retained for backward compatibility; unused.
        buy_on_peaks:
            Retained name for backward compatibility. If true, submit a BUY order
            when a trough is confirmed.
        peak_stream:
            Which stream's troughs trigger buys: "up", "down", or "both".
        order_qty:
            Quantity to buy when a trough is confirmed.
        debug_events:
            If true, store lightweight trace events in `self.debug_events`.

    Notes:
        - The strategy expects two best-ask fields per tick, one for the "up" stream
          and one for the "down" stream.
        - Slippage is computed as (ema[i] - ema[i-1]) / (ts[i] - ts[i-1]) * 1000,
          i.e. per-second when timestamps are in milliseconds.
        - Troughs are detected at negative->positive zero-crossings of smoothed
          slippage, gated by an angle-change constraint using the value from 5 ticks
          back.
    """

    def __init__(
        self,
        *,
        alpha: float = 0.3,
        min_move: float = 0.02,
        buy_on_peaks: bool = True,
        peak_stream: str = "up",
        order_qty: float = 1.0,
        debug_events: bool = False,
        **extras: object,
    ) -> None:
        _ = extras

        self.alpha = float(alpha)
        self.min_move = float(min_move)
        self.buy_on_peaks = bool(buy_on_peaks)
        self.peak_stream = str(peak_stream)
        self.order_qty = float(order_qty)
        self.debug_events_enabled = bool(debug_events)

        if not (0.0 < self.alpha <= 1.0):
            raise ValueError(f"alpha must be in (0, 1], got {self.alpha}")
        if self.min_move < 0.0:
            raise ValueError(f"min_move must be >= 0, got {self.min_move}")
        if self.peak_stream not in {"up", "down", "both"}:
            raise ValueError(
                f"peak_stream must be one of 'up', 'down', 'both', got {self.peak_stream!r}"
            )
        if self.order_qty <= 0.0:
            raise ValueError(f"order_qty must be > 0, got {self.order_qty}")

        # EMA state (best-ask EMA)
        self._ema_up: float | None = None
        self._ema_down: float | None = None

        # Timestamp + previous EMA for derivative
        self._last_ts_ms: float | None = None
        self._last_ema_up: float | None = None
        self._last_ema_down: float | None = None

        # Smoothed slippage EMA
        self._slip_ema_up: float | None = None
        self._slip_ema_down: float | None = None

        # For zero-crossing detection
        self._last_slip_ema_up: float | None = None
        self._last_slip_ema_down: float | None = None

        # Keep a short history of smoothed slippage for angle gating
        self._slip_hist_up: list[float] = []
        self._slip_hist_down: list[float] = []

        # Every confirmed trough (newest last)
        self.troughs_up: list[dict[str, float | None]] = []
        self.troughs_down: list[dict[str, float | None]] = []

        # Backward-compat attributes (now represent last trough value)
        self.last_peak_up: float | None = None
        self.last_peak_down: float | None = None

        # Optional trace buffer for dashboards
        self.debug_events: list[dict[str, object]] = []

        # Anti-spam guard: don't buy twice for the same detected event.
        self._last_bought_peak_key: tuple[object, ...] | None = None

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx

    def on_finish(self, ctx: RunContext) -> None:
        _ = ctx

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        _ = ctx
        if not self.debug_events_enabled:
            return
        self.debug_events.append({"type": "fill", "fill": fill})

    def _trace(self, payload: dict[str, object]) -> None:
        if not self.debug_events_enabled:
            return
        self.debug_events.append(payload)

    def _read_price(self, event: TickEvent, *names: str) -> float | None:
        """Try common shapes: event.attr or event.data["attr"]."""
        for name in names:
            if hasattr(event, name):
                value = getattr(event, name)
                if value is not None:
                    return float(value)

        data = getattr(event, "data", None)
        if isinstance(data, dict):
            for name in names:
                value = data.get(name)
                if value is not None:
                    return float(value)
        return None

    def _read_ts_ms(self, event: TickEvent) -> float | None:
        if hasattr(event, "timestamp_ms"):
            value = getattr(event, "timestamp_ms")
            if value is not None:
                return float(value)

        for name in ("ts_ms", "timestamp_ms"):
            if hasattr(event, name):
                value = getattr(event, name)
                if value is not None:
                    return float(value)

        data = getattr(event, "data", None)
        if isinstance(data, dict):
            for name in ("ts_ms", "timestamp_ms"):
                value = data.get(name)
                if value is not None:
                    return float(value)

        return None

    def _read_ts(self, event: TickEvent) -> float | None:
        ts_ms = self._read_ts_ms(event)
        if ts_ms is not None:
            return ts_ms

        for name in ("ts", "timestamp", "time", "t", "ts_ms"):
            if hasattr(event, name):
                value = getattr(event, name)
                if value is not None:
                    return float(value)
        data = getattr(event, "data", None)
        if isinstance(data, dict):
            for name in ("ts", "timestamp", "time", "t", "ts_ms"):
                value = data.get(name)
                if value is not None:
                    return float(value)
        return None

    def _update_ema(self, current_ema: float | None, value: float) -> float:
        if current_ema is None:
            return value
        return (self.alpha * value) + ((1.0 - self.alpha) * current_ema)

    def _angle_change_lt_90deg(self, prev: float, curr: float) -> bool:
        """Angle change between two slopes, using vectors (1, slope).

        Returns True if absolute angle difference is < 90 degrees.
        """
        a1 = math.atan2(prev, 1.0)
        a2 = math.atan2(curr, 1.0)
        return abs(a2 - a1) < (math.pi / 2.0)

    def _detect_trough(
        self,
        *,
        slip_ema: float,
        last_slip_ema: float | None,
        slip_hist: list[float],
    ) -> bool:
        """Detect trough at negative->positive zero-crossing with angle gating."""
        if last_slip_ema is None:
            return False

        crossed = last_slip_ema < 0.0 and slip_ema > 0.0
        if not crossed:
            return False

        if len(slip_hist) < 5:
            return False

        prev5 = slip_hist[-5]
        return self._angle_change_lt_90deg(prev5, slip_ema)

    def _maybe_buy_on_trough(
        self,
        *,
        trough_slip: float,
        confirm_price: float,
        ts_ms: float | None,
        stream: str,
        ctx: RunContext,
    ) -> None:
        if not self.buy_on_peaks:
            return
        if self.peak_stream != "both" and self.peak_stream != stream:
            return

        trough_key_val = round(float(trough_slip), 10)
        if ts_ms is not None:
            trough_key: tuple[object, ...] = (stream, float(ts_ms), trough_key_val)
        else:
            count = len(self.troughs_up) if stream == "up" else len(self.troughs_down)
            trough_key = (stream, trough_key_val, count)

        if self._last_bought_peak_key == trough_key:
            return

        action = OrderAction.OPEN_YES if stream == "up" else OrderAction.OPEN_NO
        intent = OrderIntent(
            action=action,
            quantity=self.order_qty,
            metadata={
                "stream": stream,
                "slip_ema_trough": float(trough_slip),
                "confirm_price": float(confirm_price),
                "ts_ms": float(ts_ms) if ts_ms is not None else None,
            },
        )
        ctx.submit_order(intent)

        self._last_bought_peak_key = trough_key

        self._trace(
            {
                "type": "intent",
                "intent": action.value,
                "stream": stream,
                "quantity": self.order_qty,
                "slip_ema_trough": trough_slip,
                "confirm_price": confirm_price,
                "ts_ms": ts_ms,
            }
        )

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        # Prefer best-ask fields per instruction; keep a few fallbacks.
        price_up = self._read_price(
            event,
            "up_best_ask",
            "yes_best_ask",
            "best_ask_up",
            "price_up",
            "up_price",
            "up",
            "yes",
        )
        price_down = self._read_price(
            event,
            "down_best_ask",
            "no_best_ask",
            "best_ask_down",
            "price_down",
            "down_price",
            "down",
            "no",
        )

        if price_up is None or price_down is None:
            _ = ctx
            return

        ts_ms = self._read_ts_ms(event)
        if ts_ms is None:
            # Fall back to whatever timestamp exists; treated as ms for derivative scaling.
            ts_ms = self._read_ts(event)

        if ts_ms is None:
            _ = ctx
            return

        # 1) EMA on best-ask prices
        self._ema_up = self._update_ema(self._ema_up, float(price_up))
        self._ema_down = self._update_ema(self._ema_down, float(price_down))

        # Need previous timestamp and previous EMA to compute derivative.
        if self._last_ts_ms is None or self._last_ema_up is None or self._last_ema_down is None:
            self._last_ts_ms = float(ts_ms)
            self._last_ema_up = float(self._ema_up)
            self._last_ema_down = float(self._ema_down)
            _ = ctx
            return

        dt_ms = float(ts_ms) - float(self._last_ts_ms)
        if dt_ms <= 0.0:
            # Non-increasing timestamps: skip derivative update.
            self._last_ts_ms = float(ts_ms)
            self._last_ema_up = float(self._ema_up)
            self._last_ema_down = float(self._ema_down)
            _ = ctx
            return

        # 2) EMA slippage as first derivative (per second)
        slip_up = (float(self._ema_up) - float(self._last_ema_up)) / dt_ms * 1000.0
        slip_down = (float(self._ema_down) - float(self._last_ema_down)) / dt_ms * 1000.0

        # 3) Smooth slippage with EMA
        self._slip_ema_up = self._update_ema(self._slip_ema_up, slip_up)
        self._slip_ema_down = self._update_ema(self._slip_ema_down, slip_down)

        # Update history buffers
        self._slip_hist_up.append(float(self._slip_ema_up))
        self._slip_hist_down.append(float(self._slip_ema_down))
        if len(self._slip_hist_up) > 64:
            self._slip_hist_up = self._slip_hist_up[-64:]
        if len(self._slip_hist_down) > 64:
            self._slip_hist_down = self._slip_hist_down[-64:]

        # 4) Detect troughs at negative->positive zero-crossings with angle gating
        trough_up = self._detect_trough(
            slip_ema=float(self._slip_ema_up),
            last_slip_ema=self._last_slip_ema_up,
            slip_hist=self._slip_hist_up,
        )
        trough_down = self._detect_trough(
            slip_ema=float(self._slip_ema_down),
            last_slip_ema=self._last_slip_ema_down,
            slip_hist=self._slip_hist_down,
        )

        ts = self._read_ts(event)

        if trough_up:
            self.troughs_up.append(
                {
                    "slip_ema": float(self._slip_ema_up),
                    "confirm_price": float(price_up),
                    "ts": ts,
                    "ts_ms": float(ts_ms),
                }
            )
            self.last_peak_up = float(self._slip_ema_up)
            self._trace(
                {
                    "type": "trough",
                    "stream": "up",
                    "slip_ema": float(self._slip_ema_up),
                    "confirm_price": float(price_up),
                    "ts": ts,
                    "ts_ms": float(ts_ms),
                }
            )
            self._maybe_buy_on_trough(
                trough_slip=float(self._slip_ema_up),
                confirm_price=float(price_up),
                ts_ms=float(ts_ms),
                stream="up",
                ctx=ctx,
            )

        if trough_down:
            self.troughs_down.append(
                {
                    "slip_ema": float(self._slip_ema_down),
                    "confirm_price": float(price_down),
                    "ts": ts,
                    "ts_ms": float(ts_ms),
                }
            )
            self.last_peak_down = float(self._slip_ema_down)
            self._trace(
                {
                    "type": "trough",
                    "stream": "down",
                    "slip_ema": float(self._slip_ema_down),
                    "confirm_price": float(price_down),
                    "ts": ts,
                    "ts_ms": float(ts_ms),
                }
            )
            self._maybe_buy_on_trough(
                trough_slip=float(self._slip_ema_down),
                confirm_price=float(price_down),
                ts_ms=float(ts_ms),
                stream="down",
                ctx=ctx,
            )

        # Roll forward last values
        self._last_ts_ms = float(ts_ms)
        self._last_ema_up = float(self._ema_up)
        self._last_ema_down = float(self._ema_down)
        self._last_slip_ema_up = float(self._slip_ema_up)
        self._last_slip_ema_down = float(self._slip_ema_down)

        _ = ctx