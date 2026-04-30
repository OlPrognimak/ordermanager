"""Human and machine-readable exports for session results."""

from __future__ import annotations

import csv
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from pmbacktest.analytics.utc5m_round_checks import build_utc5m_round_open_checks
from pmbacktest.core.session import SessionResult
from pmbacktest.core.types import ClosedTrade, EquityPoint


def _json_safe(x: Any) -> Any:
    if isinstance(x, float):
        if x != x:  # NaN
            return None
        if x == float("inf") or x == float("-inf"):
            return str(x)
    if isinstance(x, dict):
        return {k: _json_safe(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_json_safe(v) for v in x]
    return x


def _equity_gui_dict(p: EquityPoint) -> dict[str, Any]:
    row: dict[str, Any] = {
        "timestamp_ms": p.timestamp_ms,
        "equity": p.equity,
        "cash": p.cash,
        "unrealized_pnl": p.unrealized_pnl,
    }
    if p.price is not None:
        row["price"] = p.price
    if p.yes is not None:
        row["yes"] = p.yes
    if p.no is not None:
        row["no"] = p.no
    if p.yes_bid is not None:
        row["yes_bid"] = p.yes_bid
    if p.yes_ask is not None:
        row["yes_ask"] = p.yes_ask
    if p.no_bid is not None:
        row["no_bid"] = p.no_bid
    if p.no_ask is not None:
        row["no_ask"] = p.no_ask
    return row


def _trade_gui_dict(t: ClosedTrade) -> dict[str, Any]:
    md = dict(t.metadata or {})
    bet_usd_amount = md.get("bet_usd_amount")
    order_count = md.get("order_count")
    return {
        "trade_id": t.trade_id,
        "side": t.side.value,
        "opened_ts_ms": t.opened_ts_ms,
        "closed_ts_ms": t.closed_ts_ms,
        "quantity": t.quantity,
        "entry_price": t.entry_price,
        "exit_price": t.exit_price,
        "fees_paid": t.fees_paid,
        "realized_pnl": t.realized_pnl,
        "bet_usd_amount": float(bet_usd_amount) if isinstance(bet_usd_amount, (int, float)) else t.quantity * t.entry_price,
        "order_count": int(order_count) if isinstance(order_count, (int, float)) else 1,
    }


def export_gui_bundle(result: SessionResult, out_dir: str | Path) -> Path:
    """Write a single JSON file matching the dashboard ``BacktestResult`` shape (trades + equity inline)."""
    d = Path(out_dir)
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{result.run_id}_gui.json"
    round_checks = build_utc5m_round_open_checks(result.equity_curve)
    payload = {
        "run_id": result.run_id,
        "meta": _json_safe(asdict(result.meta)),
        "performance": _json_safe(asdict(result.performance)),
        "parameter_set": _json_safe(dict(result.parameter_set)),
        "strategy_debug_events": _json_safe(result.strategy_debug_events),
        "trades": [_trade_gui_dict(t) for t in result.closed_trades],
        "equity": [_equity_gui_dict(p) for p in result.equity_curve],
        "utc5m_round_open_checks": _json_safe(round_checks),
        "utc5m_round_open_checks_summary": _json_safe(
            {
                "windows_checked": len(round_checks),
                "all_near_50_mid": all(r["near_50_mid"] for r in round_checks) if round_checks else True,
            }
        ),
    }
    path.write_text(json.dumps(_json_safe(payload), indent=2), encoding="utf-8")
    return path


def export_result(result: SessionResult, out_dir: str | Path) -> None:
    """Write summary JSON, trades CSV, equity CSV, and GUI bundle under ``out_dir``."""
    d = Path(out_dir)
    d.mkdir(parents=True, exist_ok=True)
    summary_path = d / f"{result.run_id}_summary.json"
    trades_path = d / f"{result.run_id}_trades.csv"
    equity_path = d / f"{result.run_id}_equity.csv"

    round_checks = build_utc5m_round_open_checks(result.equity_curve)
    payload = {
        "run_id": result.run_id,
        "meta": asdict(result.meta),
        "performance": _json_safe(asdict(result.performance)),
        "parameter_set": dict(result.parameter_set),
        "strategy_debug_events": _json_safe(result.strategy_debug_events),
        "utc5m_round_open_checks": _json_safe(round_checks),
        "utc5m_round_open_checks_summary": _json_safe(
            {
                "windows_checked": len(round_checks),
                "all_near_50_mid": all(r["near_50_mid"] for r in round_checks) if round_checks else True,
            }
        ),
    }
    summary_path.write_text(json.dumps(_json_safe(payload), indent=2), encoding="utf-8")

    with trades_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "trade_id",
                "side",
                "opened_ts_ms",
                "closed_ts_ms",
                "quantity",
                "entry_price",
                "exit_price",
                "fees_paid",
                "realized_pnl",
            ]
        )
        for t in result.closed_trades:
            w.writerow(
                [
                    t.trade_id,
                    t.side.value,
                    t.opened_ts_ms,
                    t.closed_ts_ms,
                    t.quantity,
                    t.entry_price,
                    t.exit_price,
                    t.fees_paid,
                    t.realized_pnl,
                ]
            )

    with equity_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp_ms", "equity", "cash", "unrealized_pnl"])
        for p in result.equity_curve:
            w.writerow([p.timestamp_ms, p.equity, p.cash, p.unrealized_pnl])

    export_gui_bundle(result, out_dir)
