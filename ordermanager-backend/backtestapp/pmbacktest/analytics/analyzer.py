"""Pluggable performance aggregation (session stays free of metric formulas)."""

from __future__ import annotations

from typing import Any, Protocol

from pmbacktest.analytics.metrics import PerformanceReport, compute_performance
from pmbacktest.core.types import ClosedTrade, EquityPoint


class PerformanceAnalyzer(Protocol):
    """Build the final ``PerformanceReport`` from run artifacts."""

    def analyze(
        self,
        *,
        closed_trades: list[ClosedTrade],
        equity_curve: list[EquityPoint],
        initial_cash: float,
        exposure_time_ms: int,
        session_start_ms: int | None,
        session_end_ms: int | None,
        run_id: str,
        strategy_stats: dict[str, Any] | None = None,
    ) -> PerformanceReport:
        ...


class LedgerPerformanceAnalyzer:
    """Default: ledger trade stats + equity-curve drawdown (existing ``compute_performance``)."""

    def analyze(
        self,
        *,
        closed_trades: list[ClosedTrade],
        equity_curve: list[EquityPoint],
        initial_cash: float,
        exposure_time_ms: int,
        session_start_ms: int | None,
        session_end_ms: int | None,
        run_id: str,
        strategy_stats: dict[str, Any] | None = None,
    ) -> PerformanceReport:
        return compute_performance(
            closed_trades=closed_trades,
            equity_curve=equity_curve,
            initial_cash=initial_cash,
            exposure_time_ms=exposure_time_ms,
            session_start_ms=session_start_ms,
            session_end_ms=session_end_ms,
            run_id=run_id,
            strategy_stats=strategy_stats,
        )
