from pathlib import Path

from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.session import BacktestSession, SessionConfig
from pmbacktest.data.csv_loader import csv_tick_stream
from pmbacktest.strategies.rebound_switch_40 import ReboundSwitch40Strategy


def test_end_to_end_sample_csv() -> None:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "data_samples" / "btc_5m_sample.csv"
    execution = execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0})
    risk = risk_from_mapping({})
    cfg = SessionConfig(
        initial_cash=10_000.0,
        data_path=str(csv_path),
        risk=risk,
        strategy_name="rebound_switch_40",
        strategy_params={"trigger_cents": 40.0, "rebound_cents": 3.0, "bet_usd_per_order": 10.0},
        seed=1,
        # Sample CSV is one synthetic intra-round stream; disable per-round flatten for this smoke test.
        settle_round_boundaries=False,
    )
    strat = ReboundSwitch40Strategy(trigger_cents=40.0, rebound_cents=3.0, bet_usd_per_order=10.0)
    stream = csv_tick_stream(csv_path)
    eng = BacktestSession(execution=execution)
    res = eng.run(tick_stream=stream, strategy=strat, config=cfg)
    assert res.run_id
    assert res.meta.tick_count == 10
    assert len(res.equity_curve) == 10
    assert res.performance.initial_cash == 10_000.0
