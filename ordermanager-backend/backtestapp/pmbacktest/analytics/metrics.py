"""Performance metrics: closed-trade statistics plus equity-curve drawdown."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pmbacktest.core.broker import MARKET_WINDOW_MS
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import ClosedTrade, EquityPoint


@dataclass(frozen=True, slots=True)
class PerformanceReport:
    """Aggregated analytics for a single run."""

    run_id: str
    total_pnl: float
    roi: float
    realized_pnl_from_ledger: float
    win_rate: float
    num_trades: int
    num_winners: int
    num_losers: int
    avg_trade_return: float
    avg_winner: float
    avg_loser: float
    profit_factor: float
    max_drawdown_abs: float
    max_drawdown_pct: float
    exposure_time_ms: int
    avg_trade_duration_ms: float
    final_equity: float
    initial_cash: float
    strategy_stats: dict[str, Any] = field(default_factory=dict)


def _extent_ms(
    closed_trades: list[ClosedTrade], equity_curve: list[EquityPoint]
) -> tuple[int, int] | None:
    t0 = float("inf")
    t1 = float("-inf")
    for p in equity_curve:
        t0 = min(t0, p.timestamp_ms)
        t1 = max(t1, p.timestamp_ms)
    for tr in closed_trades:
        t0 = min(t0, tr.opened_ts_ms, tr.closed_ts_ms)
        t1 = max(t1, tr.opened_ts_ms, tr.closed_ts_ms)
    if not (t0 < float("inf") and t1 > float("-inf")):
        return None
    return int(t0), int(t1)


def _win_rate_utc5m_rounds(
    closed_trades: list[ClosedTrade], equity_curve: list[EquityPoint]
) -> tuple[float, int, int]:
    """
    Winning rounds / total UTC 5m rounds overlapping the run (same grid as dashboard).

    A round wins if the sum of ``realized_pnl`` for closes with
    ``closed_ts_ms`` in ``[round_start, round_start + 5m)`` is strictly positive.
    """
    ext = _extent_ms(closed_trades, equity_curve)
    if ext is None:
        return 0.0, 0, 0
    t0, t1 = ext
    ws = utc_five_minute_round_start_ms(t0)
    last_start = utc_five_minute_round_start_ms(t1)
    winning = 0
    total = 0
    cur = ws
    while cur <= last_start:
        we = cur + MARKET_WINDOW_MS
        pnl = sum(
            tr.realized_pnl
            for tr in closed_trades
            if cur <= tr.closed_ts_ms < we
        )
        if pnl > 0.0:
            winning += 1
        total += 1
        cur += MARKET_WINDOW_MS
    rate = (winning / total) if total else 0.0
    return rate, winning, total


def _max_drawdown(equity: list[float]) -> tuple[float, float]:
    peak = float("-inf")
    max_dd = 0.0
    max_dd_pct = 0.0
    for x in equity:
        peak = max(peak, x)
        dd = peak - x
        max_dd = max(max_dd, dd)
        if peak > 0:
            max_dd_pct = max(max_dd_pct, dd / peak)
    return max_dd, max_dd_pct


def compute_performance(
    *,
    closed_trades: list[ClosedTrade],
    equity_curve: list[EquityPoint],
    initial_cash: float,
    exposure_time_ms: int,
    session_start_ms: int | None,
    session_end_ms: int | None,
    run_id: str = "",
    strategy_stats: dict[str, Any] | None = None,
) -> PerformanceReport:
    """Derive headline metrics from the trade ledger and equity path."""
    n = len(closed_trades)
    realized = 0.0
    nw = nl = nf = 0
    gross_win = 0.0
    gross_loss_abs = 0.0
    for t in closed_trades:
        p = t.realized_pnl
        realized += p
        if p > 0:
            nw += 1
            gross_win += p
        elif p < 0:
            nl += 1
            gross_loss_abs += -p
        else:
            nf += 1
    win_rate, winning_rounds, total_rounds = _win_rate_utc5m_rounds(
        closed_trades, equity_curve
    )
    avg_trade = (realized / n) if n else 0.0
    avg_w = (gross_win / nw) if nw else 0.0
    avg_l = (-gross_loss_abs / nl) if nl else 0.0
    gross_loss = gross_loss_abs
    profit_factor = (
        (gross_win / gross_loss) if gross_loss > 1e-12 else (float("inf") if gross_win > 0 else 0.0)
    )

    series = [p.equity for p in equity_curve] if equity_curve else [initial_cash]
    max_dd, max_dd_pct = _max_drawdown(series)
    final_eq = series[-1] if series else initial_cash
    total_pnl = final_eq - initial_cash
    roi = (total_pnl / initial_cash) if initial_cash else 0.0

    durations = [t.closed_ts_ms - t.opened_ts_ms for t in closed_trades]
    avg_dur = (sum(durations) / len(durations)) if durations else 0.0

    return PerformanceReport(
        run_id=run_id,
        total_pnl=total_pnl,
        roi=roi,
        realized_pnl_from_ledger=realized,
        win_rate=win_rate,
        num_trades=n,
        num_winners=nw,
        num_losers=nl,
        avg_trade_return=avg_trade,
        avg_winner=avg_w,
        avg_loser=avg_l,
        profit_factor=profit_factor,
        max_drawdown_abs=max_dd,
        max_drawdown_pct=max_dd_pct,
        exposure_time_ms=exposure_time_ms,
        avg_trade_duration_ms=avg_dur,
        final_equity=final_eq,
        initial_cash=initial_cash,
        strategy_stats={
            "session_start_ms": session_start_ms,
            "session_end_ms": session_end_ms,
            "breakeven_trades": nf,
            "winning_rounds": winning_rounds,
            "total_rounds": total_rounds,
            "win_rate_closed_positions": (nw / n) if n else 0.0,
            **(strategy_stats or {}),
        },
    )
