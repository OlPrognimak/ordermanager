"""
Example: load run parameters from ``backtest.config`` and stream ticks from ``own``.

Requires: pip install 'pmbacktest[mongodb]'
Environment: MONGODB_URI (unless you pass uri= below).
"""

from __future__ import annotations

import os

from pmbacktest.config.mongo_loader import load_config_document
from pmbacktest.config.run_build import build_tick_source
from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.session import BacktestSession, SessionConfig
from pmbacktest.reports.generator import export_result
from pmbacktest.strategies.registry import full_strategy_registry


def main() -> None:
    uri = os.environ.get("MONGODB_URI", "")
    if not uri:
        raise SystemExit("Set MONGODB_URI")
    cfg = load_config_document(uri, name="btc_updown_default")
    tick_src, path_meta = build_tick_source(cfg)
    if tick_src is None:
        raise SystemExit("Config must use data.type=mongo_own for this example")
    reg = full_strategy_registry()
    strat = reg.create(cfg["strategy"], dict(cfg.get("strategy_params", {})))
    session_cfg = SessionConfig(
        initial_cash=float(cfg.get("initial_cash", 10_000.0)),
        data_path=path_meta,
        data_source_label=cfg.get("data_source_label"),
        risk=risk_from_mapping(cfg.get("risk")),
        strategy_name=cfg["strategy"],
        strategy_params=dict(cfg.get("strategy_params", {})),
        seed=cfg.get("seed"),
        time_start_ms=cfg.get("time_start_ms"),
        time_end_ms=cfg.get("time_end_ms"),
        liquidate_at_end=bool(cfg.get("liquidate_at_end", False)),
        strict_liquidation=bool(cfg.get("strict_liquidation", False)),
        strict_monotonic_time=bool(cfg.get("strict_monotonic_time", True)),
        equity_sample_stride=int(cfg.get("equity_sample_stride", 1)),
    )
    eng = BacktestSession(execution=execution_from_mapping(cfg.get("execution")))
    res = eng.run(tick_source=tick_src, strategy=strat, config=session_cfg)
    out = os.path.join(os.path.dirname(__file__), "..", "runs_mongo_example")
    export_result(res, out)
    print(res.run_id, out)


if __name__ == "__main__":
    main()
