"""Tick stream contracts (decouple engine from CSV / Parquet / DB)."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol

from pmbacktest.core.types import TickEvent


class TickSource(Protocol):
    """Anything that can produce a forward-only tick iterator (constant-memory friendly)."""

    def iter_ticks(self) -> Iterator[TickEvent]:
        ...
