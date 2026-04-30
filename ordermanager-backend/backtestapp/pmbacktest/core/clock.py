"""Simulation clock driven by tick replay (deterministic)."""


class SimulationClock:
    """Monotonic simulation time in epoch milliseconds."""

    __slots__ = ("_now_ms",)

    def __init__(self, initial_ms: int = 0) -> None:
        self._now_ms = initial_ms

    @property
    def now_ms(self) -> int:
        return self._now_ms

    def set(self, ts_ms: int) -> None:
        if ts_ms < self._now_ms:
            raise ValueError("Clock cannot move backwards in deterministic replay")
        self._now_ms = ts_ms
