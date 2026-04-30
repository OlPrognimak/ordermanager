"""Polymarket 5-minute hybrid alpha (liquidity trap + ML gateway + volatility grid).

This maps the user's phase spec onto :mod:`pmbacktest`'s execution model:

- **No native limit order book.** Resting bids/offers are simulated: we only call
  ``submit_order(OPEN_*)`` when the current best ask (tick extras) is at or below
  the virtual limit, and ``submit_order(CLOSE_*)`` when best bid is at or above
  the virtual take-profit (else mid fallback).

- **ML signal** must appear on ticks (e.g. Mongo join) as
  ``direction_pred`` / ``confidence`` in ``TickEvent.data`` — same convention as
  :class:`HybridDeepseekV1Strategy`.

- **Phase 4 (last 12s):** virtual bids/asks and grid take-profits are disabled; grid
  inventory is flattened with market closes; high-confidence trend inventory is held
  for settlement (no forced exit).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderIntent, OrderRecord, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy

FIVE_MIN_MS = 5 * 60 * 1000


def _clamp(x: float, lo: float, hi: float) -> float:
    return lo if x < lo else hi if x > hi else x


def _get_tick_extra(event: TickEvent) -> dict[str, Any]:
    d = getattr(event, "data", None)
    return d if isinstance(d, dict) else {}


def _read_prediction(event: TickEvent) -> tuple[str | None, float | None]:
    extra = _get_tick_extra(event)
    raw_dir = extra.get("direction_pred", extra.get("direction", extra.get("pred_direction")))
    raw_conf = extra.get("confidence", extra.get("conf", extra.get("pred_confidence")))
    direction = None
    if isinstance(raw_dir, str):
        k = raw_dir.strip().lower()
        if k in {"up", "down"}:
            direction = k
    conf = None
    if isinstance(raw_conf, (int, float)):
        c = float(raw_conf)
        if c == c:
            conf = _clamp(c, 0.0, 1.0)
    return direction, conf


def _side_for_direction(direction: str) -> TokenSide:
    return TokenSide.YES if direction == "up" else TokenSide.NO


def _mid_cents(event: TickEvent, side: TokenSide) -> float:
    return float(event.yes if side == TokenSide.YES else event.no)


def _ask_cents(event: TickEvent, side: TokenSide) -> float:
    d = _get_tick_extra(event)
    key = "up_best_ask" if side == TokenSide.YES else "down_best_ask"
    q = d.get(key)
    if isinstance(q, (int, float)):
        qf = float(q)
        if qf == qf:
            return qf
    return _mid_cents(event, side)


def _bid_cents(event: TickEvent, side: TokenSide) -> float:
    d = _get_tick_extra(event)
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


@dataclass(slots=True)
class _GridSlot:
    buy_limit_cents: float | None = None
    entry_cents: float | None = None
    qty: float = 0.0
    await_fill: bool = False


@dataclass
class _RoundState:
    start_ms: int
    last_submit_ts_ms: int | None = None
    #: None until ML branch resolved
    route: str | None = None
    trend_aborted: bool = False
    trend_buy_done: bool = False
    trend_side: TokenSide | None = None
    grid_active: bool = False
    grid_side: TokenSide | None = None
    slots: list[_GridSlot] = field(default_factory=list)
    # Accounting (per side) — reconciled on fills
    p1_yes: float = 0.0
    p1_no: float = 0.0
    trend_yes: float = 0.0
    trend_no: float = 0.0
    grid_yes: float = 0.0
    grid_no: float = 0.0


class HybridAlpha5mV1Strategy(Strategy):
    """
    Parameters (JSON kwargs) mirror the written spec; times are ms from UTC 5m round start.

    ``risk_unit_usd`` ($R$): phase-1 deep bids use ``phase1_risk_fraction * R`` per token;
    trend leg uses ``trend_risk_mult * R``; grid uses ``grid_risk_mult * R`` split across
    three tranches.
    """

    def __init__(
        self,
        *,
        risk_unit_usd: float = 100.0,
        phase1_risk_fraction: float = 0.10,
        deep_bid_cents: float = 12.0,
        phase1_end_ms: int = 2 * 60_000 + 5_000,
        ml_gate_ms: int = 2 * 60_000 + 10_000,
        ml_deadline_ms: int = 4 * 60_000 + 0,
        phase3_start_ms: int = 2 * 60_000 + 15_000,
        phase3_end_ms: int = 4 * 60_000 + 50_000,
        winddown_remaining_ms: int = 12_000,
        conf_trend: float = 0.77,
        conf_mean_rev: float = 0.65,
        trend_max_entry_cents: float = 85.0,
        trend_tp_cents: float = 95.0,
        trend_risk_mult: float = 1.0,
        grid_risk_mult: float = 1.0,
        grid_cheap_threshold_cents: float = 45.0,
        grid_tp_delta_cents: float = 10.0,
        max_bet_usd_per_round: float = 500.0,
        debug_trace: bool = True,
        max_debug_events: int = 20_000,
        **extras: object,
    ) -> None:
        _ = extras
        if risk_unit_usd <= 0:
            raise ValueError("risk_unit_usd must be > 0")
        if not (0 < conf_mean_rev < conf_trend < 1.0):
            raise ValueError("require 0 < conf_mean_rev < conf_trend < 1")
        if winddown_remaining_ms <= 0 or winddown_remaining_ms >= FIVE_MIN_MS:
            raise ValueError("winddown_remaining_ms must be in (0, 300000)")
        self.risk_unit_usd = float(risk_unit_usd)
        self.phase1_risk_fraction = float(phase1_risk_fraction)
        self.deep_bid_cents = float(deep_bid_cents)
        self.phase1_end_ms = int(phase1_end_ms)
        self.ml_gate_ms = int(ml_gate_ms)
        self.ml_deadline_ms = int(ml_deadline_ms)
        self.phase3_start_ms = int(phase3_start_ms)
        self.phase3_end_ms = int(phase3_end_ms)
        self.winddown_remaining_ms = int(winddown_remaining_ms)
        self.conf_trend = float(conf_trend)
        self.conf_mean_rev = float(conf_mean_rev)
        self.trend_max_entry_cents = float(trend_max_entry_cents)
        self.trend_tp_cents = float(trend_tp_cents)
        self.trend_risk_mult = float(trend_risk_mult)
        self.grid_risk_mult = float(grid_risk_mult)
        self.grid_cheap_threshold_cents = float(grid_cheap_threshold_cents)
        self.grid_tp_delta_cents = float(grid_tp_delta_cents)
        self.max_bet_usd_per_round = float(max_bet_usd_per_round)
        self._debug_trace = bool(debug_trace)
        self._max_debug_events = max(0, int(max_debug_events))
        self._debug_events: list[dict[str, object]] = []
        self._round: _RoundState | None = None
        self._spent_usd_round: float = 0.0

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._round = None
        self._spent_usd_round = 0.0
        self._debug_events = []

    def _winddown_elapsed_threshold_ms(self) -> int:
        return FIVE_MIN_MS - self.winddown_remaining_ms

    def _trace(self, row: dict[str, object]) -> None:
        if not self._debug_trace or self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        self._debug_events.append(row)

    def _ensure_round(self, event: TickEvent) -> _RoundState:
        rs = utc_five_minute_round_start_ms(int(event.timestamp_ms))
        if self._round is None or self._round.start_ms != rs:
            self._round = _RoundState(start_ms=rs, slots=[_GridSlot(), _GridSlot(), _GridSlot()])
            self._spent_usd_round = 0.0
        return self._round

    def _remaining_budget(self) -> float:
        return max(0.0, self.max_bet_usd_per_round - self._spent_usd_round)

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
        book: str,
        reason: str,
        extra_meta: Mapping[str, Any] | None = None,
    ) -> bool:
        if bet_usd <= 0 or not self._can_submit(st, event):
            return False
        if self._remaining_budget() <= 1e-9:
            return False
        bet = min(float(bet_usd), self._remaining_budget())
        shares = _shares_for_usd(bet, price_cents)
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
        meta: dict[str, Any] = {"bet_usd_amount": bet, "reason": reason, "alpha_book": book}
        if extra_meta:
            meta.update(dict(extra_meta))
        intent = OrderIntent(
            action=_open_action(side),
            quantity=shares,
            metadata=meta,
        )
        try:
            ctx.submit_order(intent)
        except ValueError:
            self._trace({"ts_ms": event.timestamp_ms, "phase": "open_reject", "reason": reason, "book": book})
            return False
        self._spent_usd_round += bet
        st.last_submit_ts_ms = int(event.timestamp_ms)
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "open",
                "reason": reason,
                "book": book,
                "side": side.value,
                "bet_usd": bet,
                "qty": shares,
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
        book: str,
        extra_meta: Mapping[str, Any] | None = None,
    ) -> bool:
        if qty <= 1e-12 or not self._can_submit(st, event):
            return False
        cur = _pos_qty(ctx, side)
        q = min(float(qty), cur)
        if q <= 1e-12:
            return False
        meta: dict[str, Any] = {"reason": reason, "alpha_book": book}
        if extra_meta:
            meta.update(dict(extra_meta))
        intent = OrderIntent(
            action=_close_action(side),
            quantity=q,
            metadata=meta,
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
                "book": book,
                "side": side.value,
                "qty": q,
            }
        )
        return True

    def _reset_grid_slots(self, st: _RoundState) -> None:
        for sl in st.slots:
            sl.buy_limit_cents = None
            sl.entry_cents = None
            sl.qty = 0.0
            sl.await_fill = False

    def _apply_fill_ledger(self, fill: Fill) -> None:
        if self._round is None:
            return
        st = self._round
        meta = fill.metadata if isinstance(fill.metadata, dict) else {}
        book = meta.get("alpha_book")
        q = float(fill.quantity)
        entry_c = float(fill.price_per_share) * 100.0
        if fill.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
            side = fill.side
            if book == "p1_yes" and side == TokenSide.YES:
                st.p1_yes += q
            elif book == "p1_no" and side == TokenSide.NO:
                st.p1_no += q
            elif book == "trend":
                if side == TokenSide.YES:
                    st.trend_yes += q
                else:
                    st.trend_no += q
                st.trend_buy_done = True
            elif book == "grid":
                if side == TokenSide.YES:
                    st.grid_yes += q
                else:
                    st.grid_no += q
                idx = meta.get("grid_slot")
                if isinstance(idx, int) and 0 <= idx < len(st.slots):
                    sl = st.slots[idx]
                    sl.await_fill = False
                    sl.qty = q
                    sl.entry_cents = entry_c
                    sl.buy_limit_cents = None
        elif fill.action in (OrderAction.CLOSE_YES, OrderAction.CLOSE_NO):
            side = fill.side
            if book in ("grid_tp", "grid_flat"):
                if side == TokenSide.YES:
                    st.grid_yes = max(0.0, st.grid_yes - q)
                else:
                    st.grid_no = max(0.0, st.grid_no - q)
                idx = meta.get("grid_slot")
                if book == "grid_tp" and isinstance(idx, int) and 0 <= idx < len(st.slots):
                    sl = st.slots[idx]
                    sl.qty = 0.0
                    sl.entry_cents = None
                    sl.buy_limit_cents = None
                    sl.await_fill = False
                elif book == "grid_flat" and st.grid_yes < 1e-12 and st.grid_no < 1e-12:
                    self._reset_grid_slots(st)
            elif book == "trend_tp":
                if side == TokenSide.YES:
                    st.trend_yes = max(0.0, st.trend_yes - q)
                else:
                    st.trend_no = max(0.0, st.trend_no - q)

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        _ = ctx
        self._apply_fill_ledger(fill)

    def on_order_rejected(self, order: OrderRecord, ctx: RunContext) -> None:
        _ = ctx
        if self._round is None:
            return
        st = self._round
        meta = order.metadata if isinstance(order.metadata, dict) else {}
        if meta.get("alpha_book") != "grid":
            return
        idx = meta.get("grid_slot")
        if isinstance(idx, int) and 0 <= idx < len(st.slots):
            st.slots[idx].await_fill = False

    def _resolve_route(self, st: _RoundState, event: TickEvent) -> None:
        elapsed = int(event.timestamp_ms) - st.start_ms
        if st.route is not None:
            return
        if elapsed < self.ml_gate_ms:
            return
        pred_dir, pred_conf = _read_prediction(event)
        if pred_conf is None:
            if elapsed >= self.ml_deadline_ms:
                st.route = "dead"
                self._trace({"ts_ms": event.timestamp_ms, "phase": "ml_deadline", "route": "dead"})
            return
        if pred_conf > self.conf_trend:
            st.route = "trend"
            if pred_dir is None:
                st.trend_aborted = True
            else:
                side = _side_for_direction(pred_dir)
                px = _mid_cents(event, side)
                if px > self.trend_max_entry_cents:
                    st.trend_aborted = True
                    self._trace({"ts_ms": event.timestamp_ms, "phase": "trend_abort_expensive", "px": px})
                else:
                    st.trend_side = side
        elif pred_conf < self.conf_mean_rev:
            st.route = "grid"
            y, n = _mid_cents(event, TokenSide.YES), _mid_cents(event, TokenSide.NO)
            if y < n:
                cheap_side, cheap_px = TokenSide.YES, y
            else:
                cheap_side, cheap_px = TokenSide.NO, n
            if cheap_px < self.grid_cheap_threshold_cents:
                st.grid_active = True
                st.grid_side = cheap_side
            else:
                st.grid_active = False
                self._trace({"ts_ms": event.timestamp_ms, "phase": "grid_skip_not_cheap", "yes": y, "no": n})
        else:
            st.route = "dead"
        self._trace(
            {
                "ts_ms": event.timestamp_ms,
                "phase": "ml_route",
                "route": st.route,
                "grid_active": st.grid_active,
                "pred_conf": pred_conf,
                "pred_dir": pred_dir,
            }
        )

    def _phase1_deep_bids(self, st: _RoundState, event: TickEvent, ctx: RunContext, *, winddown: bool) -> None:
        if winddown:
            return
        cap_usd = self.phase1_risk_fraction * self.risk_unit_usd
        max_shares_y = _shares_for_usd(cap_usd, self.deep_bid_cents)
        rem_shares_y = max(0.0, max_shares_y - st.p1_yes)
        if rem_shares_y > 1e-9 and _ask_cents(event, TokenSide.YES) <= self.deep_bid_cents + 1e-9:
            bet = rem_shares_y * (self.deep_bid_cents / 100.0)
            self._submit_open(
                st,
                event,
                ctx,
                side=TokenSide.YES,
                bet_usd=bet,
                price_cents=_ask_cents(event, TokenSide.YES),
                book="p1_yes",
                reason="p1_deep_bid_yes",
            )

        max_shares_n = _shares_for_usd(cap_usd, self.deep_bid_cents)
        rem_shares_n = max(0.0, max_shares_n - st.p1_no)
        if rem_shares_n > 1e-9 and _ask_cents(event, TokenSide.NO) <= self.deep_bid_cents + 1e-9:
            bet = rem_shares_n * (self.deep_bid_cents / 100.0)
            self._submit_open(
                st,
                event,
                ctx,
                side=TokenSide.NO,
                bet_usd=bet,
                price_cents=_ask_cents(event, TokenSide.NO),
                book="p1_no",
                reason="p1_deep_bid_no",
            )

    def _maybe_trend_entry_and_tp(
        self, st: _RoundState, event: TickEvent, ctx: RunContext, *, winddown: bool
    ) -> None:
        if st.route != "trend" or st.trend_aborted:
            return
        elapsed = int(event.timestamp_ms) - st.start_ms
        if elapsed < self.ml_gate_ms:
            return
        # Last 12s: cancel TP logic; hold high-conviction inventory for settlement.
        if winddown:
            return
        side = st.trend_side
        if side is None:
            return
        ask = _ask_cents(event, side)
        if not st.trend_buy_done:
            if ask <= self.trend_max_entry_cents + 1e-9:
                bet = self.trend_risk_mult * self.risk_unit_usd
                self._submit_open(
                    st,
                    event,
                    ctx,
                    side=side,
                    bet_usd=bet,
                    price_cents=ask,
                    book="trend",
                    reason="trend_entry",
                )
        else:
            self._trend_take_profit(st, event, ctx)

    def _trend_take_profit(self, st: _RoundState, event: TickEvent, ctx: RunContext) -> None:
        for side in (TokenSide.YES, TokenSide.NO):
            tq = st.trend_yes if side == TokenSide.YES else st.trend_no
            if tq <= 1e-12:
                continue
            bid = _bid_cents(event, side)
            if bid + 1e-9 >= self.trend_tp_cents:
                self._submit_close(
                    st,
                    event,
                    ctx,
                    side=side,
                    qty=tq,
                    reason="trend_tp",
                    book="trend_tp",
                )

    def _arm_grid_slots(self, st: _RoundState, event: TickEvent) -> None:
        if st.grid_side is None or st.grid_armed:
            return
        spot = _mid_cents(event, st.grid_side)
        deltas = (0.0, self.grid_tp_delta_cents, 2.0 * self.grid_tp_delta_cents)
        for i, sl in enumerate(st.slots):
            sl.buy_limit_cents = max(1.0, spot - deltas[i])
            sl.entry_cents = None
            sl.qty = 0.0
        st.grid_armed = True
        self._trace({"ts_ms": event.timestamp_ms, "phase": "grid_arm", "spot": spot, "side": st.grid_side.value})

    def _grid_tranche_usd(self) -> float:
        return (self.grid_risk_mult * self.risk_unit_usd) / 3.0

    def _run_grid(
        self, st: _RoundState, event: TickEvent, ctx: RunContext, *, winddown: bool, elapsed: int
    ) -> None:
        if st.route != "grid" or not st.grid_active or st.grid_side is None:
            return
        if elapsed < self.phase3_start_ms or elapsed > self.phase3_end_ms:
            return
        if winddown:
            return

        self._arm_grid_slots(st, event)
        side = st.grid_side
        ask = _ask_cents(event, side)

        for sl in st.slots:
            if sl.qty <= 1e-12 and sl.buy_limit_cents is not None and ask <= sl.buy_limit_cents + 1e-9:
                if self._submit_open(
                    st,
                    event,
                    ctx,
                    side=side,
                    bet_usd=self._grid_tranche_usd(),
                    price_cents=ask,
                    book="grid",
                    reason="grid_tranche_buy",
                ):
                    sl.qty = _shares_for_usd(self._grid_tranche_usd(), ask)
                    sl.entry_cents = ask
                    sl.buy_limit_cents = None
                break

        for sl in st.slots:
            if sl.qty > 1e-12 and sl.entry_cents is not None:
                tp = sl.entry_cents + self.grid_tp_delta_cents
                if _bid_cents(event, side) + 1e-9 >= tp:
                    if self._submit_close(
                        st,
                        event,
                        ctx,
                        side=side,
                        qty=sl.qty,
                        reason="grid_tp",
                        book="grid_tp",
                    ):
                        spot = _mid_cents(event, side)
                        sl.qty = 0.0
                        sl.entry_cents = None
                        idx = st.slots.index(sl)
                        sl.buy_limit_cents = max(1.0, spot - float(idx) * self.grid_tp_delta_cents)
                break

    def _winddown_grid_flatten(self, st: _RoundState, event: TickEvent, ctx: RunContext) -> None:
        for side in (TokenSide.YES, TokenSide.NO):
            gq = st.grid_yes if side == TokenSide.YES else st.grid_no
            if gq <= 1e-12:
                continue
            pq = _pos_qty(ctx, side)
            q = min(gq, pq)
            if q > 1e-12:
                self._submit_close(
                    st,
                    event,
                    ctx,
                    side=side,
                    qty=q,
                    reason="grid_winddown_flat",
                    book="grid_flat",
                )

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        st = self._ensure_round(event)
        elapsed = int(event.timestamp_ms) - st.start_ms
        if elapsed < 0:
            elapsed = 0
        winddown = elapsed >= self._winddown_elapsed_threshold_ms()

        self._resolve_route(st, event)

        # Phase 1 deep bids (rest until winddown cancels new bids)
        if not winddown:
            self._phase1_deep_bids(st, event, ctx, winddown=False)

        # Trend path
        self._maybe_trend_entry_and_tp(st, event, ctx, winddown=winddown)

        # Grid path (phase 3 window only; winddown halts new grid logic here)
        self._run_grid(st, event, ctx, winddown=winddown, elapsed=elapsed)

        if winddown:
            self._winddown_grid_flatten(st, event, ctx)

        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "tick",
                "elapsed_ms": elapsed,
                "winddown": winddown,
                "route": st.route,
                "yes": _mid_cents(event, TokenSide.YES),
                "no": _mid_cents(event, TokenSide.NO),
            }
        )
