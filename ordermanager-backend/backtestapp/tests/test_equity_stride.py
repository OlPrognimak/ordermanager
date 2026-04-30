from pathlib import Path

from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.session import BacktestSession, SessionConfig
from pmbacktest.data.csv_loader import csv_tick_stream
from pmbacktest.strategies.base import Strategy
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent


class _NullStrategy(Strategy):
    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        _ = event, ctx


def test_equity_stride_reduces_points() -> None:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "data_samples" / "btc_5m_sample.csv"
    execution = execution_from_mapping({"fee_rate": 0.0, "latency_ms": 0})
    cfg = SessionConfig(
        initial_cash=10_000.0,
        data_path=str(csv_path),
        risk=risk_from_mapping({}),
        strategy_name="null",
        equity_sample_stride=3,
    )
    stream = csv_tick_stream(csv_path)
    eng = BacktestSession(execution=execution)
    res = eng.run(tick_stream=stream, strategy=_NullStrategy(), config=cfg)
    assert res.meta.tick_count == 10
    assert len(res.equity_curve) < 10
    assert res.performance.strategy_stats.get("equity_curve_subsampled") is True
