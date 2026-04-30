"""Load execution and risk settings from plain JSON-friendly dicts."""

from __future__ import annotations

from typing import Any, Mapping

from pmbacktest.core.portfolio_manager import RiskLimits
from pmbacktest.execution.models import (
    ExecutionConfig,
    FixedFeeModel,
    FixedLatencyMs,
    LinearSlippageModel,
)

# GUI / HTTP payloads often use camelCase; JSON files use snake_case. Prefer snake when both exist.
_RUN_CONFIG_ALIASES: tuple[tuple[str, str], ...] = (
    ("initialCash", "initial_cash"),
    ("strategyParams", "strategy_params"),
    ("timeStartMs", "time_start_ms"),
    ("timeEndMs", "time_end_ms"),
    ("datasetLabel", "data_source_label"),
    ("settleRoundBoundaries", "settle_round_boundaries"),
    ("stopLossPct", "stop_loss_pct"),
    ("takeProfitPct", "take_profit_pct"),
    ("dataGranularityMs", "data_granularity_ms"),
    ("simulationSpeed", "simulation_speed"),
    ("forbidOpenFirstMsInRound", "forbid_open_first_ms_in_round"),
    ("forbidOpenLastMsInRound", "forbid_open_last_ms_in_round"),
    ("instantFillOnSubmit", "instant_fill_on_submit"),
)


def normalize_run_config_dict(cfg: Mapping[str, Any]) -> dict[str, Any]:
    """
    Return a shallow copy of ``cfg`` with snake_case keys filled from camelCase aliases.

    For each pair ``(camel, snake)``, sets ``out[snake] = cfg[camel]`` only when ``snake`` is absent.
    """
    out = dict(cfg)
    for camel, snake in _RUN_CONFIG_ALIASES:
        if snake not in out and camel in out:
            out[snake] = out[camel]
    return out


def execution_from_mapping(m: Mapping[str, Any] | None) -> ExecutionConfig:
    m = m or {}
    return ExecutionConfig(
        slippage=LinearSlippageModel(float(m.get("slippage_fraction", 0.0))),
        fees=FixedFeeModel(float(m.get("fee_rate", 0.0))),
        latency=FixedLatencyMs(int(m.get("latency_ms", 0))),
    )


def risk_from_mapping(m: Mapping[str, Any] | None) -> RiskLimits:
    m = m or {}
    return RiskLimits(
        max_position_shares_per_side=m.get("max_position_shares_per_side"),
        max_gross_notional_usd=m.get("max_gross_notional_usd"),
        max_concurrent_sides=m.get("max_concurrent_sides"),
        require_cash_covers_open=bool(m.get("require_cash_covers_open", True)),
        open_notional_buffer_rate=float(m.get("open_notional_buffer_rate", 0.0)),
        apply_risk_limits=bool(m.get("apply_risk_limits", False)),
    )
