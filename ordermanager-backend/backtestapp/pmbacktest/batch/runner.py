"""Batch execution with injectable builders (tests, custom data, parallel extensions)."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any, Mapping

from pmbacktest.analytics.analyzer import LedgerPerformanceAnalyzer, PerformanceAnalyzer
from pmbacktest.batch.spec import BatchRunSpec
from pmbacktest.config.run_build import build_tick_source
from pmbacktest.config_io import execution_from_mapping, risk_from_mapping
from pmbacktest.core.engine_bundle import EngineBundle
from pmbacktest.core.session import BacktestSession, SessionConfig, SessionResult
from pmbacktest.data.ports import TickSource
from pmbacktest.data.sources import BufferedTickSource, CsvFileTickSource
from pmbacktest.strategies.registry import full_strategy_registry


def default_tick_source_for_spec(spec: BatchRunSpec) -> TickSource:
    if spec.tick_source is not None:
        return spec.tick_source
    sk = dict(spec.session_kwargs)
    data = sk.get("data")
    if isinstance(data, dict) and str(data.get("type", "")).lower() == "mongo_own":
        cfg = {
            "data": data,
            "data_source_label": sk.get("data_source_label"),
            "time_start_ms": sk.get("time_start_ms"),
            "time_end_ms": sk.get("time_end_ms"),
        }
        src, _ = build_tick_source(cfg)
        return src
    src = CsvFileTickSource(
        spec.data_path,
        time_start_ms=sk.get("time_start_ms"),
        time_end_ms=sk.get("time_end_ms"),
        strict_monotonic=bool(sk.get("strict_monotonic_time", True)),
        soft_check_yes_no_sum=bool(sk.get("soft_check_yes_no_sum", True)),
    )
    return src


def _run_one_parallel(
    *,
    spec_payload: Mapping[str, Any],
    execution_map: Mapping[str, Any] | None,
    risk_map: Mapping[str, Any] | None,
    buffer_ticks: int | None,
) -> SessionResult:
    """Worker entrypoint for process-parallel batch execution."""
    reg = full_strategy_registry()
    sname = str(spec_payload["strategy_name"])
    params = dict(spec_payload.get("strategy_params", {}))
    skw = dict(spec_payload.get("session_kwargs", {}))
    strategy = reg.create(sname, params)
    spec = BatchRunSpec(
        strategy=strategy,
        strategy_params=params,
        strategy_name=sname,
        data_path=str(spec_payload.get("data_path", "")),
        session_kwargs=skw,
    )
    risk = risk_from_mapping(risk_map)
    execution = execution_from_mapping(execution_map)
    session = BacktestSession(
        execution=execution,
        performance_analyzer=LedgerPerformanceAnalyzer(),
    )
    src = default_tick_source_for_spec(spec)
    if buffer_ticks is not None:
        src = BufferedTickSource(src, size=buffer_ticks)
    data_path_meta = spec.data_path or getattr(src, "label", "")
    cfg = SessionConfig(
        initial_cash=float(spec.session_kwargs.get("initial_cash", 10_000.0)),
        data_path=data_path_meta,
        data_source_label=getattr(src, "label", data_path_meta),
        risk=risk,
        strategy_name=spec.strategy_name,
        strategy_params=dict(spec.strategy_params),
        seed=spec.session_kwargs.get("seed"),
        time_start_ms=spec.session_kwargs.get("time_start_ms"),
        time_end_ms=spec.session_kwargs.get("time_end_ms"),
        liquidate_at_end=bool(spec.session_kwargs.get("liquidate_at_end", False)),
        strict_liquidation=bool(spec.session_kwargs.get("strict_liquidation", False)),
        strict_monotonic_time=bool(spec.session_kwargs.get("strict_monotonic_time", True)),
        equity_sample_stride=int(spec.session_kwargs.get("equity_sample_stride", 1)),
        settle_round_boundaries=bool(spec.session_kwargs.get("settle_round_boundaries", True)),
        forbid_open_first_ms_in_round=int(spec.session_kwargs.get("forbid_open_first_ms_in_round", 1_000)),
        forbid_open_last_ms_in_round=int(spec.session_kwargs.get("forbid_open_last_ms_in_round", 4_000)),
    )
    return session.run(tick_source=src, strategy=spec.strategy, config=cfg)


class BatchRunner:
    """
    Runs many sessions with shared execution/risk defaults and pluggable hooks.

    ``on_result`` enables streaming exports without retaining all results in memory.
    """

    def __init__(
        self,
        *,
        execution_map: Mapping[str, Any] | None = None,
        risk_map: Mapping[str, Any] | None = None,
        engine_bundle: EngineBundle | None = None,
        performance_analyzer: PerformanceAnalyzer | None = None,
        tick_source_resolver: Callable[[BatchRunSpec], TickSource] = default_tick_source_for_spec,
        buffer_ticks: int | None = None,
    ) -> None:
        self._execution_map = execution_map
        self._risk_map = risk_map
        self._engine = engine_bundle
        self._performance_analyzer = performance_analyzer or LedgerPerformanceAnalyzer()
        self._tick_source_resolver = tick_source_resolver
        self._buffer_ticks = buffer_ticks

    def _make_session(self, execution_map: Mapping[str, Any] | None, risk_map: Mapping[str, Any] | None) -> BacktestSession:
        if self._engine is not None:
            return BacktestSession(
                engine=self._engine,
                performance_analyzer=self._performance_analyzer,
            )
        execution = execution_from_mapping(execution_map if execution_map is not None else self._execution_map)
        return BacktestSession(
            execution=execution,
            performance_analyzer=self._performance_analyzer,
        )

    def run_all(
        self,
        specs: Sequence[BatchRunSpec],
        *,
        execution_map: Mapping[str, Any] | None = None,
        risk_map: Mapping[str, Any] | None = None,
        on_result: Callable[[SessionResult], None] | None = None,
        collect_results: bool = True,
        workers: int = 1,
    ) -> list[SessionResult]:
        ex = execution_map if execution_map is not None else self._execution_map
        rk = risk_map if risk_map is not None else self._risk_map
        n_workers = max(1, int(workers))
        if n_workers > 1:
            if self._engine is not None:
                raise ValueError("parallel batch does not support custom engine_bundle")
            if self._tick_source_resolver is not default_tick_source_for_spec:
                raise ValueError("parallel batch requires default tick source resolver")
            payloads: list[dict[str, Any]] = []
            for spec in specs:
                if spec.tick_source is not None:
                    raise ValueError("parallel batch does not support spec.tick_source; use data_path/session.data")
                payloads.append(
                    {
                        "strategy_name": spec.strategy_name,
                        "strategy_params": dict(spec.strategy_params),
                        "data_path": spec.data_path,
                        "session_kwargs": dict(spec.session_kwargs),
                    }
                )
            out_par: list[SessionResult] = []
            with ProcessPoolExecutor(max_workers=n_workers) as ex_pool:
                futs = [
                    ex_pool.submit(
                        _run_one_parallel,
                        spec_payload=payload,
                        execution_map=ex,
                        risk_map=rk,
                        buffer_ticks=self._buffer_ticks,
                    )
                    for payload in payloads
                ]
                for fut in as_completed(futs):
                    res = fut.result()
                    if on_result is not None:
                        on_result(res)
                    if collect_results:
                        out_par.append(res)
            return out_par
        risk = risk_from_mapping(rk)
        session = self._make_session(ex, rk)
        out: list[SessionResult] = []
        for spec in specs:
            src = self._tick_source_resolver(spec)
            if self._buffer_ticks is not None:
                src = BufferedTickSource(src, size=self._buffer_ticks)
            data_path_meta = spec.data_path or getattr(src, "label", "")
            cfg = SessionConfig(
                initial_cash=float(spec.session_kwargs.get("initial_cash", 10_000.0)),
                data_path=data_path_meta,
                data_source_label=getattr(src, "label", data_path_meta),
                risk=risk,
                strategy_name=spec.strategy_name,
                strategy_params=dict(spec.strategy_params),
                seed=spec.session_kwargs.get("seed"),
                time_start_ms=spec.session_kwargs.get("time_start_ms"),
                time_end_ms=spec.session_kwargs.get("time_end_ms"),
                liquidate_at_end=bool(spec.session_kwargs.get("liquidate_at_end", False)),
                strict_liquidation=bool(spec.session_kwargs.get("strict_liquidation", False)),
                strict_monotonic_time=bool(spec.session_kwargs.get("strict_monotonic_time", True)),
                equity_sample_stride=int(spec.session_kwargs.get("equity_sample_stride", 1)),
                settle_round_boundaries=bool(spec.session_kwargs.get("settle_round_boundaries", True)),
                forbid_open_first_ms_in_round=int(
                    spec.session_kwargs.get("forbid_open_first_ms_in_round", 1_000)
                ),
                forbid_open_last_ms_in_round=int(
                    spec.session_kwargs.get("forbid_open_last_ms_in_round", 4_000)
                ),
                instant_fill_on_submit=bool(spec.session_kwargs.get("instant_fill_on_submit", False)),
            )
            res = session.run(tick_source=src, strategy=spec.strategy, config=cfg)
            if on_result is not None:
                on_result(res)
            if collect_results:
                out.append(res)
        return out


def run_batch(
    specs: Sequence[BatchRunSpec],
    *,
    execution_map: Mapping[str, Any] | None = None,
    risk_map: Mapping[str, Any] | None = None,
) -> list[SessionResult]:
    """Functional facade (backward compatible with the pre-refactor API)."""
    return BatchRunner(execution_map=execution_map, risk_map=risk_map).run_all(specs)


def iter_param_sweep(
    base_params: Mapping[str, Any],
    sweep: Mapping[str, Sequence[Any]],
):
    """Cartesian product of ``sweep`` keys (optimization-ready helper)."""
    from itertools import product

    keys = list(sweep.keys())
    values = [list(sweep[k]) for k in keys]
    for combo in product(*values):
        row = dict(base_params)
        for k, v in zip(keys, combo, strict=True):
            row[k] = v
        yield row
