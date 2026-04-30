"""OPEN-only rebound strategy: arm at <=40c, buy on +3c rebound, then switch side."""

from __future__ import annotations

from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import Fill, OrderAction, OrderIntent, OrderRecord, TickEvent, TokenSide
from pmbacktest.strategies.base import Strategy


class ReboundSwitch40Strategy(Strategy):
    """
    Track YES/NO in cent space with a threshold+rebound state machine:

    - Wait until either side reaches ``trigger_cents`` (default 40).
    - Enter buy mode for the first side that reaches it and keep that side's local minimum.
    - When price rebounds by ``rebound_cents`` (default 3) from that minimum, submit OPEN.
    - After successful buy, switch target to the opposite side and repeat.

    At most **one** OPEN per side per position: blocks a second submit while inventory
    exists **or** while a prior OPEN on that side is still pending (latency / queue), so
    dashboard ``order_count`` stays 1. Each open uses ``bet_usd_per_order`` in metadata.

    Optional: ``max_opens_per_round`` (default ``1``) limits successful OPENs per UTC
    5m round when flat. Set to ``0`` for no per-round cap.

    Strategy is OPEN-only; exits are handled by engine settlement/liquidation.
    """

    def __init__(
        self,
        *,
        trigger_cents: float = 40.0,
        rebound_cents: float = 3.0,
        bet_usd_per_order: float = 10.0,
        max_opens_per_round: int | None = None,
        **extras: object,
    ) -> None:
        # Backward-compatible aliases.
        if "betUsdPerOrder" in extras:
            bet_usd_per_order = float(extras["betUsdPerOrder"])
        raw_opens: object | None = max_opens_per_round
        if raw_opens is None and "max_opens_per_round" in extras:
            raw_opens = extras["max_opens_per_round"]
        if raw_opens is None and "maxOpensPerRound" in extras:
            raw_opens = extras["maxOpensPerRound"]
        if raw_opens is None:
            mopr_cap: int | None = 1
        else:
            n = int(raw_opens)  # type: ignore[arg-type]
            mopr_cap = None if n <= 0 else max(1, n)
        debug_trace = bool(extras.get("debug_trace", True))
        max_debug_events = int(extras.get("max_debug_events", 20_000))

        if trigger_cents <= 0 or trigger_cents >= 100:
            raise ValueError("trigger_cents must be in (0, 100)")
        if rebound_cents <= 0:
            raise ValueError("rebound_cents must be > 0")
        if bet_usd_per_order <= 0:
            raise ValueError("bet_usd_per_order must be > 0")
        self.trigger_cents = float(trigger_cents)
        self.rebound_cents = float(rebound_cents)
        self.bet_usd_per_order = float(bet_usd_per_order)
        self.max_opens_per_round: int | None = mopr_cap
        self._target_side: TokenSide | None = None
        self._in_buy_mode = False
        self._mode_min_cents: float | None = None
        self._active_round_start_ms: int | None = None
        self._debug_trace = debug_trace
        self._max_debug_events = max(0, max_debug_events)
        self._debug_events: list[dict[str, object]] = []
        self._opens_this_round: int = 0
        self._pending_open_yes: bool = False
        self._pending_open_no: bool = False

    def on_start(self, ctx: RunContext) -> None:
        _ = ctx
        self._target_side = None
        self._in_buy_mode = False
        self._mode_min_cents = None
        self._active_round_start_ms = None
        self._opens_this_round = 0
        self._pending_open_yes = False
        self._pending_open_no = False
        self._debug_events = []

    @property
    def debug_events(self) -> list[dict[str, object]]:
        return list(self._debug_events)

    def _trace(self, event: TickEvent, phase: str, extra: dict[str, object] | None = None) -> None:
        if not self._debug_trace or self._max_debug_events <= 0:
            return
        if len(self._debug_events) >= self._max_debug_events:
            return
        row: dict[str, object] = {
            "ts_ms": int(event.timestamp_ms),
            "phase": phase,
            "yes": float(event.yes),
            "no": float(event.no),
            "round_start_ms": int(utc_five_minute_round_start_ms(event.timestamp_ms)),
            "target_side": self._target_side.value if self._target_side is not None else None,
            "in_buy_mode": bool(self._in_buy_mode),
            "mode_min_cents": float(self._mode_min_cents) if self._mode_min_cents is not None else None,
            "trigger_cents": float(self.trigger_cents),
            "rebound_cents": float(self.rebound_cents),
        }
        if extra:
            row.update(extra)
        self._debug_events.append(row)

    def _price_for_side(self, event: TickEvent, side: TokenSide) -> float:
        return float(event.yes if side == TokenSide.YES else event.no)

    def _shares_and_usd_from_order_intent(
        self, ctx: RunContext, side: TokenSide, price_cents: float
    ) -> tuple[float, float]:
        """
        USD sizing: each open targets ``bet_usd_per_order`` at the current quote (not
        scaled down by remaining cash). Cash and risk limits are enforced on
        ``submit_order`` / fill.
        """
        px = float(price_cents) / 100.0
        if px <= 1e-12:
            return 0.0, 0.0
        if ctx.cash() <= 1e-12:
            return 0.0, 0.0
        target_usd = self.bet_usd_per_order
        if target_usd <= 1e-12:
            return 0.0, 0.0
        q = target_usd / px
        return max(0.0, q), target_usd

    def _qty_on_side(self, ctx: RunContext, side: TokenSide) -> float:
        for pv in ctx.positions():
            if pv.side == side:
                return float(pv.quantity)
        return 0.0

    def _pending_on_side(self, side: TokenSide) -> bool:
        return self._pending_open_yes if side == TokenSide.YES else self._pending_open_no

    def _set_pending(self, side: TokenSide, v: bool) -> None:
        if side == TokenSide.YES:
            self._pending_open_yes = v
        else:
            self._pending_open_no = v

    def _try_open(self, ctx: RunContext, side: TokenSide) -> tuple[bool, str]:
        """
        Returns (success, reason). Failures: ``zero_qty_or_usd`` or ``submit_order:...``.
        """
        if self._qty_on_side(ctx, side) > 1e-12:
            return False, "already_open_on_side"
        if self._pending_on_side(side):
            return False, "pending_open_on_side"
        act = OrderAction.OPEN_YES if side == TokenSide.YES else OrderAction.OPEN_NO
        p = ctx.last_tick()
        price_cents = p.yes if (p and side == TokenSide.YES) else p.no if p else 0.0
        qty, _ = self._shares_and_usd_from_order_intent(ctx, side, float(price_cents))
        if qty <= 1e-12:
            return False, "zero_qty_or_usd"
        try:
            ctx.submit_order(
                OrderIntent(
                    act,
                    qty,
                    metadata={"bet_usd_amount": self.bet_usd_per_order},
                ),
            )
            self._set_pending(side, True)
            return True, ""
        except ValueError as e:
            return False, f"submit_order:{e!s}"

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        round_start_ms = utc_five_minute_round_start_ms(event.timestamp_ms)
        # Reset state at the beginning of each UTC 5m round on the first observed tick in that round.
        if self._active_round_start_ms is None or round_start_ms != self._active_round_start_ms:
            self._active_round_start_ms = round_start_ms
            self._target_side = None
            self._in_buy_mode = False
            self._mode_min_cents = None
            self._opens_this_round = 0
            self._trace(event, "reset_round")

        if not self._in_buy_mode:
            y = self._price_for_side(event, TokenSide.YES)
            n = self._price_for_side(event, TokenSide.NO)
            # Keep side selection adaptive before buy-mode to avoid stale target lock.
            if y <= self.trigger_cents and n <= self.trigger_cents:
                self._target_side = TokenSide.YES if y <= n else TokenSide.NO
            elif y <= self.trigger_cents and self._target_side is not TokenSide.YES:
                self._target_side = TokenSide.YES
            elif n <= self.trigger_cents and self._target_side is not TokenSide.NO:
                self._target_side = TokenSide.NO
            # elif self._target_side is not None:
            #     self._target_side = None
            target = self._target_side
            if target is not None and self._price_for_side(event, target) <= self.trigger_cents:
                self._in_buy_mode = True
                self._mode_min_cents = self._price_for_side(event, target)
                self._trace(event, "arm_buy_mode", {"armed_side": target.value})
            else:
                self._trace(event, "scan_no_arm")
            return

        target = self._target_side
        if target is None:
            self._in_buy_mode = False
            self._mode_min_cents = None
            self._trace(event, "buy_mode_cancel_no_target")
            return
        p = self._price_for_side(event, target)
        cur_min = self._mode_min_cents if self._mode_min_cents is not None else p
        if p < cur_min:
            self._mode_min_cents = p
            self._trace(event, "buy_mode_new_min", {"tracked_side": target.value, "tracked_price": float(p)})
            return

        if p >= cur_min + self.rebound_cents:
            cap = self.max_opens_per_round
            if cap is not None and self._opens_this_round >= cap:
                self._trace(
                    event,
                    "buy_skipped_max_opens_per_round",
                    {
                        "tracked_side": target.value,
                        "tracked_price": float(p),
                        "max_opens_per_round": cap,
                        "opens_this_round": self._opens_this_round,
                    },
                )
            else:
                self._trace(event, "buy_signal", {"tracked_side": target.value, "tracked_price": float(p)})
                ok, fail_reason = self._try_open(ctx, target)
                if ok:
                    self._opens_this_round += 1
                    self._target_side = TokenSide.NO if target == TokenSide.YES else TokenSide.YES
                    self._trace(event, "buy_submitted", {"submitted_side": target.value})
                else:
                    if fail_reason == "zero_qty_or_usd":
                        phase = "buy_blocked_zero_qty"
                    elif fail_reason == "already_open_on_side":
                        phase = "buy_skipped_already_open_on_side"
                    elif fail_reason == "pending_open_on_side":
                        phase = "buy_skipped_pending_open_on_side"
                    else:
                        phase = "buy_submit_rejected"
                    self._trace(
                        event,
                        phase,
                        {"attempted_side": target.value, "reason": fail_reason},
                    )
            self._in_buy_mode = False
            self._mode_min_cents = None
        else:
            self._trace(
                event,
                "buy_mode_wait_rebound",
                {"tracked_side": target.value, "tracked_price": float(p), "needed_rebound_from": float(cur_min)},
            )

    def on_order_fill(self, fill: Fill, ctx: RunContext) -> None:
        _ = ctx
        if fill.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
            self._set_pending(fill.side, False)

    def on_order_rejected(self, order: OrderRecord, ctx: RunContext) -> None:
        _ = ctx
        if order.action == OrderAction.OPEN_YES:
            self._set_pending(TokenSide.YES, False)
        elif order.action == OrderAction.OPEN_NO:
            self._set_pending(TokenSide.NO, False)

    def on_position_update(self, update, ctx: RunContext) -> None:  # noqa: ANN001
        _ = update, ctx

    def on_finish(self, ctx: RunContext) -> None:
        _ = ctx
        