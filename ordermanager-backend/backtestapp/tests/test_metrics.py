from pmbacktest.analytics.metrics import compute_performance
from pmbacktest.core.types import ClosedTrade, EquityPoint, TokenSide


def test_compute_performance_basic() -> None:
    trades = [
        ClosedTrade(
            trade_id="a",
            run_id="r",
            side=TokenSide.YES,
            opened_ts_ms=0,
            closed_ts_ms=1000,
            quantity=1.0,
            entry_price=0.5,
            exit_price=0.6,
            fees_paid=0.0,
            realized_pnl=0.1,
            metadata={},
        ),
        ClosedTrade(
            trade_id="b",
            run_id="r",
            side=TokenSide.NO,
            opened_ts_ms=1000,
            closed_ts_ms=300_000 + 1000,
            quantity=1.0,
            entry_price=0.4,
            exit_price=0.3,
            fees_paid=0.0,
            realized_pnl=-0.1,
            metadata={},
        ),
    ]
    curve = [
        EquityPoint(0, 10_000.0, 10_000.0, 0.0),
        EquityPoint(1000, 10_000.1, 10_000.1, 0.0),
        EquityPoint(301_000, 10_000.0, 10_000.0, 0.0),
    ]
    rep = compute_performance(
        closed_trades=trades,
        equity_curve=curve,
        initial_cash=10_000.0,
        exposure_time_ms=301_000,
        session_start_ms=0,
        session_end_ms=301_000,
        run_id="r",
    )
    assert rep.num_trades == 2
    assert rep.win_rate == 0.5
    assert rep.strategy_stats.get("winning_rounds") == 1
    assert rep.strategy_stats.get("total_rounds") == 2
    assert abs(rep.realized_pnl_from_ledger) < 1e-9
