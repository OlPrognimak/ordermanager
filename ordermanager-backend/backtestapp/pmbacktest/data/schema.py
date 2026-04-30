"""Tick schema validation (lightweight, no pandas dependency in the hot path)."""

from __future__ import annotations

import math

from pmbacktest.core.types import TickEvent
from typing import Any, Mapping

# Typical Polymarket-style quotes sum to ~100 (cents); allow slack for stale books.
YES_NO_SUM_SOFT_MIN = 50.0
YES_NO_SUM_SOFT_MAX = 120.0
_DEFAULT_SUM_SOFT_MIN = YES_NO_SUM_SOFT_MIN
_DEFAULT_SUM_SOFT_MAX = YES_NO_SUM_SOFT_MAX


def validate_tick(
    *,
    timestamp_ms: int,
    price: float,
    yes: float,
    no: float,
    soft_check_yes_no_sum: bool = True,
    yes_no_sum_min: float = YES_NO_SUM_SOFT_MIN,
    yes_no_sum_max: float = YES_NO_SUM_SOFT_MAX,
) -> None:
    """Raise ValueError if a decoded row is not usable for replay."""
    if timestamp_ms < 0:
        raise ValueError("timestamp_ms must be non-negative")
    if yes < 0 or no < 0:
        raise ValueError("yes/no quotes must be non-negative")
    for name, v in (("price", price), ("yes", yes), ("no", no)):
        if not math.isfinite(v):
            raise ValueError(f"{name} must be finite")
    if soft_check_yes_no_sum:
        s = yes + no
        if not (yes_no_sum_min <= s <= yes_no_sum_max):
            raise ValueError(
                f"yes+no sum {s} outside expected range [{yes_no_sum_min}, {yes_no_sum_max}] "
                "(disable with soft_check_yes_no_sum=False if your venue differs)"
            )


def to_event(
    timestamp_ms: int,
    price: float,
    yes: float,
    no: float,
    *,
    data: Mapping[str, Any] | None = None,
    soft_check_yes_no_sum: bool = True,
    yes_no_sum_min: float = YES_NO_SUM_SOFT_MIN,
    yes_no_sum_max: float = YES_NO_SUM_SOFT_MAX,
) -> TickEvent:
    validate_tick(
        timestamp_ms=timestamp_ms,
        price=price,
        yes=yes,
        no=no,
        soft_check_yes_no_sum=soft_check_yes_no_sum,
        yes_no_sum_min=yes_no_sum_min,
        yes_no_sum_max=yes_no_sum_max,
    )
    return TickEvent(timestamp_ms=timestamp_ms, price=price, yes=yes, no=no, data=dict(data or {}))
