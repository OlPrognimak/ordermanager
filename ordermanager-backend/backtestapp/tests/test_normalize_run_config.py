from pmbacktest.config_io import normalize_run_config_dict


def test_normalize_run_config_fills_snake_from_camel() -> None:
    raw = {
        "strategy": "momentum",
        "initialCash": 5000,
        "strategyParams": {"qty": 2},
        "timeStartMs": 100,
        "timeEndMs": 200,
        "datasetLabel": "stream-a",
        "settleRoundBoundaries": False,
    }
    out = normalize_run_config_dict(raw)
    assert out["initial_cash"] == 5000
    assert out["strategy_params"] == {"qty": 2}
    assert out["time_start_ms"] == 100
    assert out["time_end_ms"] == 200
    assert out["data_source_label"] == "stream-a"
    assert out["settle_round_boundaries"] is False
    assert out["initialCash"] == 5000


def test_normalize_maps_simulation_speed() -> None:
    out = normalize_run_config_dict({"simulationSpeed": 4})
    assert out["simulation_speed"] == 4


def test_normalize_run_config_keeps_snake_when_present() -> None:
    raw = {
        "initial_cash": 9999,
        "initialCash": 1,
    }
    out = normalize_run_config_dict(raw)
    assert out["initial_cash"] == 9999
