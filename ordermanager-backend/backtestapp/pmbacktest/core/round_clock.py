"""UTC 5-minute market windows (Polymarket-style BTC up/down grid)."""

from __future__ import annotations

from datetime import datetime, timezone


def utc_five_minute_round_start_ms(timestamp_ms: int) -> int:
    """
    Start of the 5-minute UTC bucket containing ``timestamp_ms``.

    Boundaries are at ``minute % 5 == 0`` (e.g. 13:05:00.000Z), matching the dashboard contract.
    """
    if timestamp_ms < 0:
        raise ValueError("timestamp_ms must be non-negative")
    dt = datetime.fromtimestamp(timestamp_ms / 1000.0, tz=timezone.utc)
    total_minutes = dt.hour * 60 + dt.minute
    rounded = (total_minutes // 5) * 5
    hour, minute = divmod(rounded, 60)
    start = dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return int(start.timestamp() * 1000)
