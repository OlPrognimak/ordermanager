"""Command-line entrypoint for single runs, batches, and parameter sweeps."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from pmbacktest.batch import BatchRunSpec, BatchRunner, iter_param_sweep
from pmbacktest.config.mongo_loader import load_config_document
from pmbacktest.config.run_build import build_tick_source
from pmbacktest.config_io import (
    execution_from_mapping,
    normalize_run_config_dict,
    risk_from_mapping,
)
from pmbacktest.core.session import BacktestSession, SessionConfig, SessionResult
from pmbacktest.data.csv_loader import csv_tick_stream
from pmbacktest.reports.generator import export_result
from pmbacktest.strategies.registry import StrategyRegistry, full_strategy_registry


def _load_json(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _registry() -> StrategyRegistry:
    return full_strategy_registry()


def _session_config_from_run_dict(cfg: dict[str, Any], *, data_path: str) -> SessionConfig:
    return SessionConfig(
        initial_cash=float(cfg.get("initial_cash", 10_000.0)),
        data_path=data_path,
        data_source_label=cfg.get("data_source_label"),
        risk=risk_from_mapping(cfg.get("risk")),
        strategy_name=str(cfg.get("strategy", "")),
        strategy_params=dict(cfg.get("strategy_params", {})),
        seed=cfg.get("seed"),
        time_start_ms=cfg.get("time_start_ms"),
        time_end_ms=cfg.get("time_end_ms"),
        liquidate_at_end=bool(cfg.get("liquidate_at_end", False)),
        strict_liquidation=bool(cfg.get("strict_liquidation", False)),
        strict_monotonic_time=bool(cfg.get("strict_monotonic_time", True)),
        equity_sample_stride=int(cfg.get("equity_sample_stride", 1)),
        settle_round_boundaries=bool(cfg.get("settle_round_boundaries", True)),
        forbid_open_first_ms_in_round=int(cfg.get("forbid_open_first_ms_in_round", 1_000)),
        forbid_open_last_ms_in_round=int(cfg.get("forbid_open_last_ms_in_round", 4_000)),
        instant_fill_on_submit=bool(cfg.get("instant_fill_on_submit", False)),
    )


def _execute_single_run(
    cfg: dict[str, Any],
    *,
    out_dir: Path,
    mongo_uri_override: str | None = None,
) -> None:
    cfg = normalize_run_config_dict(cfg)
    strat_name = cfg["strategy"]
    params = dict(cfg.get("strategy_params", {}))
    execution = execution_from_mapping(cfg.get("execution"))
    tick_src, path_meta = build_tick_source(cfg, mongo_uri_override=mongo_uri_override)
    session_cfg = _session_config_from_run_dict(cfg, data_path=path_meta if tick_src else str(cfg.get("data_path", "")))
    strategy = _registry().create(strat_name, params)
    engine = BacktestSession(execution=execution)

    if tick_src is not None:
        result = engine.run(tick_source=tick_src, strategy=strategy, config=session_cfg)
    else:
        dp = cfg.get("data_path")
        if not dp:
            raise SystemExit("CSV runs require data_path in config (or use data.type=mongo_own)")
        stream = csv_tick_stream(
            dp,
            time_start_ms=session_cfg.time_start_ms,
            time_end_ms=session_cfg.time_end_ms,
            strict_monotonic=session_cfg.strict_monotonic_time,
            soft_check_yes_no_sum=bool(cfg.get("soft_check_yes_no_sum", True)),
        )
        result = engine.run(tick_stream=stream, strategy=strategy, config=session_cfg)

    export_result(result, out_dir)
    print(f"run_id={result.run_id} exported to {out_dir}")


def cmd_run(args: argparse.Namespace) -> None:
    mongo_sel = sum(1 for x in (args.mongo_name, args.mongo_id) if x)
    has_file = bool(args.config)
    if has_file == (mongo_sel > 0):
        raise SystemExit("Provide exactly one of: --config FILE  OR  --mongo-name / --mongo-id")

    if args.config:
        cfg = _load_json(args.config)
        mongo_uri_override = args.mongo_uri
    else:
        uri = (args.mongo_uri or os.environ.get("MONGODB_URI") or "").strip()
        if not uri:
            raise SystemExit(
                "Loading config from MongoDB requires --mongo-uri or MONGODB_URI in the environment"
            )
        cfg = load_config_document(
            uri,
            config_db=args.mongo_config_db,
            config_collection=args.mongo_config_collection,
            name=args.mongo_name,
            document_id=args.mongo_id,
        )
        mongo_uri_override = args.mongo_uri

    out = Path(args.out or "runs")
    _execute_single_run(cfg, out_dir=out, mongo_uri_override=mongo_uri_override)


def cmd_batch(args: argparse.Namespace) -> None:
    cfg = _load_json(args.config)
    items = cfg["runs"]
    reg = _registry()
    specs: list[BatchRunSpec] = []
    for it in items:
        sname = it["strategy"]
        params = dict(it.get("strategy_params", {}))
        specs.append(
            BatchRunSpec(
                strategy=reg.create(sname, params),
                strategy_params=params,
                strategy_name=sname,
                data_path=it["data_path"],
                session_kwargs=dict(it.get("session", {})),
            )
        )
    out = Path(args.out or "runs")

    def _export(r: SessionResult) -> None:
        export_result(r, out)

    n = len(specs)
    BatchRunner(execution_map=cfg.get("execution"), risk_map=cfg.get("risk")).run_all(
        specs,
        on_result=_export,
        collect_results=False,
        workers=int(getattr(args, "workers", 1) or 1),
    )
    print(f"wrote {n} runs to {out}")


def cmd_sweep(args: argparse.Namespace) -> None:
    cfg = _load_json(args.config)
    data_path = cfg["data_path"]
    strat_name = cfg["strategy"]
    base = dict(cfg.get("strategy_params_base", {}))
    sweep = cfg["sweep"]
    skw = dict(cfg.get("session", {}))
    reg = _registry()
    specs: list[BatchRunSpec] = []
    for params in iter_param_sweep(base, sweep):
        specs.append(
            BatchRunSpec(
                strategy=reg.create(strat_name, params),
                strategy_params=params,
                strategy_name=strat_name,
                data_path=data_path,
                session_kwargs=skw,
            )
        )
    out = Path(args.out or "runs")

    def _export(r: SessionResult) -> None:
        export_result(r, out)

    n = len(specs)
    BatchRunner(execution_map=cfg.get("execution"), risk_map=cfg.get("risk")).run_all(
        specs,
        on_result=_export,
        collect_results=False,
        workers=int(getattr(args, "workers", 1) or 1),
    )
    print(f"sweep produced {n} runs in {out}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pmbacktest", description="Polymarket-style tick backtester")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="single strategy from JSON config or MongoDB backtest.config")
    r.add_argument("--config", help="path to run config JSON (mutually exclusive with Mongo selectors)")
    r.add_argument("--mongo-name", help="config document name/key in MongoDB backtest.config")
    r.add_argument("--mongo-id", help="config document ObjectId hex in MongoDB backtest.config")
    r.add_argument("--mongo-uri", help="MongoDB connection URI (or set MONGODB_URI / data.uri in doc)")
    r.add_argument("--mongo-config-db", default="backtest", help="database containing config collection")
    r.add_argument("--mongo-config-collection", default="config", help="collection name for run configs")
    r.add_argument("--out", default="runs", help="output directory")
    r.set_defaults(func=cmd_run)

    b = sub.add_parser("batch", help="multiple runs from JSON manifest")
    b.add_argument("--config", required=True)
    b.add_argument("--out", default="runs")
    b.add_argument("--workers", type=int, default=1, help="parallel worker processes (default: 1)")
    b.set_defaults(func=cmd_batch)

    s = sub.add_parser("sweep", help="parameter grid (Cartesian product)")
    s.add_argument("--config", required=True)
    s.add_argument("--out", default="runs")
    s.add_argument("--workers", type=int, default=1, help="parallel worker processes (default: 1)")
    s.set_defaults(func=cmd_sweep)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
