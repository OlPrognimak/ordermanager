"""Optional helpers for coarser event streams (not used by the core hot path)."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Callable

from pmbacktest.core.types import TickEvent


def bucket_ticks(
    source: Iterator[TickEvent],
    *,
    bucket_ms: int,
    reducer: Callable[[TickEvent, TickEvent], TickEvent] | None = None,
) -> Iterator[TickEvent]:
    """
    Collapse consecutive ticks into one event per `bucket_ms` window.

    Default reducer keeps the last tick in each bucket (typical for mark-to-market).
    """
    if bucket_ms <= 0:
        raise ValueError("bucket_ms must be positive")

    def _last(_acc: TickEvent, nxt: TickEvent) -> TickEvent:
        return nxt

    red = reducer or _last
    cur: TickEvent | None = None
    bucket_start: int | None = None
    for ev in source:
        b = (ev.timestamp_ms // bucket_ms) * bucket_ms
        if bucket_start is None or b != bucket_start:
            if cur is not None:
                yield cur
            cur = ev
            bucket_start = b
        else:
            cur = red(cur, ev)  # type: ignore[arg-type]
    if cur is not None:
        yield cur
