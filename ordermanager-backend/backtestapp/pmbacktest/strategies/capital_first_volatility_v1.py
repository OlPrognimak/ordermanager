"""Capital-first 5m volatility cycle: discount entries, principal extraction, runner TP.

Maps the user's three-phase spec onto :mod:`pmbacktest` (simulated limits via bid/ask checks):

- **Phase 1 (0–90s):** virtual limit buys on YES and NO at ~40¢ (band 38–41¢ on ask), ``0.5·R`` USD per side.
- **Phase 2 (90s–210s):** when best bid is in the reversal band (default 55–60¢), close **70%** of that leg once
  (table spec; parameter ``recover_fraction`` — some writeups use 75%).
- **Phase 3 (210s–300s):** no new buys; close remainder when bid ≥ **98¢**; at **4:50** dust-sell legs with mid < **5¢**.

**Anti-ruin:** optional BTC **coefficient-of-variation** gate on ``event.price`` over the round (needs chop); no chasing
beyond phase-1 limits (entries only in phase 1).

``R`` defaults to ``risk_frac_of_cash * ctx.cash()`` snapshotted at the first tick of each UTC 5m round.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy

FIVE_MIN_MS = 5 * 60 * 1000

PHASE1_END_MS = 90_000
PHASE2_END_MS = 210_000  # 3:30
DUST_CLEANUP_MS = 290_000  # 4:50


def _get_extra(event: TickEvent) -> dict[str, Any]:
    d = getattr(event, "data", None)
    return d if isinstance(d, dict) else {}


def _mid_cents(event: TickEvent, side: TokenSide) -> float:
    return float(event.yes if side == TokenSide.YES else event.no)


def _ask_cents(event: TickEvent, side: TokenSide) -> float:
    d = _get_extra(event)
    key = "up_best_ask" if side == TokenSide.YES else "down_best_ask"
    q = d.get(key)
    if isinstance(q, (int, float)):
        qf = float(q)
        if qf == qf:
            return qf
    return _mid_cents(event, side)


def _bid_cents(event: TickEvent, side: TokenSide) -> float:
    d = _get_extra(event)
    key = "up_best_bid" if side == TokenSide.YES else "down_best_bid"
    q = d.get(key)
    if isinstance(q, (int, float)):
        qf = float(q)
        if qf == qf:
            return qf
    return _mid_cents(event, side)


def _pos_qty(ctx: RunContext, side: TokenSide) -> float:
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


def _open_action(side: TokenSide) -> OrderAction:
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _close_action(side: TokenSide) -> OrderAction:
    return OrderAction.CLOSE_YES if side == TokenSide.YES else OrderAction.CLOSE_NO


def _shares_for_usd(bet_usd: float, price_cents: float) -> float:
    px = float(price_cents) / 100.0
    if bet_usd <= 0 or px <= 1e-12:
        return 0.0
    return bet_usd / px


def _mean(xs: list[float]) -> float:
    if not xs:
        return 0.0
    return sum(xs) / len(xs)


def _pop_stdev(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    v = sum((x - m) ** 2 for x in xs) / len(xs)
    return v**0.5


@dataclass
class _RoundState:
    start_ms: int
    r_usd: float | None = None
    btc_prices: list[float] = field(default_factory=list)
    vol_gate_ok: bool = True
    vol_evaluated: bool = False
    yes_extracted: bool = False
    no_extracted: bool = False
    last_submit_ts_ms: int | None = None


class CapitalFirstVolatilityV1Strategy(Strategy):
    """
    Parameters (JSON kwargs):

        risk_frac_of_cash: fraction of cash used as ``R`` (default 0.05 = 5%).
        max_r_usd: optional hard cap on ``R``.
        slot_frac: fraction of ``R`` per side in phase 1 (default 0.5).
        entry_band_low_cents / entry_band_high_cents: ask must sit in this band to buy (default 38–41).
        entry_limit_cents: max ask for fill (default 40).
        extract_bid_min_cents / extract_bid_max_cents: phase-2 exit band on **bid** (default 55–60).
        recover_fraction: fraction of inventory to sell in phase 2 (default 0.70; some docs use 0.75).
        runner_tp_cents: phase-3 take-profit on **bid** (default 98).
        dust_mid_cents: at 4:50, close leg if mid below this (default 5).
        use_btc_vol_gate: enable correlation brake (default True).
        vol_min_samples: min BTC price samples before evaluating CV (default 12).
        min_btc_coefficient_of_variation: if std/mean of BTC ``price`` in-round is below this, skip the round (default 0.00015).
        max_bet_usd_per_round: safety cap on total phase-1 notional (approx).
        debug_trace / max_debug_events: optional telemetry rows for the UI.
    """

    def __init__(
        self,
        *,
        risk_frac_of_cash: float = 0.05,
        max_r_usd: float | None = None,
        slot_frac: float = 0.5,
        entry_band_low_cents: float = 38.0,
        entry_band_high_cents: float = 41.0,
        entry_limit_cents: float = 40.0,
        extract_bid_min_cents: float = 55.0,
        extract_bid_max_cents: float = 60.0,
        recover_fraction: float = 0.70,
        runner_tp_cents: float = 98.0,
        dust_mid_cents: float = 5.0,
        use_btc_vol_gate: bool = True,
        vol_min_samples: int = 12,
        min_btc_coefficient_of_variation: float = 0.00015,
        max_bet_usd_per_round: float = 50_000.0,
        debug_trace: bool = True,
        max_debug_events: int = 12_000,
        **extras: object,
    ) -> None:
        _ = extras
        if not (0 < risk_frac_of_cash <= 1.0):
            raise ValueError("risk_frac_of_cash must be in (0, 1]")
        if slot_frac <= 0 or slot_frac > 1.0:
            raise ValueError("slot_frac must be in (0, 1]")
        if not (0 < entry_band_low_cents <= entry_limit_cents <= entry_band_high_cents < 100):
            raise ValueError("entry band / limit cents must be ordered and in (0, 100)")
        if not (0 < extract_bid_min_cents <= extract_bid_max_cents < 100):
            raise ValueError("extract bid band invalid")
        if not (0.0 < recover_fraction < 1.0):
            raise ValueError("recover_fraction must be in (0, 1)")
        self.risk_frac_of_cash = float(risk_frac_of_cash)
        self.max_r_usd = float(max_r_usd) if max_r_usd is not None else None
        self.slot_frac = float(slot_frac)
        self.entry_band_low_cents = float(entry_band_low_cents)
        self.entry_band_high_cents = float(entry_band_high_cents)
        self.entry_limit_cents = float(entry_limit_cents)
        self.extract_bid_min_cents = float(extract_bid_min_cents)
        self.extract_bid_max_cents = float(extract_bid_max_cents)
        self.recover_fraction = float(recover_fraction)
        self.runner_tp_cents = float(runner_tp_cents)
        self.dust_mid_cents = float(dust_mid_cents)
        self.use_btc_vol_gate = bool(use_btc_vol_gate)
        self.vol_min_samples = max(2, int(vol_min_samples))
        self.min_btc_coefficient_of_variation = float(min_btc_coefficient_of_variation)
        self.max_bet_usd_per_round = float(max_bet_usd_per_round)
        self._debug_trace = bool(debug_trace)
        self._max_debug_events = max(0, int(max_debug_events))
        self._debug_events: list[dict[str, object]] = []
        self._round: _RoundState | None = None
        self._spent_phase1_usd: float = 0.0

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._round = None
        self._spent_phase1_usd = 0.0
        self._debug_events = []

    def _trace(self, row: dict[str, object]) -> None:
        if not self._debug_trace or self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        self._debug_events.append(row)

    def _ensure_round(self, event: TickEvent, ctx: RunContext) -> _RoundState:
        rs = utc_five_minute_round_start_ms(int(event.timestamp_ms))
        if self._round is None or self._round.start_ms != rs:
            self._round = _RoundState(start_ms=rs)
            self._spent_phase1_usd = 0.0
        st = self._round
        if st.r_usd is None:
            r = float(ctx.cash()) * self.risk_frac_of_cash
            if self.max_r_usd is not None:
                r = min(r, self.max_r_usd)
            st.r_usd = max(1e-6, r)
        return st

    def _update_vol_gate(self, st: _RoundState, elapsed: int) -> None:
        if not self.use_btc_vol_gate:
            st.vol_gate_ok = True
            st.vol_evaluated = True
            return
        if st.vol_evaluated:
            return
        px = st.btc_prices
        if len(px) < self.vol_min_samples:
            if elapsed >= PHASE1_END_MS:
                st.vol_evaluated = True
                self._trace({"phase": "vol_gate", "skipped": "few_samples", "n": len(px), "pass": True})
            return
        m = _mean(px)
        sd = _pop_stdev(px)
        cv = sd / m if m > 1e-12 else 0.0
        if cv < self.min_btc_coefficient_of_variation:
            st.vol_gate_ok = False
            st.vol_evaluated = True
            self._trace(
                {
                    "phase": "vol_gate",
                    "cv": float(cv),
                    "threshold": float(self.min_btc_coefficient_of_variation),
                    "pass": False,
                    "samples": len(px),
                }
            )
        elif elapsed >= PHASE1_END_MS:
            st.vol_evaluated = True
            self._trace(
                {
                    "phase": "vol_gate",
                    "cv": float(cv),
                    "threshold": float(self.min_btc_coefficient_of_variation),
                    "pass": True,
                    "samples": len(px),
                }
            )

    def _can_submit(self, st: _RoundState, event: TickEvent) -> bool:
        if st.last_submit_ts_ms is not None and st.last_submit_ts_ms == int(event.timestamp_ms):
            return False
        return True

    def _submit_open(
        self,
        st: _RoundState,
        event: TickEvent,
        ctx: RunContext,
        *,
        side: TokenSide,
        bet_usd: float,
        price_cents: float,
        reason: str,
    ) -> bool:
        if bet_usd <= 1e-12 or not self._can_submit(st, event):
            return False
        if self._spent_phase1_usd + bet_usd > self.max_bet_usd_per_round + 1e-9:
            return False
        shares = _shares_for_usd(bet_usd, price_cents)
        if shares <= 1e-12:
            return False
        if ctx.max_position_shares_per_side is not None:
            cur = _pos_qty(ctx, side)
            cap = float(ctx.max_position_shares_per_side)
            if cur >= cap - 1e-12:
                return False
            shares = min(shares, max(0.0, cap - cur))
            if shares <= 1e-12:
                return False
        intent = OrderIntent(
            action=_open_action(side),
            quantity=shares,
            metadata={"bet_usd_amount": min(bet_usd, self.max_bet_usd_per_round), "reason": reason},
        )
        try:
            ctx.submit_order(intent)
        except ValueError:
            self._trace({"ts_ms": event.timestamp_ms, "phase": "open_reject", "reason": reason})
            return False
        self._spent_phase1_usd += shares * (price_cents / 100.0)
        st.last_submit_ts_ms = int(event.timestamp_ms)
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "open",
                "reason": reason,
                "side": side.value,
                "bet_usd": float(bet_usd),
            }
        )
        return True

    def _submit_close(
        self,
        st: _RoundState,
        event: TickEvent,
        ctx: RunContext,
        *,
        side: TokenSide,
        qty: float,
        reason: str,
    ) -> bool:
        if qty <= 1e-12 or not self._can_submit(st, event):
            return False
        cur = _pos_qty(ctx, side)
        q = min(float(qty), cur)
        if q <= 1e-12:
            return False
        intent = OrderIntent(
            action=_close_action(side),
            quantity=q,
            metadata={"reason": reason},
        )
        try:
            ctx.submit_order(intent)
        except ValueError:
            self._trace({"ts_ms": event.timestamp_ms, "phase": "close_reject", "reason": reason})
            return False
        st.last_submit_ts_ms = int(event.timestamp_ms)
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "close",
                "reason": reason,
                "side": side.value,
                "qty": q,
            }
        )
        return True

    def _phase1(self, st: _RoundState, event: TickEvent, ctx: RunContext, elapsed: int) -> None:
        if elapsed >= PHASE1_END_MS or st.r_usd is None:
            return
        if not st.vol_gate_ok and st.vol_evaluated:
            return
        slot = st.r_usd * self.slot_frac
        for side in (TokenSide.YES, TokenSide.NO):
            ask = _ask_cents(event, side)
            if ask < self.entry_band_low_cents - 1e-9:
                continue
            if ask > min(self.entry_limit_cents, self.entry_band_high_cents) + 1e-9:
                continue
            self._submit_open(
                st,
                event,
                ctx,
                side=side,
                bet_usd=slot,
                price_cents=ask,
                reason="p1_discount_limit",
            )
            break

    def _phase2_extract(self, st: _RoundState, event: TickEvent, ctx: RunContext, elapsed: int) -> None:
        if elapsed < PHASE1_END_MS or elapsed >= PHASE2_END_MS:
            return
        for side, extracted in (
            (TokenSide.YES, st.yes_extracted),
            (TokenSide.NO, st.no_extracted),
        ):
            if extracted:
                continue
            q = _pos_qty(ctx, side)
            if q <= 1e-12:
                continue
            bid = _bid_cents(event, side)
            if bid + 1e-9 < self.extract_bid_min_cents:
                continue
            if bid > self.extract_bid_max_cents + 1e-9:
                continue
            sell_qty = q * self.recover_fraction
            if self._submit_close(st, event, ctx, side=side, qty=sell_qty, reason="p2_extract_principal"):
                if side == TokenSide.YES:
                    st.yes_extracted = True
                else:
                    st.no_extracted = True

    def _phase3_runner(self, st: _RoundState, event: TickEvent, ctx: RunContext, elapsed: int) -> None:
        if elapsed < PHASE2_END_MS:
            return
        for side in (TokenSide.YES, TokenSide.NO):
            q = _pos_qty(ctx, side)
            if q <= 1e-12:
                continue
            bid = _bid_cents(event, side)
            if bid + 1e-9 >= self.runner_tp_cents:
                if self._submit_close(st, event, ctx, side=side, qty=q, reason="p3_runner_tp_98"):
                    break

    def _dust(self, st: _RoundState, event: TickEvent, ctx: RunContext, elapsed: int) -> None:
        if elapsed < DUST_CLEANUP_MS:
            return
        for side in (TokenSide.YES, TokenSide.NO):
            q = _pos_qty(ctx, side)
            if q <= 1e-12:
                continue
            mid = _mid_cents(event, side)
            if mid < self.dust_mid_cents - 1e-9:
                if self._submit_close(st, event, ctx, side=side, qty=q, reason="dust_cleanup_450"):
                    break

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        st = self._ensure_round(event, ctx)
        elapsed = int(event.timestamp_ms) - st.start_ms
        if elapsed < 0:
            elapsed = 0

        p = float(event.price)
        if p == p and p > 0:
            st.btc_prices.append(p)

        self._update_vol_gate(st, elapsed)

        self._dust(st, event, ctx, elapsed)
        self._phase3_runner(st, event, ctx, elapsed)
        self._phase2_extract(st, event, ctx, elapsed)
        self._phase1(st, event, ctx, elapsed)

        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "tick",
                "elapsed_ms": elapsed,
                "r_usd": float(st.r_usd or 0.0),
                "vol_ok": st.vol_gate_ok,
                "yes": _mid_cents(event, TokenSide.YES),
                "no": _mid_cents(event, TokenSide.NO),
            }
        )

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        _ = ctx
