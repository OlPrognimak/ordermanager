"""Pluggable execution, fee, slippage, and latency models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent, TokenSide


class SlippageModel(Protocol):
    """Adjusts executable price away from the last tick quote."""

    def adjust_price(
        self,
        raw_price_per_share: float,
        *,
        side: TokenSide,
        is_buy: bool,
        event: TickEvent,
    ) -> float:
        """Return effective price per share after slippage (same currency as quotes)."""
        ...


@dataclass(frozen=True, slots=True)
class LinearSlippageModel:
    """Fractional slippage: buy pays more, sell receives less."""

    fraction: float

    def adjust_price(
        self,
        raw_price_per_share: float,
        *,
        side: TokenSide,
        is_buy: bool,
        event: TickEvent,
    ) -> float:
        _ = side, event
        if self.fraction < 0:
            raise ValueError("slippage fraction must be non-negative")
        if is_buy:
            return raw_price_per_share * (1.0 + self.fraction)
        return max(0.0, raw_price_per_share * (1.0 - self.fraction))


class FeeModel(Protocol):
    """Fees as a function of notional (price * quantity)."""

    def fee_on_trade(self, notional: float, *, action: OrderAction, side: TokenSide) -> float:
        ...


@dataclass(frozen=True, slots=True)
class FixedFeeModel:
    """Proportional fee on absolute notional."""

    rate: float

    def fee_on_trade(self, notional: float, *, action: OrderAction, side: TokenSide) -> float:
        _ = action, side
        if self.rate < 0:
            raise ValueError("fee rate must be non-negative")
        return abs(notional) * self.rate


class LatencyModel(Protocol):
    """Signal-to-execution delay in milliseconds (integer, deterministic)."""

    def execution_delay_ms(self, *, intent: OrderIntent, event: TickEvent) -> int:
        ...


@dataclass(frozen=True, slots=True)
class FixedLatencyMs:
    """Constant latency from order creation to eligible execution time."""

    delay_ms: int

    def execution_delay_ms(self, *, intent: OrderIntent, event: TickEvent) -> int:
        _ = intent, event
        if self.delay_ms < 0:
            raise ValueError("latency must be non-negative")
        return self.delay_ms


@dataclass(frozen=True, slots=True)
class ExecutionConfig:
    """Bundle of execution simulation components (dependency injection)."""

    slippage: SlippageModel
    fees: FeeModel
    latency: LatencyModel
