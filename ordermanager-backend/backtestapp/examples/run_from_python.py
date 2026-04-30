"""Minimal programmatic run (no CLI). Run from repo root: python examples/run_from_python.py"""

from __future__ import annotations

from pathlib import Path

from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.session import BacktestSession, SessionConfig
from pmbacktest.data.sources import CsvFileTickSource
from pmbacktest.reports.generator import export_result
from pmbacktest.strategies.threshold import ThresholdDislocationStrategy


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data = root / "data_samples" / "btc_5m_sample.csv"
    execution = execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0})
    risk = risk_from_mapping({})
    cfg = SessionConfig(
        initial_cash=10_000.0,
        data_path=str(data),
        risk=risk,
        strategy_name="threshold",
        strategy_params={"skew_threshold": 15.0, "qty": 1.0},
        seed=7,
    )
    strat = ThresholdDislocationStrategy(skew_threshold=15.0, qty=1.0)
    source = CsvFileTickSource(data, strict_monotonic=True)
    engine = BacktestSession(execution=execution)
    res = engine.run(tick_source=source, strategy=strat, config=cfg)
    out = root / "runs_example"
    export_result(res, out)
    print(res.run_id, res.performance.total_pnl, out)


if __name__ == "__main__":
    main()
