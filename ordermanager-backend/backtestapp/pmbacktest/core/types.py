"""Shared domain types for ticks, orders, fills, and positions."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Mapping


class TokenSide(str, Enum):
    """Which outcome token is traded."""

    YES = "yes"
    NO = "no"


class OrderAction(str, Enum):
    """Order intent: open or close a YES/NO leg."""

    OPEN_YES = "open_yes"
    OPEN_NO = "open_no"
    CLOSE_YES = "close_yes"
    CLOSE_NO = "close_no"


@dataclass(frozen=True, slots=True)
class TickEvent:
    """Single market observation in chronological replay."""

    timestamp_ms: int
    price: float
    yes: float
    no: float
    #: Optional extra fields (e.g. ML predictions) attached by the tick source.
    data: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.timestamp_ms < 0:
            raise ValueError("timestamp_ms must be non-negative")
        for name, v in (("price", self.price), ("yes", self.yes), ("no", self.no)):
            if not math.isfinite(v):
                raise ValueError(f"{name} must be finite")
        if self.data is None:
            raise ValueError("data must not be None")


@dataclass(frozen=True, slots=True)
class OrderIntent:
    """Strategy-facing order request (no engine internals)."""

    action: OrderAction
    quantity: float
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not math.isfinite(self.quantity) or self.quantity <= 0:
            raise ValueError("quantity must be a finite positive number")


class OrderStatus(str, Enum):
    PENDING = auto()
    FILLED = auto()
    REJECTED = auto()
    CANCELLED = auto()


@dataclass(slots=True)
class OrderRecord:
    """Internal order lifecycle record."""

    order_id: str
    run_id: str
    action: OrderAction
    quantity: float
    created_ts_ms: int
    execute_after_ts_ms: int
    status: OrderStatus
    metadata: dict[str, Any] = field(default_factory=dict)
    reject_reason: str | None = None


@dataclass(frozen=True, slots=True)
class Fill:
    """Execution report delivered to the strategy."""

    fill_id: str
    order_id: str
    run_id: str
    timestamp_ms: int
    action: OrderAction
    side: TokenSide
    quantity: float
    price_per_share: float
    fee: float
    slippage_cost: float
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class PositionView:
    """Read-only position snapshot for strategies."""

    side: TokenSide
    quantity: float
    avg_entry_price: float


@dataclass(frozen=True, slots=True)
class PositionUpdate:
    """Emitted after portfolio applies a fill affecting a book."""

    side: TokenSide
    quantity: float
    avg_entry_price: float


@dataclass(frozen=True, slots=True)
class CloseFillBasis:
    """USD cost basis closed by one CLOSE fill (for PnL without referencing share qty)."""

    basis_closed_usd: float
    cost_basis_before_usd: float


@dataclass(frozen=True, slots=True)
class ClosedTrade:
    """One round-trip (open -> flat) for a given token side, for analytics."""

    trade_id: str
    run_id: str
    side: TokenSide
    opened_ts_ms: int
    closed_ts_ms: int
    quantity: float
    entry_price: float
    exit_price: float
    fees_paid: float
    realized_pnl: float
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class EquityPoint:
    """Point on the equity curve."""

    timestamp_ms: int
    equity: float
    cash: float
    unrealized_pnl: float
    #: Carried from the last tick when sampled (for GUI / CSV export); optional for backward compatibility.
    price: float | None = None
    yes: float | None = None
    no: float | None = None
    yes_bid: float | None = None
    yes_ask: float | None = None
    no_bid: float | None = None
    no_ask: float | None = None


@dataclass(frozen=True, slots=True)
class RunMeta:
    """Metadata persisted with exports."""

    run_id: str
    strategy_name: str
    strategy_params: Mapping[str, Any]
    data_source: str
    started_ts_ms: int | None
    ended_ts_ms: int | None
    tick_count: int
    seed: int | None
    notes: str = ""
