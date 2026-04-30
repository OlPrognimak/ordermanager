"""Core domain and session orchestration (lazy-load session to keep import graph shallow)."""

from pmbacktest.core.types import Fill, OrderIntent, OrderStatus, PositionView, TickEvent
from pmbacktest.core.run_context import BrokerFacade, RunContext

__all__ = [
    "BacktestSession",
    "BrokerFacade",
    "SessionConfig",
    "SessionResult",
    "RunContext",
    "TickEvent",
    "OrderIntent",
    "OrderStatus",
    "Fill",
    "PositionView",
]


def __getattr__(name: str):
    if name in ("BacktestSession", "SessionConfig", "SessionResult"):
        from pmbacktest.core import session as _session

        return getattr(_session, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
