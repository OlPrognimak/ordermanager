"""Backtest session: orchestrates replay without importing metric or CSV implementations."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Mapping
import uuid

from pmbacktest.core.broker import SimulationBroker
from pmbacktest.core.clock import SimulationClock
from pmbacktest.core.engine_bundle import EngineBundle
from pmbacktest.core.event_loop import process_tick
from pmbacktest.core.liquidation import liquidate_open_positions
from pmbacktest.core.order_manager import OrderManager
from pmbacktest.core.portfolio_manager import PortfolioManager, RiskLimits
from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import ClosedTrade, EquityPoint, RunMeta, TickEvent
from pmbacktest.execution.fill_engine import FillEngine, MarketFillEngine
from pmbacktest.execution.models import ExecutionConfig, FixedFeeModel, LatencyModel

if TYPE_CHECKING:
    from pmbacktest.analytics.analyzer import PerformanceAnalyzer
    from pmbacktest.analytics.metrics import PerformanceReport
    from pmbacktest.data.ports import TickSource
    from pmbacktest.strategies.base import Strategy


@dataclass(frozen=True, slots=True)
class SessionConfig:
    """Reproducible run configuration (serializable)."""

    initial_cash: float = 10_000.0
    data_path: str = ""
    data_source_label: str | None = None
    risk: RiskLimits = field(default_factory=RiskLimits)
    strategy_name: str = ""
    strategy_params: Mapping[str, Any] = field(default_factory=dict)
    seed: int | None = None
    time_start_ms: int | None = None
    time_end_ms: int | None = None
    liquidate_at_end: bool = False
    strict_liquidation: bool = False
    strict_monotonic_time: bool = True
    #: Store every Nth equity point (1 = all ticks). Last tick is always retained for final equity.
    equity_sample_stride: int = 1
    #: At each UTC 5m boundary and once after the last tick, flatten at the last quote (new contract each round).
    settle_round_boundaries: bool = True
    #: Reject strategy OPEN_* in the first N ms of each UTC 5m round. Default 0: no implicit guard.
    forbid_open_first_ms_in_round: int = 0
    #: Reject strategy OPEN_* in the final N ms of each UTC 5m round. Default 0: no implicit guard.
    forbid_open_last_ms_in_round: int = 0
    #: When True, zero-latency orders submitted in ``on_tick`` can be filled on the same tick.
    instant_fill_on_submit: bool = False

    def __post_init__(self) -> None:
        if self.initial_cash <= 0:
            raise ValueError("initial_cash must be positive")
        if self.equity_sample_stride < 1:
            raise ValueError("equity_sample_stride must be >= 1")
        if self.forbid_open_first_ms_in_round < 0:
            raise ValueError("forbid_open_first_ms_in_round must be >= 0")
        if self.forbid_open_first_ms_in_round >= 5 * 60 * 1000:
            raise ValueError("forbid_open_first_ms_in_round must be < 5 minutes")
        if self.forbid_open_last_ms_in_round < 0:
            raise ValueError("forbid_open_last_ms_in_round must be >= 0")
        if self.forbid_open_last_ms_in_round >= 5 * 60 * 1000:
            raise ValueError("forbid_open_last_ms_in_round must be < 5 minutes")


@dataclass(slots=True)
class SessionResult:
    """Outputs of a single deterministic replay."""

    run_id: str
    meta: RunMeta
    closed_trades: list[ClosedTrade]
    equity_curve: list[EquityPoint]
    performance: "PerformanceReport"
    exposure_time_ms: int
    parameter_set: Mapping[str, Any] = field(default_factory=dict)
    strategy_debug_events: list[dict[str, Any]] = field(default_factory=list)


def _default_performance_analyzer():
    from pmbacktest.analytics.analyzer import LedgerPerformanceAnalyzer

    return LedgerPerformanceAnalyzer()


class BacktestSession:
    """
    High-level orchestrator (single run).

    Construct with either ``execution=`` (backward compatible) or an ``engine=`` bundle,
    or pass ``fill_engine=`` and ``latency=`` for custom execution without an ``ExecutionConfig``.
    """

    __slots__ = ("engine", "performance_analyzer")

    def __init__(
        self,
        execution: ExecutionConfig | None = None,
        *,
        engine: EngineBundle | None = None,
        fill_engine: FillEngine | None = None,
        latency: LatencyModel | None = None,
        performance_analyzer: "PerformanceAnalyzer | None" = None,
    ) -> None:
        if engine is not None:
            eng = engine
        elif execution is not None and fill_engine is None and latency is None:
            eng = EngineBundle.from_execution_config(execution)
        elif fill_engine is not None and latency is not None:
            eng = EngineBundle(fill_engine=fill_engine, latency=latency)
        else:
            raise ValueError(
                "Provide execution=, or engine=, or both fill_engine= and latency="
            )
        self.engine: EngineBundle = eng
        self.performance_analyzer = performance_analyzer or _default_performance_analyzer()

    @classmethod
    def from_execution_config(
        cls,
        execution: ExecutionConfig,
        *,
        performance_analyzer: "PerformanceAnalyzer | None" = None,
    ) -> BacktestSession:
        return cls(execution=execution, performance_analyzer=performance_analyzer)

    @property
    def fill_engine(self) -> FillEngine:
        return self.engine.fill_engine

    @property
    def execution_config(self) -> ExecutionConfig | None:
        fe = self.engine.fill_engine
        if isinstance(fe, MarketFillEngine):
            return fe.config
        return None

    def run(
        self,
        *,
        tick_stream: Iterator[TickEvent] | None = None,
        tick_source: TickSource | None = None,
        strategy: Strategy,
        config: SessionConfig,
        run_id: str | None = None,
    ) -> SessionResult:
        if tick_stream is None:
            if tick_source is None:
                raise ValueError("Provide tick_stream or tick_source")
            tick_stream = tick_source.iter_ticks()
        rid = run_id or uuid.uuid4().hex
        positions = PositionManager()
        fee_rate = 0.0
        exec_cfg = self.execution_config
        if exec_cfg is not None and isinstance(exec_cfg.fees, FixedFeeModel):
            fee_rate = float(exec_cfg.fees.rate)
        portfolio = PortfolioManager(
            initial_cash=config.initial_cash,
            positions=positions,
            risk=config.risk,
            run_id=rid,
            fee_rate=fee_rate,
        )
        clock = SimulationClock(0)
        orders = OrderManager(rid)
        broker = SimulationBroker(
            clock=clock,
            orders=orders,
            portfolio=portfolio,
            latency=self.engine.latency,
            forbid_open_first_ms_in_round=config.forbid_open_first_ms_in_round,
            forbid_open_last_ms_in_round=config.forbid_open_last_ms_in_round,
        )
        ctx = RunContext(
            run_id=rid,
            params=dict(config.strategy_params),
            seed=config.seed,
            _broker=broker,
            max_position_shares_per_side=(
                config.risk.max_position_shares_per_side
                if config.risk.apply_risk_limits
                else None
            ),
        )

        equity_curve: list[EquityPoint] = []
        exposure_ms = 0
        prev_ts: int | None = None
        tick_count = 0
        last_event: TickEvent | None = None
        prev_round_start_ms: int | None = None
        in_market = False
        last_equity_pt: EquityPoint | None = None
        stride = config.equity_sample_stride

        strategy.on_start(ctx)

        def _settle_round_if_needed(quote: TickEvent) -> None:
            """Cash out YES/NO at ``quote`` (resolution or last mid-round observation)."""
            nonlocal last_equity_pt
            if not config.settle_round_boundaries:
                return
            if not portfolio.has_open_inventory():
                return
            broker.set_event(quote)
            liquidate_open_positions(
                last=quote,
                portfolio=portfolio,
                fill_engine=self.engine.fill_engine,
                sink=strategy,
                ctx=ctx,
                strict=config.strict_liquidation,
                binary_settlement=True,
            )
            last_equity_pt = EquityPoint(
                timestamp_ms=quote.timestamp_ms,
                equity=portfolio.equity(quote),
                cash=portfolio.cash,
                unrealized_pnl=portfolio.equity(quote) - portfolio.cash,
                price=quote.price,
                yes=quote.yes,
                no=quote.no,
            )
            equity_curve.append(last_equity_pt)

        for event in tick_stream:
            if config.time_start_ms is not None and event.timestamp_ms < config.time_start_ms:
                continue
            if config.time_end_ms is not None and event.timestamp_ms > config.time_end_ms:
                break
            if last_event is not None and event.timestamp_ms < last_event.timestamp_ms:
                if config.strict_monotonic_time:
                    raise ValueError(
                        f"non-monotonic timestamp {event.timestamp_ms} after {last_event.timestamp_ms}"
                    )
            round_start = utc_five_minute_round_start_ms(event.timestamp_ms)
            if (
                config.settle_round_boundaries
                and last_event is not None
                and prev_round_start_ms is not None
                and round_start != prev_round_start_ms
            ):
                _settle_round_if_needed(last_event)

            broker.set_event(event)
            if prev_ts is not None and in_market:
                exposure_ms += max(0, event.timestamp_ms - prev_ts)
            pt = process_tick(
                event=event,
                clock=clock,
                orders=orders,
                portfolio=portfolio,
                fill_engine=self.engine.fill_engine,
                hooks=strategy,
                ctx=ctx,
                forbid_open_first_ms_in_round=config.forbid_open_first_ms_in_round,
                forbid_open_last_ms_in_round=config.forbid_open_last_ms_in_round,
                allow_same_tick_fills=bool(config.instant_fill_on_submit),
            )
            last_equity_pt = pt
            tick_count += 1
            if tick_count % stride == 0:
                equity_curve.append(pt)
            prev_ts = event.timestamp_ms
            last_event = event
            prev_round_start_ms = round_start
            in_market = portfolio.has_open_inventory()

        if last_equity_pt is not None and (
            not equity_curve or equity_curve[-1].timestamp_ms != last_equity_pt.timestamp_ms
        ):
            equity_curve.append(last_equity_pt)

        if last_event is not None and config.settle_round_boundaries:
            _settle_round_if_needed(last_event)
        elif last_event is not None and config.liquidate_at_end:
            broker.set_event(last_event)
            liquidate_open_positions(
                last=last_event,
                portfolio=portfolio,
                fill_engine=self.engine.fill_engine,
                sink=strategy,
                ctx=ctx,
                strict=config.strict_liquidation,
                binary_settlement=True,
            )
            pt = EquityPoint(
                timestamp_ms=last_event.timestamp_ms,
                equity=portfolio.equity(last_event),
                cash=portfolio.cash,
                unrealized_pnl=portfolio.equity(last_event) - portfolio.cash,
                price=last_event.price,
                yes=last_event.yes,
                no=last_event.no,
            )
            equity_curve.append(pt)

        strategy.on_finish(ctx)

        started = equity_curve[0].timestamp_ms if equity_curve else None
        ended = equity_curve[-1].timestamp_ms if equity_curve else None
        data_label = config.data_source_label if config.data_source_label is not None else config.data_path
        meta = RunMeta(
            run_id=rid,
            strategy_name=config.strategy_name or strategy.name,
            strategy_params=dict(config.strategy_params),
            data_source=data_label,
            started_ts_ms=started,
            ended_ts_ms=ended,
            tick_count=tick_count,
            seed=config.seed,
        )
        perf = self.performance_analyzer.analyze(
            closed_trades=portfolio.closed_trades,
            equity_curve=equity_curve,
            initial_cash=config.initial_cash,
            exposure_time_ms=exposure_ms,
            session_start_ms=started,
            session_end_ms=ended,
            run_id=rid,
            strategy_stats={
                "equity_sample_stride": stride,
                "equity_curve_subsampled": stride > 1,
                "settle_round_boundaries": config.settle_round_boundaries,
            },
        )
        strategy_debug_events: list[dict[str, Any]] = []
        maybe_debug = getattr(strategy, "debug_events", None)
        if isinstance(maybe_debug, list):
            strategy_debug_events = [dict(x) for x in maybe_debug if isinstance(x, dict)]
        return SessionResult(
            run_id=rid,
            meta=meta,
            closed_trades=list(portfolio.closed_trades),
            equity_curve=equity_curve,
            performance=perf,
            exposure_time_ms=exposure_ms,
            parameter_set=dict(config.strategy_params),
            strategy_debug_events=strategy_debug_events,
        )
