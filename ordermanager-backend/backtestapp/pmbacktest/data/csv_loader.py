"""Streaming CSV loader for large tick files."""

from __future__ import annotations

import csv
from collections.abc import Iterator
from pathlib import Path
from typing import TextIO

from pmbacktest.core.types import TickEvent
from pmbacktest.data.schema import to_event


def _parse_timestamp_ms(raw: str) -> int:
    """Parse epoch ms without float precision loss for large integers."""
    s = raw.strip()
    if not s:
        raise ValueError("empty timestamp")
    lowered = s.lower()
    if "." in s or "e" in lowered:
        return int(float(s))
    return int(s)


def iter_csv_ticks_from_path(
    path: str | Path,
    *,
    time_start_ms: int | None = None,
    time_end_ms: int | None = None,
    strict_monotonic: bool = True,
    encoding: str = "utf-8",
    soft_check_yes_no_sum: bool = True,
) -> Iterator[TickEvent]:
    """
    Yield `TickEvent` rows from a CSV with headers: timestamp,price,yes,no.

    Opens the file lazily; uses stdlib ``csv`` for line-by-line reads (constant memory).
    """
    p = Path(path)
    with p.open(encoding=encoding, newline="") as f:
        yield from iter_csv_ticks_from_file(
            f,
            time_start_ms=time_start_ms,
            time_end_ms=time_end_ms,
            strict_monotonic=strict_monotonic,
            soft_check_yes_no_sum=soft_check_yes_no_sum,
        )


def iter_csv_ticks_from_file(
    f: TextIO,
    *,
    time_start_ms: int | None,
    time_end_ms: int | None,
    strict_monotonic: bool,
    soft_check_yes_no_sum: bool = True,
) -> Iterator[TickEvent]:
    reader = csv.DictReader(f)
    if reader.fieldnames is None:
        raise ValueError("CSV has no header row")
    fields = {n.strip().lower() for n in reader.fieldnames}
    required = {"timestamp", "price", "yes", "no"}
    if not required.issubset(fields):
        raise ValueError(f"CSV must include columns {sorted(required)}, got {sorted(fields)}")
    prev_ts: int | None = None
    for raw in reader:
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        ts = _parse_timestamp_ms(row["timestamp"])
        price = float(row["price"])
        yes = float(row["yes"])
        no = float(row["no"])
        if time_start_ms is not None and ts < time_start_ms:
            continue
        if time_end_ms is not None and ts > time_end_ms:
            break
        ev = to_event(ts, price, yes, no, soft_check_yes_no_sum=soft_check_yes_no_sum)
        if strict_monotonic and prev_ts is not None and ev.timestamp_ms < prev_ts:
            raise ValueError(f"timestamps not monotonic: {ev.timestamp_ms} < {prev_ts}")
        prev_ts = ev.timestamp_ms
        yield ev


def csv_tick_stream(
    path: str | Path,
    *,
    time_start_ms: int | None = None,
    time_end_ms: int | None = None,
    strict_monotonic: bool = True,
    encoding: str = "utf-8",
    soft_check_yes_no_sum: bool = True,
) -> Iterator[TickEvent]:
    """Convenience alias for ``iter_csv_ticks_from_path``."""
    return iter_csv_ticks_from_path(
        path,
        time_start_ms=time_start_ms,
        time_end_ms=time_end_ms,
        strict_monotonic=strict_monotonic,
        encoding=encoding,
        soft_check_yes_no_sum=soft_check_yes_no_sum,
    )
