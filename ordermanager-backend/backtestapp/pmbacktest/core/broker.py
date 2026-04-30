"""Simulation broker: order submission + portfolio facade for strategies."""

from __future__ import annotations

from dataclasses import dataclass

from pmbacktest.core.clock import SimulationClock
from pmbacktest.core.order_manager import OrderManager
from pmbacktest.core.portfolio_manager import PortfolioManager
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import OrderAction, OrderIntent, PositionView, TickEvent
from pmbacktest.execution.models import LatencyModel

MARKET_WINDOW_MS = 5 * 60 * 1000


@dataclass(slots=True)
class SimulationBroker:
    """
    Queues orders with a pluggable latency model; risk checks use the current tick.

    Intentionally depends only on ``LatencyModel``, not slippage/fees (handled at fill time).
    """

    clock: SimulationClock
    orders: OrderManager
    portfolio: PortfolioManager
    latency: LatencyModel
    forbid_open_first_ms_in_round: int = 1_000
    forbid_open_last_ms_in_round: int = 0
    _event: TickEvent | None = None

    def set_event(self, event: TickEvent) -> None:
        self._event = event

    def submit_order(self, intent: OrderIntent) -> str:
        if self._event is None:
            raise RuntimeError("submit_order called without an active tick")
        # Round boundary guards apply only to opens; closes may reduce risk near boundaries.
        if intent.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
            rs = utc_five_minute_round_start_ms(self._event.timestamp_ms)
            if self.forbid_open_first_ms_in_round > 0 and self._event.timestamp_ms < rs + self.forbid_open_first_ms_in_round:
                raise ValueError("order_rejected:round_start_guard")
            if self.forbid_open_last_ms_in_round > 0:
                re = rs + MARKET_WINDOW_MS
                if self._event.timestamp_ms >= re - self.forbid_open_last_ms_in_round:
                    raise ValueError("order_rejected:end_of_round_guard")
        reason = self.portfolio.validate_intent(intent, self._event)
        if reason is not None:
            raise ValueError(f"order_rejected:{reason}")
        delay = self.latency.execution_delay_ms(intent=intent, event=self._event)
        execute_after = self.clock.now_ms + delay
        rec = self.orders.submit(
            intent,
            created_ts_ms=self.clock.now_ms,
            execute_after_ts_ms=execute_after,
        )
        return rec.order_id

    def cash(self) -> float:
        return self.portfolio.cash

    def positions(self) -> list[PositionView]:
        return self.portfolio.positions_snapshot()

    def last_tick(self) -> TickEvent | None:
        return self._event
