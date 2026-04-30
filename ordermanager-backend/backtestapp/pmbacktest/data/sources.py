"""Composable tick sources for large-file replay and tests."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from pathlib import Path

from pmbacktest.core.types import TickEvent
from pmbacktest.data.csv_loader import iter_csv_ticks_from_path
from pmbacktest.data.ports import TickSource


@dataclass(frozen=True, slots=True)
class CsvFileTickSource:
    """
    Lazy CSV tick source: opens the file only when ``iter_ticks()`` is called.

    Suitable for batch jobs that construct many specs without opening files eagerly.
    """

    path: str | Path
    time_start_ms: int | None = None
    time_end_ms: int | None = None
    strict_monotonic: bool = True
    encoding: str = "utf-8"
    soft_check_yes_no_sum: bool = True

    def iter_ticks(self) -> Iterator[TickEvent]:
        yield from iter_csv_ticks_from_path(
            self.path,
            time_start_ms=self.time_start_ms,
            time_end_ms=self.time_end_ms,
            strict_monotonic=self.strict_monotonic,
            encoding=self.encoding,
            soft_check_yes_no_sum=self.soft_check_yes_no_sum,
        )

    @property
    def label(self) -> str:
        return str(self.path)


@dataclass(frozen=True, slots=True)
class IterableTickSource:
    """Wrap an in-memory or pre-built iterator (tests, adapters)."""

    _factory: Callable[[], Iterator[TickEvent]]
    label: str = "iterable"

    def iter_ticks(self) -> Iterator[TickEvent]:
        return self._factory()


@dataclass(frozen=True, slots=True)
class MappedTickSource:
    """Map each tick (vectorized-style transforms stay out of the strategy hot path)."""

    inner: TickSource
    fn: Callable[[TickEvent], TickEvent]
    name: str | None = None

    def iter_ticks(self) -> Iterator[TickEvent]:
        for ev in self.inner.iter_ticks():
            yield self.fn(ev)

    @property
    def label(self) -> str:
        if self.name is not None:
            return self.name
        inner = self.inner
        lab = getattr(inner, "label", None)
        return str(lab) if lab is not None else repr(inner)


@dataclass
class BufferedTickSource:
    """
    Sliding-window read-ahead over ``inner`` (deterministic, bounded memory).

    Intended to amortize Python generator overhead on multi-million tick replays.
    """

    inner: TickSource
    size: int = 10_000
    _label: str | None = field(default=None, repr=False)

    def iter_ticks(self) -> Iterator[TickEvent]:
        from collections import deque

        if self.size < 1:
            raise ValueError("buffer size must be positive")
        it = self.inner.iter_ticks()
        buf: deque[TickEvent] = deque()
        while len(buf) < self.size:
            try:
                buf.append(next(it))
            except StopIteration:
                while buf:
                    yield buf.popleft()
                return
        while True:
            yield buf.popleft()
            try:
                buf.append(next(it))
            except StopIteration:
                while buf:
                    yield buf.popleft()
                return

    @property
    def label(self) -> str:
        if self._label is not None:
            return self._label
        return f"buffered({getattr(self.inner, 'label', repr(self.inner))},{self.size})"
