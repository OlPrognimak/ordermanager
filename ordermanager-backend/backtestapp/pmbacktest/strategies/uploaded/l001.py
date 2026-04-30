"""Custom 5m BTC up/down strategy with EMA peak detection."""

from __future__ import annotations

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy


class MyDashboardStrategy(Strategy):
    """
    Exactly one Strategy subclass per file. The strategy id in the GUI is the file name
    without .py (e.g. my_strategy.py -> select "my_strategy" in Configure).
    JSON parameters from the form are passed as constructor kwargs.
    """

    def __init__(self, **kwargs: object) -> None:
        self.alpha = float(kwargs.get("alpha", 0.3))
        self.min_move = float(kwargs.get("min_move", 0.02))
        self.order_qty = float(kwargs.get("order_qty", 1.0))
        self.min_signal_gap_ms = int(kwargs.get("min_signal_gap_ms", 1_000))
        self.last_signal_ts_ms: int | None = None

        # EMA state
        self.ema_up: float | None = None
        self.ema_down: float | None = None

        # Peak detection state for "up" stream
        self.last_ema_up: float | None = None
        self.direction_up: str | None = None
        self.candidate_peak_up: float | None = None
        self.last_valley_up: float | None = None
        self.last_peak_up: float | None = None

        # Peak detection state for "down" stream
        self.last_ema_down: float | None = None
        self.direction_down: str | None = None
        self.candidate_peak_down: float | None = None
        self.last_valley_down: float | None = None
        self.last_peak_down: float | None = None

    def _read_price(self, event: TickEvent, *names: str) -> float | None:
        # Tries common shapes: event.attr or event.data["attr"].
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

    def _has_open_side(self, ctx: RunContext, side: TokenSide) -> bool:
        for p in ctx.positions():
            if p.side == side and p.quantity > 1e-12:
                return True
        return False

    def _can_signal(self, ts_ms: int) -> bool:
        if self.last_signal_ts_ms is None:
            return True
        return ts_ms - self.last_signal_ts_ms >= self.min_signal_gap_ms

    def _try_open(self, ctx: RunContext, side: TokenSide) -> None:
        if self.order_qty <= 1e-12:
            return
        if self._has_open_side(ctx, side):
            return
        action = OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO
        ctx.submit_order(OrderIntent(action=action, quantity=self.order_qty))

    def _update_ema(self, current_ema: float | None, price: float) -> float:
        if current_ema is None:
            return price
        return (self.alpha * price) + ((1.0 - self.alpha) * current_ema)

    def _detect_peak(
        self,
        ema: float,
        *,
        stream: str,
    ) -> float | None:
        if stream == "up":
            last_ema = self.last_ema_up
            direction = self.direction_up
            candidate_peak = self.candidate_peak_up
            last_valley = self.last_valley_up
        else:
            last_ema = self.last_ema_down
            direction = self.direction_down
            candidate_peak = self.candidate_peak_down
            last_valley = self.last_valley_down

        if last_ema is None:
            if stream == "up":
                self.last_ema_up = ema
                self.last_valley_up = ema
            else:
                self.last_ema_down = ema
                self.last_valley_down = ema
            return None

        diff = ema - last_ema
        if diff == 0:
            return None

        new_direction = "up" if diff > 0 else "down"
        peak: float | None = None

        # UP -> DOWN: emit a peak only if move from valley is large enough.
        if direction == "up" and new_direction == "down" and candidate_peak is not None:
            base_valley = last_valley if last_valley is not None else last_ema
            if (candidate_peak - base_valley) > self.min_move:
                peak = candidate_peak

        if new_direction == "up":
            candidate_peak = ema if candidate_peak is None else max(candidate_peak, ema)
        else:
            if last_valley is None:
                last_valley = ema
            else:
                last_valley = min(last_valley, ema)

        if stream == "up":
            self.last_ema_up = ema
            self.direction_up = new_direction
            self.candidate_peak_up = candidate_peak
            self.last_valley_up = last_valley
            if peak is not None:
                self.last_peak_up = peak
        else:
            self.last_ema_down = ema
            self.direction_down = new_direction
            self.candidate_peak_down = candidate_peak
            self.last_valley_down = last_valley
            if peak is not None:
                self.last_peak_down = peak

        return peak

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        # Engine ticks use YES/NO cent prices on TickEvent (0..100).
        price_up = self._read_price(event, "yes", "price_up", "up_price", "up")
        price_down = self._read_price(event, "no", "price_down", "down_price", "down")

        if price_up is None or price_down is None:
            return

        # 1) Real-time smoothing (EMA)
        self.ema_up = self._update_ema(self.ema_up, price_up)
        self.ema_down = self._update_ema(self.ema_down, price_down)

        # 2/3/4) Trend direction + peak on UP->DOWN + min_move protection
        peak_up = self._detect_peak(self.ema_up, stream="up")
        peak_down = self._detect_peak(self.ema_down, stream="down")

        # Expose latest peaks on strategy state for dashboard/inspection.
        if peak_up is not None:
            self.last_peak_up = peak_up
        if peak_down is not None:
            self.last_peak_down = peak_down

        # Signal mapping:
        # - peak on YES stream => OPEN_NO
        # - peak on NO stream  => OPEN_YES
        if not self._can_signal(event.timestamp_ms):
            return
        if peak_up is not None:
            self._try_open(ctx, TokenSide.NO)
            self.last_signal_ts_ms = event.timestamp_ms
        elif peak_down is not None:
            self._try_open(ctx, TokenSide.YES)
            self.last_signal_ts_ms = event.timestamp_ms
