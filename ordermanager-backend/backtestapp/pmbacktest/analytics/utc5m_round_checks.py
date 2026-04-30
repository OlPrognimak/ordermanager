"""Validate first in-window YES/NO mids vs 50¢ per UTC 5-minute market."""

from __future__ import annotations

from typing import Any

from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import EquityPoint

MARKET_WINDOW_MS = 5 * 60 * 1000


def build_utc5m_round_open_checks(
    equity_curve: list[EquityPoint],
    *,
    mid_cents: float = 50.0,
    tolerance_cents: float = 2.0,
) -> list[dict[str, Any]]:
    """
    For each UTC window ``[ws, ws + 5min)`` that has at least one tick with ``yes`` and ``no``,
    record the **first** such tick and whether both mids are within ``tolerance_cents`` of ``mid_cents``.

    Timestamps are interpreted like the rest of the engine: epoch ms, boundaries at UTC minute % 5 == 0.
    """
    if not equity_curve:
        return []

    sorted_pts = sorted(equity_curve, key=lambda p: p.timestamp_ms)
    first_by_window: dict[int, EquityPoint] = {}
    for p in sorted_pts:
        if p.yes is None or p.no is None:
            continue
        ws = utc_five_minute_round_start_ms(p.timestamp_ms)
        if ws not in first_by_window:
            first_by_window[ws] = p

    out: list[dict[str, Any]] = []
    for ws in sorted(first_by_window):
        p = first_by_window[ws]
        we = ws + MARKET_WINDOW_MS
        y_ok = abs(float(p.yes) - mid_cents) <= tolerance_cents
        n_ok = abs(float(p.no) - mid_cents) <= tolerance_cents
        out.append(
            {
                "window_start_ms": ws,
                "window_end_ms": we,
                "first_tick_ms": p.timestamp_ms,
                "yes_mid_cents": float(p.yes),
                "no_mid_cents": float(p.no),
                "near_50_mid": y_ok and n_ok,
            }
        )
    return out
