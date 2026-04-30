"""Mike v1: exact-analysis-port quote extrema strategy with selectable noise filters."""

from __future__ import annotations

from math import cos, exp, pi, sqrt
from collections import deque

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent, TokenSide
from pmbacktest.signals.global_stream import to_signal_tick
from pmbacktest.strategies.actions import StrategyActions, position_qty
from pmbacktest.strategies.base import Strategy

_WINDOW_MS = 5 * 60 * 1000
_SLOPE_EPS = 1e-9
_NOISE_FILTERS = {
    "ema",
    "zlema",
    "dema",
    "tema",
    "hma",
    "kalman",
    "laguerre",
    "gaussian",
    "butterworth",
    "ultimate_smoother",
    "jurik_approx",
}


def _is_finite(x: float) -> bool:
    return x == x and x not in (float("inf"), float("-inf"))


def _ema(vals: list[float], span: int) -> list[float]:
    n = max(2, int(span))
    a = 2.0 / (n + 1.0)
    out: list[float] = []
    y = vals[0]
    for x in vals:
        y = y + a * (x - y)
        out.append(y)
    return out


def _wma_finite(vals: list[float], period: int) -> list[float]:
    n = max(1, int(period))
    out = [float("nan")] * len(vals)
    den = (n * (n + 1)) / 2.0
    for i in range(len(vals)):
        if i < n - 1:
            continue
        acc = 0.0
        for k in range(n):
            acc += vals[i - k] * (n - k)
        out[i] = acc / den
    return out


def _super_smoother_finite(vals: list[float], period: int) -> list[float]:
    p = max(3, int(period))
    out = [float("nan")] * len(vals)
    a1 = exp((-1.414 * pi) / p)
    b1 = 2.0 * a1 * cos((1.414 * pi) / p)
    c2 = b1
    c3 = -(a1 * a1)
    c1 = 1.0 - c2 - c3
    for i in range(len(vals)):
        if i < 2:
            out[i] = vals[i]
            continue
        out[i] = c1 * (vals[i] + vals[i - 1]) * 0.5 + c2 * out[i - 1] + c3 * out[i - 2]
    return out


def _apply_noise(vals: list[float], span: int, filt: str) -> list[float]:
    # Ported from web/src/utils/noiseFilters.ts applyFilterFinite().
    n = max(2, int(span))
    if filt == "ema":
        return _ema(vals, n)
    if filt == "zlema":
        lag = max(1, (n - 1) // 2)
        z = [vals[i] + (vals[i] - vals[i - lag if i - lag >= 0 else 0]) for i in range(len(vals))]
        return _ema(z, n)
    if filt == "dema":
        e1 = _ema(vals, n)
        e2 = _ema(e1, n)
        return [2.0 * e1[i] - e2[i] for i in range(len(vals))]
    if filt == "tema":
        e1 = _ema(vals, n)
        e2 = _ema(e1, n)
        e3 = _ema(e2, n)
        return [3.0 * e1[i] - 3.0 * e2[i] + e3[i] for i in range(len(vals))]
    if filt == "hma":
        n2 = max(1, n // 2)
        ns = max(1, int(sqrt(n)))
        w1 = _wma_finite(vals, n2)
        w2 = _wma_finite(vals, n)
        diff = [
            (2.0 * w1[i] - w2[i]) if _is_finite(w1[i]) and _is_finite(w2[i]) else float("nan")
            for i in range(len(vals))
        ]
        seed = [diff[i] if _is_finite(diff[i]) else vals[max(0, i - 1)] for i in range(len(vals))]
        return _wma_finite(seed, ns)
    if filt == "kalman":
        q = 0.01 / n
        r = 0.1
        out: list[float] = []
        x = vals[0]
        p = 1.0
        for z in vals:
            p += q
            k = p / (p + r)
            x = x + k * (z - x)
            p = (1.0 - k) * p
            out.append(x)
        return out
    if filt == "laguerre":
        g = max(0.1, min(0.9, 1.0 - 2.0 / (n + 1.0)))
        l0 = vals[0]
        l1 = vals[0]
        l2 = vals[0]
        l3 = vals[0]
        out: list[float] = []
        for x in vals:
            l0n = (1.0 - g) * x + g * l0
            l1n = -g * l0n + l0 + g * l1
            l2n = -g * l1n + l1 + g * l2
            l3n = -g * l2n + l2 + g * l3
            l0, l1, l2, l3 = l0n, l1n, l2n, l3n
            out.append((l0 + 2.0 * l1 + 2.0 * l2 + l3) / 6.0)
        return out
    if filt == "gaussian":
        w = max(3, n | 1)
        sigma = n / 3.0
        k = [exp(-(lag * lag) / (2.0 * sigma * sigma)) for lag in range(w)]
        s = sum(k)
        kernel = [x / s for x in k]
        out: list[float] = []
        for i in range(len(vals)):
            acc = 0.0
            ws = 0.0
            for lag in range(w):
                idx = i - lag
                if idx < 0:
                    break
                kw = kernel[lag]
                acc += vals[idx] * kw
                ws += kw
            out.append(acc / ws if ws > 0 else vals[i])
        return out
    if filt == "butterworth":
        return _super_smoother_finite(vals, n)
    if filt == "ultimate_smoother":
        return _super_smoother_finite(_super_smoother_finite(vals, max(3, int(n * 0.8))), n)
    if filt == "jurik_approx":
        out: list[float] = []
        y = vals[0]
        out.append(y)
        base = 2.0 / (n + 1.0)
        for i in range(1, len(vals)):
            x = vals[i]
            d = abs(x - vals[i - 1])
            adapt = min(1.0, max(0.05, base * (1.0 + 5.0 * d / max(1e-9, abs(y)))))
            y = y + adapt * (x - y)
            out.append(y)
        return out
    return _ema(vals, n)


class _NoiseSmoother:
    def __init__(self, *, span: int, noise_filter: str) -> None:
        self.span = int(span)
        self.noise_filter = noise_filter
        self.raw: list[float] = []
        self._fast = noise_filter in {
            "ema",
            "zlema",
            "dema",
            "tema",
            "kalman",
            "laguerre",
            "butterworth",
            "ultimate_smoother",
            "jurik_approx",
        }
        self._ema_a = 2.0 / (max(2, self.span) + 1.0)
        self._ema1: float | None = None
        self._ema2: float | None = None
        self._ema3: float | None = None
        self._zlema_ema: float | None = None
        self._kalman_x: float | None = None
        self._kalman_p = 1.0
        self._lag_l0: float | None = None
        self._lag_l1: float | None = None
        self._lag_l2: float | None = None
        self._lag_l3: float | None = None
        self._z_hist: deque[float] = deque()
        self._jma_y: float | None = None
        self._ss1 = _SuperSmootherStep(max(3, int(self.span * 0.8)))
        self._ss2 = _SuperSmootherStep(max(3, self.span))
        self._gauss = _GaussianStep(self.span)

    def push(self, x: float) -> float:
        xv = float(x)
        self.raw.append(xv)
        f = self.noise_filter
        if not self._fast and f != "gaussian":
            y = _apply_noise(self.raw, self.span, self.noise_filter)[-1]
            return y if _is_finite(y) else self.raw[-1]
        if f == "ema":
            if self._ema1 is None:
                self._ema1 = xv
            else:
                self._ema1 = self._ema1 + self._ema_a * (xv - self._ema1)
            return self._ema1
        if f == "zlema":
            lag = max(1, (max(2, self.span) - 1) // 2)
            self._z_hist.append(xv)
            x_lag = self._z_hist[-(lag + 1)] if len(self._z_hist) > lag else self._z_hist[0]
            z = xv + (xv - x_lag)
            if self._zlema_ema is None:
                self._zlema_ema = z
            else:
                self._zlema_ema = self._zlema_ema + self._ema_a * (z - self._zlema_ema)
            return self._zlema_ema
        if f in {"dema", "tema"}:
            if self._ema1 is None:
                self._ema1 = xv
                self._ema2 = xv
                self._ema3 = xv
            else:
                self._ema1 = self._ema1 + self._ema_a * (xv - self._ema1)
                self._ema2 = self._ema2 + self._ema_a * (self._ema1 - self._ema2)  # type: ignore[operator]
                self._ema3 = self._ema3 + self._ema_a * (self._ema2 - self._ema3)  # type: ignore[operator]
            if f == "dema":
                return 2.0 * self._ema1 - self._ema2  # type: ignore[operator]
            return 3.0 * self._ema1 - 3.0 * self._ema2 + self._ema3  # type: ignore[operator]
        if f == "kalman":
            if self._kalman_x is None:
                self._kalman_x = xv
            q = 0.01 / max(2, self.span)
            r = 0.1
            self._kalman_p += q
            k = self._kalman_p / (self._kalman_p + r)
            self._kalman_x = self._kalman_x + k * (xv - self._kalman_x)
            self._kalman_p = (1.0 - k) * self._kalman_p
            return self._kalman_x
        if f == "laguerre":
            if self._lag_l0 is None:
                self._lag_l0 = xv
                self._lag_l1 = xv
                self._lag_l2 = xv
                self._lag_l3 = xv
            g = max(0.1, min(0.9, 1.0 - 2.0 / (max(2, self.span) + 1.0)))
            l0n = (1.0 - g) * xv + g * self._lag_l0
            l1n = -g * l0n + self._lag_l0 + g * self._lag_l1
            l2n = -g * l1n + self._lag_l1 + g * self._lag_l2
            l3n = -g * l2n + self._lag_l2 + g * self._lag_l3
            self._lag_l0, self._lag_l1, self._lag_l2, self._lag_l3 = l0n, l1n, l2n, l3n
            return (l0n + 2.0 * l1n + 2.0 * l2n + l3n) / 6.0
        if f == "butterworth":
            return self._ss2.push(xv)
        if f == "ultimate_smoother":
            return self._ss2.push(self._ss1.push(xv))
        if f == "jurik_approx":
            if self._jma_y is None:
                self._jma_y = xv
                return xv
            base = 2.0 / (max(2, self.span) + 1.0)
            prev = self.raw[-2] if len(self.raw) >= 2 else xv
            d = abs(xv - prev)
            adapt = min(1.0, max(0.05, base * (1.0 + 5.0 * d / max(1e-9, abs(self._jma_y)))))
            self._jma_y = self._jma_y + adapt * (xv - self._jma_y)
            return self._jma_y
        if f == "gaussian":
            return self._gauss.push(xv)
        y = _apply_noise(self.raw, self.span, self.noise_filter)[-1]
        return y if _is_finite(y) else self.raw[-1]


class _SuperSmootherStep:
    def __init__(self, period: int) -> None:
        p = max(3, int(period))
        a1 = exp((-1.414 * pi) / p)
        b1 = 2.0 * a1 * cos((1.414 * pi) / p)
        self.c2 = b1
        self.c3 = -(a1 * a1)
        self.c1 = 1.0 - self.c2 - self.c3
        self._x: list[float] = []
        self._y: list[float] = []

    def push(self, x: float) -> float:
        self._x.append(float(x))
        i = len(self._x) - 1
        if i < 2:
            y = self._x[i]
        else:
            y = self.c1 * (self._x[i] + self._x[i - 1]) * 0.5 + self.c2 * self._y[i - 1] + self.c3 * self._y[i - 2]
        self._y.append(y)
        return y


class _GaussianStep:
    """Incremental trailing Gaussian smoother (causal, no future lookahead)."""

    def __init__(self, span: int) -> None:
        n = max(2, int(span))
        self.w = max(3, n | 1)
        sigma = n / 3.0
        k = [exp(-(lag * lag) / (2.0 * sigma * sigma)) for lag in range(self.w)]
        s = sum(k) if k else 1.0
        self.kernel = [x / s for x in k]
        self.values: list[float] = []

    def push(self, x: float) -> float:
        self.values.append(float(x))
        i = len(self.values) - 1
        acc = 0.0
        ws = 0.0
        for lag in range(self.w):
            idx = i - lag
            if idx < 0:
                break
            kw = self.kernel[lag]
            acc += self.values[idx] * kw
            ws += kw
        return acc / ws if ws > 0 else self.values[i]


def _avg_slope3(values: list[float], i: int) -> float | None:
    if i < 3:
        return None
    return (values[i] - values[i - 1] + (values[i - 1] - values[i - 2]) + (values[i - 2] - values[i - 3])) / 3.0


def _sustained_tangent(values: list[float], times_ms: list[int], sustained_ms: int, want_negative: bool) -> bool:
    # Exact port semantics from web/src/utils/discreteTangentExtrema.ts.
    if not values or not times_ms:
        return False
    i = len(values) - 1
    t_end = times_ms[i]
    t_start = t_end - sustained_ms
    first = i
    while first > 0 and times_ms[first - 1] >= t_start:
        first -= 1
    k0 = max(first, 3)
    # JS uses undefined -> NaN here when k0 out of range; comparison becomes false.
    if k0 < len(times_ms) and t_end - times_ms[k0] < sustained_ms:
        return False
    for k in range(k0, i + 1):
        s = _avg_slope3(values, k)
        if s is None:
            return False
        if want_negative:
            if s >= -_SLOPE_EPS:
                return False
        else:
            if s <= _SLOPE_EPS:
                return False
    return True


class _SideDetector:
    """Exact per-tick port of analysis extrema + alternating filter."""

    def __init__(
        self,
        *,
        span: int,
        noise_filter: str,
        structural_hysteresis: float,
        sustained_tangent_ms: int,
        max_valley_ask_exclusive: float,
        cooldown_ms: int = 1_000,
        golden_peak_fallback_ms: int = 30_000,
        valley_to_peak_min_cents: float = 10.0,
        alternating_min_gap_ms: int = 1_000,
        anchor_to_quote_series: bool = True,
    ) -> None:
        self.smoother = _NoiseSmoother(span=span, noise_filter=noise_filter)
        self.h = float(structural_hysteresis)
        self.sustained = int(sustained_tangent_ms)
        self.max_valley_ask_exclusive = float(max_valley_ask_exclusive)
        self.cooldown = int(cooldown_ms)
        self.fallback_ms = int(golden_peak_fallback_ms)
        self.v2p_min = float(valley_to_peak_min_cents)
        self.alt_gap_ms = int(alternating_min_gap_ms)
        self.anchor_to_quote_series = bool(anchor_to_quote_series)
        self.p2v_min = 0.0  # analysis default "peak->valley off"
        self.times: list[int] = []
        self.smooth: list[float] = []
        self.ask_hist: list[float] = []
        self.bid_hist: list[float] = []
        self.mode = "SEARCH_VALLEY"
        self.local_extrema = float("inf")
        self.last_signal_ms = -10**18
        self.post_valley_bar_idx: int | None = None
        self.post_valley_deadline_ms: int | None = None
        self.fallback_peak_best_idx: int | None = None
        self.fallback_peak_best_price: float | None = None
        self.valley_best_idx: int | None = None
        self.valley_best_ask: float | None = None
        self.acc_kind: str | None = None
        self.acc_idx: int | None = None
        self.acc_ask: float | None = None
        self.last_emitted_kind: str | None = None
        self.last_emitted_idx: int | None = None

    def update(self, *, ts_ms: int, ask: float, bid: float) -> str | None:
        self.last_emitted_kind = None
        self.last_emitted_idx = None
        sm = self.smoother.push(ask)
        self.times.append(int(ts_ms))
        self.smooth.append(float(sm))
        self.ask_hist.append(float(ask))
        self.bid_hist.append(float(bid))
        i = len(self.smooth) - 1
        price = self.smooth[i]
        t = self.times[i]
        candidate_kind: str | None = None
        candidate_idx: int | None = None

        if self.mode == "SEARCH_VALLEY":
            if price < self.local_extrema:
                self.local_extrema = price
            ask_eligible = ask < self.max_valley_ask_exclusive
            if ask_eligible and (self.valley_best_ask is None or ask < self.valley_best_ask):
                self.valley_best_ask = ask
                self.valley_best_idx = i
            cooldown_ok = t - self.last_signal_ms >= self.cooldown
            tangent_ok = _sustained_tangent(self.smooth, self.times, self.sustained, want_negative=False)
            hysteresis_ok = self.local_extrema != float("inf") and price > self.local_extrema + self.h
            valley_ask_ok = ask < self.max_valley_ask_exclusive
            if cooldown_ok and tangent_ok and hysteresis_ok and valley_ask_ok:
                candidate_kind = "valley"
                candidate_idx = (self.valley_best_idx if self.valley_best_idx is not None else i) if self.anchor_to_quote_series else i
                self.mode = "SEARCH_PEAK"
                self.local_extrema = price
                self.last_signal_ms = t
                self.valley_best_idx = None
                self.valley_best_ask = None
                if self.fallback_ms > 0:
                    self.post_valley_bar_idx = candidate_idx
                    self.post_valley_deadline_ms = t + self.fallback_ms
                    self.fallback_peak_best_idx = None
                    self.fallback_peak_best_price = None
                else:
                    self.post_valley_bar_idx = None
                    self.post_valley_deadline_ms = None
                    self.fallback_peak_best_idx = None
                    self.fallback_peak_best_price = None
        else:
            if price > self.local_extrema:
                self.local_extrema = price
            if self.post_valley_bar_idx is not None and i > self.post_valley_bar_idx:
                peak_score = bid
                if self.fallback_peak_best_price is None or peak_score > self.fallback_peak_best_price:
                    self.fallback_peak_best_price = peak_score
                    self.fallback_peak_best_idx = i
            cooldown_ok = t - self.last_signal_ms >= self.cooldown
            tangent_ok = _sustained_tangent(self.smooth, self.times, self.sustained, want_negative=True)
            hysteresis_ok = price < self.local_extrema - self.h
            if cooldown_ok and tangent_ok and hysteresis_ok:
                candidate_kind = "peak"
                candidate_idx = (
                    self.fallback_peak_best_idx if self.fallback_peak_best_idx is not None else i
                ) if self.anchor_to_quote_series else i
                self.mode = "SEARCH_VALLEY"
                self.local_extrema = price
                self.last_signal_ms = t
                self.post_valley_bar_idx = None
                self.post_valley_deadline_ms = None
                self.fallback_peak_best_idx = None
                self.fallback_peak_best_price = None
            elif (
                self.fallback_ms > 0
                and self.post_valley_deadline_ms is not None
                and t >= self.post_valley_deadline_ms
                and self.fallback_peak_best_idx is not None
                and cooldown_ok
            ):
                candidate_kind = "peak"
                candidate_idx = self.fallback_peak_best_idx if self.anchor_to_quote_series else i
                pbest = self.smooth[self.fallback_peak_best_idx]
                self.mode = "SEARCH_VALLEY"
                self.local_extrema = pbest if _is_finite(pbest) else price
                self.last_signal_ms = t
                self.post_valley_bar_idx = None
                self.post_valley_deadline_ms = None
                self.fallback_peak_best_idx = None
                self.fallback_peak_best_price = None
        return self._accept_candidate(candidate_kind, candidate_idx)

    def _accept_candidate(self, kind: str | None, idx: int | None) -> str | None:
        if kind is None or idx is None:
            return None
        ask = self.ask_hist[idx]
        t = self.times[idx]
        if self.acc_kind is None:
            if kind != "valley":
                return None
            self.acc_kind, self.acc_idx, self.acc_ask = "valley", idx, ask
            self.last_emitted_kind = "valley"
            self.last_emitted_idx = idx
            return "valley"
        if kind == self.acc_kind:
            return None
        if self.alt_gap_ms > 0 and self.acc_idx is not None:
            if t - self.times[self.acc_idx] < self.alt_gap_ms:
                return None
        if kind == "peak" and self.acc_kind == "valley":
            peak_bid = self.bid_hist[idx]
            passed = self.v2p_min <= 0 or (self.acc_ask is not None and peak_bid - self.acc_ask >= self.v2p_min)
            if not passed:
                return None
            self.acc_kind, self.acc_idx, self.acc_ask = "peak", idx, ask
            self.last_emitted_kind = "peak"
            self.last_emitted_idx = idx
            return "peak"
        if kind == "valley" and self.acc_kind == "peak":
            passed = self.p2v_min <= 0 or (self.acc_ask is not None and self.acc_ask - ask >= self.p2v_min)
            if not passed:
                return None
            self.acc_kind, self.acc_idx, self.acc_ask = "valley", idx, ask
            self.last_emitted_kind = "valley"
            self.last_emitted_idx = idx
            return "valley"
        return None


class MikeV1Strategy(Strategy):
    """
    Quote-only spread-anchored extrema strategy from the analysis config.

    BTC signals are intentionally ignored in this version.
    Buy on accepted valley, sell on accepted peak.

    YES/NO detectors reset at each UTC 5m boundary so extrema match the analysis modal (per-window
    discrete tangent + alternating filter), not a single growing series across rounds.
    """

    def __init__(
        self,
        *,
        span: int = 20,
        noise_filter: str = "gaussian",
        order_qty: float = 20.0,
        quote_structural_hysteresis_cents: float = 5.0,
        sustained_tangent_ms: int = 1000,
        valley_max_raw_ask_cents: float = 48.0,
        valley_to_peak_raw_spread_min_cents: float = 5.0,
        extrema_location_mode: str = "spread_anchored",
        winddown_last_ms: int = 10000,
        debug_trace: bool = False,
        max_debug_events: int = 20_000,
        **extras: object,
    ) -> None:
        _ = extras
        nf = str(noise_filter).strip().lower()
        if nf not in _NOISE_FILTERS:
            raise ValueError(f"noise_filter must be one of {sorted(_NOISE_FILTERS)}")
        if order_qty <= 0:
            raise ValueError("order_qty must be > 0")
        if winddown_last_ms <= 0 or winddown_last_ms >= _WINDOW_MS:
            raise ValueError("winddown_last_ms must be in (0, 300000)")
        location_mode = str(extrema_location_mode).strip().lower()
        if location_mode not in {"spread_anchored", "classic"}:
            raise ValueError("extrema_location_mode must be one of ['spread_anchored', 'classic']")
        self.order_qty = float(order_qty)
        self.winddown_last_ms = int(winddown_last_ms)
        self._debug_trace = bool(debug_trace)
        self._max_debug_events = max(0, int(max_debug_events))
        self._debug_events: list[dict[str, object]] = []

        # Rebuild detectors each UTC 5m round (same as analysis modal: extrema on a fresh window, no carry-over).
        self._det_span = int(span)
        self._det_noise_filter = nf
        self._det_quote_hyst = float(quote_structural_hysteresis_cents)
        self._det_sustained_ms = int(sustained_tangent_ms)
        self._det_valley_ask_max = float(valley_max_raw_ask_cents)
        self._det_v2p_min = float(valley_to_peak_raw_spread_min_cents)
        self._det_anchor_to_quote = location_mode == "spread_anchored"

        self._yes = self._new_side_detector()
        self._no = self._new_side_detector()
        self._round_start_ms: int | None = None
        self._winddown_done_yes = False
        self._winddown_done_no = False

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def _append_debug(self, row: dict[str, object]) -> None:
        if self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        self._debug_events.append(row)

    def _trace(self, row: dict[str, object]) -> None:
        if not self._debug_trace:
            return
        self._append_debug(row)

    def _new_side_detector(self) -> _SideDetector:
        return _SideDetector(
            span=self._det_span,
            noise_filter=self._det_noise_filter,
            structural_hysteresis=self._det_quote_hyst,
            sustained_tangent_ms=self._det_sustained_ms,
            max_valley_ask_exclusive=self._det_valley_ask_max,
            valley_to_peak_min_cents=self._det_v2p_min,
            anchor_to_quote_series=self._det_anchor_to_quote,
        )

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._debug_events = []
        self._yes = self._new_side_detector()
        self._no = self._new_side_detector()
        self._round_start_ms = None
        self._winddown_done_yes = False
        self._winddown_done_no = False

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        ts = int(event.timestamp_ms)
        round_start = ts - (ts % _WINDOW_MS)
        if self._round_start_ms != round_start:
            if self._round_start_ms is not None:
                self._yes = self._new_side_detector()
                self._no = self._new_side_detector()
            self._round_start_ms = round_start
            self._winddown_done_yes = False
            self._winddown_done_no = False
        elapsed = ts - round_start

        self._handle_side(TokenSide.YES, self._yes, event, ctx, elapsed)
        self._handle_side(TokenSide.NO, self._no, event, ctx, elapsed)

        if elapsed >= _WINDOW_MS - self.winddown_last_ms:
            self._winddown(ctx)

    def _handle_side(self, side: TokenSide, det: _SideDetector, event: TickEvent, ctx: RunContext, elapsed: int) -> None:
        if elapsed >= _WINDOW_MS - self.winddown_last_ms:
            return
        st = to_signal_tick(event)
        ask = st.ask_cents(side)
        bid = st.bid_cents(side)
        sig = det.update(ts_ms=int(event.timestamp_ms), ask=ask, bid=bid)
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "detector_tick",
                "strategy": "mike_v1",
                "side": side.value,
                "ask_cents": float(ask),
                "bid_cents": float(bid),
                "sig": sig,
                "mode": det.mode,
                "emitted_idx": det.last_emitted_idx,
                "emitted_ts_ms": det.times[det.last_emitted_idx] if det.last_emitted_idx is not None else None,
            }
        )
        qty = position_qty(ctx, side)
        if sig == "valley" and qty <= 1e-12:
            self._append_debug(
                {
                    "ts_ms": int(event.timestamp_ms),
                    "phase": "accepted_extrema",
                    "strategy": "mike_v1",
                    "side": side.value,
                    "kind": "valley",
                    "position_qty_before": float(qty),
                    "emitted_idx": det.last_emitted_idx,
                    "emitted_ts_ms": det.times[det.last_emitted_idx] if det.last_emitted_idx is not None else None,
                }
            )
            self._open(ctx, side, reason="mike_v1_valley")
        elif sig == "peak" and qty > 1e-12:
            self._append_debug(
                {
                    "ts_ms": int(event.timestamp_ms),
                    "phase": "accepted_extrema",
                    "strategy": "mike_v1",
                    "side": side.value,
                    "kind": "peak",
                    "position_qty_before": float(qty),
                    "emitted_idx": det.last_emitted_idx,
                    "emitted_ts_ms": det.times[det.last_emitted_idx] if det.last_emitted_idx is not None else None,
                }
            )
            self._close(ctx, side, qty, reason="mike_v1_peak")

    def _open(self, ctx: RunContext, side: TokenSide, *, reason: str) -> None:
        _ = StrategyActions(ctx).buy_qty(side, self.order_qty, reason=reason)

    def _close(self, ctx: RunContext, side: TokenSide, qty: float, *, reason: str) -> None:
        _ = StrategyActions(ctx).sell_qty(side, qty, reason=reason)

    def _winddown(self, ctx: RunContext) -> None:
        qy = position_qty(ctx, TokenSide.YES)
        if qy > 1e-12 and not self._winddown_done_yes:
            self._close(ctx, TokenSide.YES, qy, reason="mike_v1_winddown")
            self._winddown_done_yes = True
        qn = position_qty(ctx, TokenSide.NO)
        if qn > 1e-12 and not self._winddown_done_no:
            self._close(ctx, TokenSide.NO, qn, reason="mike_v1_winddown")
            self._winddown_done_no = True
