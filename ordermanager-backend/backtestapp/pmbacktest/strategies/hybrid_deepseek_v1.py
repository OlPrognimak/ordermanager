"""Hybrid reversal + ML-confirmation strategy for 5m BTC up/down markets.

This is a practical, stateful strategy intended for the pmbacktest engine:
- Early window (scavenger): buy outcome tokens when they are unusually cheap (mean reversion / overreaction).
- Mid window (oracle): optionally add/hedge using an external prediction signal (direction + confidence) if present
  on the tick (e.g. injected into TickEvent.data by the data source).
- Late window (closer): reduce tail risk by closing very weak positions near expiry.

Notes on ML integration:
    The engine itself does not query MongoDB from inside strategies. Instead, if you have a per-round ML
    prediction available (e.g. from a collection like `live_all_predictions_binance` with fields
    `direction_pred` and `confidence`), inject it into ticks as:
        event.data = {"direction_pred": "up"|"down", "confidence": 0.0..1.0}
    This strategy will read that if present; otherwise it behaves as a pure reversal/management strategy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy

FIVE_MIN_MS = 5 * 60 * 1000


def _clamp(x: float, lo: float, hi: float) -> float:
    return lo if x < lo else hi if x > hi else x


def _get_tick_extra(event: TickEvent) -> dict[str, Any]:
    d = getattr(event, "data", None)
    return d if isinstance(d, dict) else {}


def _read_prediction(event: TickEvent) -> tuple[str | None, float | None]:
    """
    Returns (direction, confidence) if present.
    - direction: "up" or "down"
    - confidence: 0..1
    """
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
        if c == c:  # not NaN
            conf = _clamp(c, 0.0, 1.0)
    return direction, conf


def _side_for_direction(direction: str) -> TokenSide:
    # Convention: YES = "up" outcome, NO = "down" outcome.
    return TokenSide.YES if direction == "up" else TokenSide.NO


def _mid_cents(event: TickEvent, side: TokenSide) -> float:
    return float(event.yes if side == TokenSide.YES else event.no)


def _pos_qty(ctx: RunContext, side: TokenSide) -> float:
    for p in ctx.positions():
        if p.side == side:
            return float(p.quantity)
    return 0.0


def _open_action(side: TokenSide) -> OrderAction:
    return OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO


def _shares_for_usd(bet_usd: float, price_cents: float) -> float:
    px = float(price_cents) / 100.0
    if bet_usd <= 0 or px <= 1e-12:
        return 0.0
    return bet_usd / px


@dataclass(slots=True)
class _RoundState:
    start_ms: int
    spent_usd: float = 0.0
    opens_yes: int = 0
    opens_no: int = 0
    peak_yes_cents: float | None = None
    peak_no_cents: float | None = None
    last_action_ts_ms: int | None = None


class HybridDeepseekV1Strategy(Strategy):
    """
    Default parameters are conservative and intended for UI iteration.

    Parameters (JSON kwargs):
        max_bet_usd_per_round:
            Hard cap on total OPEN notional (approx; based on mid) per 5m round.
        tranche_usd:
            Base "scavenger" bet size when a token is unusually cheap.
        max_tranches_per_side:
            Max adds per side per round in scavenger/oracle (OPEN count, not fills).

        cheap_entry_cents:
            Scavenger: open when a side is <= this price.
        avg_down_cents:
            Optional second tranche if price continues lower.
        hedge_both_sides_max_sum_cents:
            If yes_mid + no_mid <= this, and we already hold one side, optionally open the other side
            to reduce worst-case loss.

        oracle_start_ms:
            Time after round start when we start using the prediction signal (ms).
        oracle_end_ms:
            Stop using prediction (ms). After this we mostly manage exits.
        conf_high:
            Confidence threshold for "trend continuation" adds.
        conf_low:
            Confidence threshold below which we avoid chasing and favor reversal posture.
        oracle_max_winner_cents:
            Skip ML adds when the predicted winner is too expensive (poor asymmetry).
        oracle_add_usd:
            Bet size to add on high-confidence signal, subject to per-round cap.

        closer_start_ms:
            Near-expiry management starts at this time after round start (ms). This strategy is OPEN-only;
            the "closer" phase stops adding risk and can emit debug flags.
        salvage_below_cents:
            OPEN-only engine: used only for debug signals; closes are not allowed.
    """

    def __init__(
        self,
        *,
        max_bet_usd_per_round: float = 50.0,
        tranche_usd: float = 10.0,
        max_tranches_per_side: int = 2,
        cheap_entry_cents: float = 35.0,
        avg_down_cents: float = 25.0,
        hedge_both_sides_max_sum_cents: float = 80.0,
        oracle_start_ms: int = 2 * 60 * 1000,
        oracle_end_ms: int = 2 * 60 * 1000 + 20 * 1000,
        conf_high: float = 0.77,
        conf_low: float = 0.65,
        oracle_max_winner_cents: float = 70.0,
        oracle_add_usd: float = 15.0,
        closer_start_ms: int = 4 * 60 * 1000 + 30 * 1000,
        salvage_below_cents: float = 30.0,
        debug_trace: bool = True,
        max_debug_events: int = 20_000,
        **extras: object,
    ) -> None:
        _ = extras

        if max_bet_usd_per_round <= 0:
            raise ValueError("max_bet_usd_per_round must be > 0")
        if tranche_usd <= 0:
            raise ValueError("tranche_usd must be > 0")
        if oracle_add_usd < 0:
            raise ValueError("oracle_add_usd must be >= 0")
        if max_tranches_per_side <= 0:
            raise ValueError("max_tranches_per_side must be > 0")
        if not (0 < cheap_entry_cents < 100):
            raise ValueError("cheap_entry_cents must be in (0, 100)")
        if not (0 < avg_down_cents < 100):
            raise ValueError("avg_down_cents must be in (0, 100)")
        if hedge_both_sides_max_sum_cents <= 0 or hedge_both_sides_max_sum_cents >= 200:
            raise ValueError("hedge_both_sides_max_sum_cents must be in (0, 200)")
        if oracle_start_ms < 0 or oracle_end_ms < 0 or oracle_end_ms < oracle_start_ms:
            raise ValueError("oracle_start_ms/oracle_end_ms must be non-negative and oracle_end_ms >= oracle_start_ms")
        if not (0.0 <= conf_low <= 1.0) or not (0.0 <= conf_high <= 1.0) or conf_low > conf_high:
            raise ValueError("conf_low/conf_high must be in [0,1] and conf_low <= conf_high")
        if closer_start_ms < 0 or closer_start_ms > FIVE_MIN_MS:
            raise ValueError("closer_start_ms must be in [0, 300000]")
        if not (0.0 < salvage_below_cents < 100.0):
            raise ValueError("salvage_below_cents must be in (0, 100)")

        self.max_bet_usd_per_round = float(max_bet_usd_per_round)
        self.tranche_usd = float(tranche_usd)
        self.max_tranches_per_side = int(max_tranches_per_side)
        self.cheap_entry_cents = float(cheap_entry_cents)
        self.avg_down_cents = float(avg_down_cents)
        self.hedge_both_sides_max_sum_cents = float(hedge_both_sides_max_sum_cents)
        self.oracle_start_ms = int(oracle_start_ms)
        self.oracle_end_ms = int(oracle_end_ms)
        self.conf_high = float(conf_high)
        self.conf_low = float(conf_low)
        self.oracle_max_winner_cents = float(oracle_max_winner_cents)
        self.oracle_add_usd = float(oracle_add_usd)
        self.closer_start_ms = int(closer_start_ms)
        self.salvage_below_cents = float(salvage_below_cents)

        self._debug_trace = bool(debug_trace)
        self._max_debug_events = max(0, int(max_debug_events))
        self._debug_events: list[dict[str, object]] = []
        self._round: _RoundState | None = None

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._round = None
        self._debug_events = []

    def _trace(self, row: dict[str, object]) -> None:
        if not self._debug_trace or self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        self._debug_events.append(row)

    def _ensure_round(self, event: TickEvent) -> _RoundState:
        rs = utc_five_minute_round_start_ms(int(event.timestamp_ms))
        if self._round is None or self._round.start_ms != rs:
            self._round = _RoundState(start_ms=rs)
        return self._round

    def _remaining_budget_usd(self, st: _RoundState) -> float:
        return max(0.0, self.max_bet_usd_per_round - st.spent_usd)

    def _maybe_open(self, *, st: _RoundState, side: TokenSide, bet_usd: float, price_cents: float, ctx: RunContext, event: TickEvent, reason: str) -> None:
        if bet_usd <= 0:
            return
        if st.last_action_ts_ms is not None and int(event.timestamp_ms) == st.last_action_ts_ms:
            # Avoid submitting multiple intents on identical timestamp ticks.
            return
        if self._remaining_budget_usd(st) <= 1e-9:
            return
        bet = min(float(bet_usd), self._remaining_budget_usd(st))
        shares = _shares_for_usd(bet, price_cents)
        if shares <= 1e-12:
            return
        if ctx.max_position_shares_per_side is not None:
            cur = _pos_qty(ctx, side)
            cap = float(ctx.max_position_shares_per_side)
            if cur >= cap - 1e-12:
                return
            shares = min(shares, max(0.0, cap - cur))
            if shares <= 1e-12:
                return

        intent = OrderIntent(action=_open_action(side), quantity=shares, metadata={"bet_usd_amount": bet, "reason": reason})
        ctx.submit_order(intent)
        st.spent_usd += bet
        st.last_action_ts_ms = int(event.timestamp_ms)
        if side == TokenSide.YES:
            st.opens_yes += 1
        else:
            st.opens_no += 1
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "open",
                "reason": reason,
                "side": side.value,
                "bet_usd": float(bet),
                "quantity": float(shares),
                "yes": float(event.yes),
                "no": float(event.no),
                "spent_usd_round": float(st.spent_usd),
            }
        )

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        st = self._ensure_round(event)
        elapsed = int(event.timestamp_ms) - int(st.start_ms)
        if elapsed < 0:
            elapsed = 0

        y = _mid_cents(event, TokenSide.YES)
        n = _mid_cents(event, TokenSide.NO)
        y_qty = _pos_qty(ctx, TokenSide.YES)
        n_qty = _pos_qty(ctx, TokenSide.NO)

        # Track peaks for trailing stops / take-profit management.
        if y_qty > 1e-12:
            st.peak_yes_cents = y if st.peak_yes_cents is None else max(st.peak_yes_cents, y)
        else:
            st.peak_yes_cents = None
        if n_qty > 1e-12:
            st.peak_no_cents = n if st.peak_no_cents is None else max(st.peak_no_cents, n)
        else:
            st.peak_no_cents = None

        extra = _get_tick_extra(event)
        pred_dir, pred_conf = _read_prediction(event)
        pred_available = pred_dir is not None and pred_conf is not None
        self._trace(
            {
                "ts_ms": int(event.timestamp_ms),
                "phase": "tick",
                "elapsed_ms": int(elapsed),
                "yes": float(y),
                "no": float(n),
                "pos_yes_qty": float(y_qty),
                "pos_no_qty": float(n_qty),
                "pred_available": bool(pred_available),
                # Mirror the tick extra field names so the UI shows exactly what the tick source injected.
                "direction_pred": pred_dir,
                "confidence": pred_conf,
                "pred_anchor_ts": extra.get("pred_anchor_ts"),
                "pred_decision_ts": extra.get("pred_decision_ts"),
                "pred_target_ts": extra.get("pred_target_ts"),
                "spent_usd_round": float(st.spent_usd),
                "opens_yes": int(st.opens_yes),
                "opens_no": int(st.opens_no),
            }
        )

        # Phase 4: closer (tail-risk reduction).
        if elapsed >= self.closer_start_ms:
            self._trace(
                {
                    "ts_ms": int(event.timestamp_ms),
                    "phase": "closer",
                    "closer_stop_opening": True,
                    "yes_salvage_zone": bool(y_qty > 1e-12 and y < self.salvage_below_cents),
                    "no_salvage_zone": bool(n_qty > 1e-12 and n < self.salvage_below_cents),
                }
            )
            return

        # Phase 1: scavenger (early reversal hunting).
        if elapsed < self.oracle_start_ms:
            # Base cheap entries.
            if y <= self.cheap_entry_cents and st.opens_yes < self.max_tranches_per_side:
                self._maybe_open(st=st, side=TokenSide.YES, bet_usd=self.tranche_usd, price_cents=y, ctx=ctx, event=event, reason="scavenger_cheap")
            if n <= self.cheap_entry_cents and st.opens_no < self.max_tranches_per_side:
                self._maybe_open(st=st, side=TokenSide.NO, bet_usd=self.tranche_usd, price_cents=n, ctx=ctx, event=event, reason="scavenger_cheap")

            # One cautious average-down add if already in and price is even cheaper.
            if y_qty > 1e-12 and y <= self.avg_down_cents and st.opens_yes < self.max_tranches_per_side:
                self._maybe_open(st=st, side=TokenSide.YES, bet_usd=self.tranche_usd, price_cents=y, ctx=ctx, event=event, reason="scavenger_avg_down")
            if n_qty > 1e-12 and n <= self.avg_down_cents and st.opens_no < self.max_tranches_per_side:
                self._maybe_open(st=st, side=TokenSide.NO, bet_usd=self.tranche_usd, price_cents=n, ctx=ctx, event=event, reason="scavenger_avg_down")

            # Optional hedge: if we already hold one side and the other becomes cheap enough, reduce worst-case.
            if (y_qty > 1e-12) != (n_qty > 1e-12) and (y + n) <= self.hedge_both_sides_max_sum_cents:
                if y_qty > 1e-12 and st.opens_no < self.max_tranches_per_side and n <= self.cheap_entry_cents:
                    self._maybe_open(st=st, side=TokenSide.NO, bet_usd=self.tranche_usd, price_cents=n, ctx=ctx, event=event, reason="hedge_both_sides")
                if n_qty > 1e-12 and st.opens_yes < self.max_tranches_per_side and y <= self.cheap_entry_cents:
                    self._maybe_open(st=st, side=TokenSide.YES, bet_usd=self.tranche_usd, price_cents=y, ctx=ctx, event=event, reason="hedge_both_sides")
            return

        # Phase 2: oracle (prediction-based add/hedge) — only if signal exists.
        if elapsed <= self.oracle_end_ms and pred_dir is not None and pred_conf is not None:
            winner_side = _side_for_direction(pred_dir)
            winner_px = y if winner_side == TokenSide.YES else n
            loser_side = TokenSide.NO if winner_side == TokenSide.YES else TokenSide.YES
            loser_px = n if winner_side == TokenSide.YES else y

            if pred_conf >= self.conf_high:
                # High confidence: add only if the asymmetry is still decent.
                if winner_px <= self.oracle_max_winner_cents:
                    if winner_side == TokenSide.YES and st.opens_yes < self.max_tranches_per_side:
                        self._maybe_open(st=st, side=winner_side, bet_usd=self.oracle_add_usd, price_cents=winner_px, ctx=ctx, event=event, reason="oracle_high_conf")
                    if winner_side == TokenSide.NO and st.opens_no < self.max_tranches_per_side:
                        self._maybe_open(st=st, side=winner_side, bet_usd=self.oracle_add_usd, price_cents=winner_px, ctx=ctx, event=event, reason="oracle_high_conf")
            elif pred_conf <= self.conf_low:
                # Low confidence: lean into reversal by waiting for loser to become cheap, then scalp.
                if loser_px <= self.cheap_entry_cents:
                    if loser_side == TokenSide.YES and st.opens_yes < self.max_tranches_per_side:
                        self._maybe_open(st=st, side=loser_side, bet_usd=self.tranche_usd, price_cents=loser_px, ctx=ctx, event=event, reason="oracle_low_conf_reversal")
                    if loser_side == TokenSide.NO and st.opens_no < self.max_tranches_per_side:
                        self._maybe_open(st=st, side=loser_side, bet_usd=self.tranche_usd, price_cents=loser_px, ctx=ctx, event=event, reason="oracle_low_conf_reversal")

        # Phase 3: surfer — nothing mandatory here beyond take-profit/trailing-stop already handled.
        _ = ctx

