"""Strategy discovery for CLI, batch jobs, and the web GUI.

Strategies implement YES/NO (up/down) logic for Polymarket-style **5-minute BTC**
windows; markets align to hh:mm:00 with ``minute % 5 == 0``. Register by id so
``POST /api/backtests`` (or Python runners) can resolve the same name the UI sends.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from typing import Any, TypeVar

from pmbacktest.strategies.base import Strategy

S = TypeVar("S", bound=Strategy)


class StrategyRegistry:
    """Maps logical names to constructors (supports 50+ strategies without editing CLI)."""

    def __init__(self) -> None:
        self._factories: dict[str, Callable[[dict[str, Any]], Strategy]] = {}

    def register_class(self, name: str, cls: type[S]) -> None:
        """Register a strategy class; ``params`` are passed as kwargs to ``__init__``."""

        def _make(params: dict[str, Any]) -> Strategy:
            return cls(**params)

        self._factories[name] = _make

    def register_factory(self, name: str, factory: Callable[[dict[str, Any]], Strategy]) -> None:
        self._factories[name] = factory

    def create(self, name: str, params: Mapping[str, Any] | None = None) -> Strategy:
        fac = self._factories.get(name)
        if fac is None:
            raise KeyError(f"unknown strategy {name!r}; registered={sorted(self._factories)}")
        return fac(dict(params or {}))

    def merge(self, other: StrategyRegistry) -> StrategyRegistry:
        out = StrategyRegistry()
        out._factories.update(self._factories)
        out._factories.update(other._factories)
        return out

    def names(self) -> list[str]:
        return sorted(self._factories)


def builtin_strategy_registry() -> StrategyRegistry:
    """Default built-in example strategies."""
    from pmbacktest.strategies.capital_first_volatility_v1 import CapitalFirstVolatilityV1Strategy
    from pmbacktest.strategies.ema_trough_slippage_v1 import EmaTroughSlippageV1Strategy
    from pmbacktest.strategies.hybrid_alpha_5m_v1 import HybridAlpha5mV1Strategy
    from pmbacktest.strategies.hybrid_deepseek_v1 import HybridDeepseekV1Strategy
    from pmbacktest.strategies.mike_v1 import MikeV1Strategy
    from pmbacktest.strategies.rebound_switch_40 import ReboundSwitch40Strategy
    from pmbacktest.strategies.timed_btc_diff_round_v1 import TimedBtcDiffRoundV1Strategy

    r = StrategyRegistry()
    r.register_class("capital_first_volatility_v1", CapitalFirstVolatilityV1Strategy)
    r.register_class("ema_trough_slippage_v1", EmaTroughSlippageV1Strategy)
    r.register_class("hybrid_alpha_5m_v1", HybridAlpha5mV1Strategy)
    r.register_class("hybrid_deepseek_v1", HybridDeepseekV1Strategy)
    r.register_class("mike_v1", MikeV1Strategy)
    r.register_class("rebound_switch_40", ReboundSwitch40Strategy)
    r.register_class("timed_btc_diff_round_v1", TimedBtcDiffRoundV1Strategy)
    return r


def full_strategy_registry() -> StrategyRegistry:
    """Built-ins plus strategies under ``strategies/uploaded/*.py`` (see :mod:`upload_loader`)."""
    from pmbacktest.strategies.upload_loader import uploaded_strategy_registry

    return builtin_strategy_registry().merge(uploaded_strategy_registry())
