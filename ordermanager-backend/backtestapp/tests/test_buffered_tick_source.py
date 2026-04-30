from pmbacktest.core.types import TickEvent
from pmbacktest.data.sources import BufferedTickSource, IterableTickSource


def _make(n: int) -> IterableTickSource:
    def _it():
        for i in range(n):
            yield TickEvent(i, 1.0, 50.0, 50.0)

    return IterableTickSource(_it, label="test")


def test_buffered_yields_same_count_as_inner() -> None:
    for n in (0, 1, 3, 15, 100):
        inner = _make(n)
        buf = BufferedTickSource(inner, size=10)
        assert list(inner.iter_ticks()) == list(buf.iter_ticks())


def test_buffered_various_buffer_sizes() -> None:
    inner = _make(50)
    raw = list(inner.iter_ticks())
    for sz in (1, 2, 7, 10, 49, 50, 100):
        buf = BufferedTickSource(_make(50), size=sz)
        assert list(buf.iter_ticks()) == raw
