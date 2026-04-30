import pytest

from pmbacktest.batch import BatchRunSpec, BatchRunner, run_batch
from pmbacktest.strategies.rebound_switch_40 import ReboundSwitch40Strategy


def test_batch_run_spec_requires_path_or_source() -> None:
    with pytest.raises(ValueError):
        BatchRunSpec(
            strategy=ReboundSwitch40Strategy(trigger_cents=40.0, rebound_cents=3.0, bet_usd_per_order=10.0),
            strategy_params={},
            strategy_name="m",
            data_path="",
            tick_source=None,
        )


def test_run_batch_smoke() -> None:
    root = __import__("pathlib").Path(__file__).resolve().parents[1]
    csv_path = root / "data_samples" / "btc_5m_sample.csv"
    spec = BatchRunSpec(
        strategy=ReboundSwitch40Strategy(trigger_cents=40.0, rebound_cents=3.0, bet_usd_per_order=10.0),
        strategy_params={"trigger_cents": 40.0, "rebound_cents": 3.0, "bet_usd_per_order": 10.0},
        strategy_name="rebound_switch_40",
        data_path=str(csv_path),
        session_kwargs={"initial_cash": 10_000.0},
    )
    results = run_batch([spec], execution_map={"fee_rate": 0.0, "latency_ms": 0}, risk_map={})
    assert len(results) == 1
    assert results[0].meta.tick_count == 10


def test_batch_runner_streaming_callback() -> None:
    root = __import__("pathlib").Path(__file__).resolve().parents[1]
    csv_path = root / "data_samples" / "btc_5m_sample.csv"
    spec = BatchRunSpec(
        strategy=ReboundSwitch40Strategy(trigger_cents=40.0, rebound_cents=3.0, bet_usd_per_order=10.0),
        strategy_params={},
        strategy_name="rebound_switch_40",
        data_path=str(csv_path),
    )
    seen: list[str] = []

    def _cb(r) -> None:  # noqa: ANN001
        seen.append(r.run_id)

    BatchRunner(
        execution_map={"fee_rate": 0.0, "latency_ms": 0},
        risk_map={},
    ).run_all([spec], on_result=_cb, collect_results=False)
    assert len(seen) == 1
