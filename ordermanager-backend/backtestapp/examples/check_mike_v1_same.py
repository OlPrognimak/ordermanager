#!/usr/bin/env python3
"""Compare mike_v1 exported debug extrema vs offline detector recomputation."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pmbacktest.strategies.mike_v1 import _SideDetector

WINDOW_MS = 5 * 60 * 1000


@dataclass(frozen=True)
class EventRow:
    ts_ms: int
    kind: str
    side: str


def _fnum(value: object) -> float | None:
    if isinstance(value, (int, float)):
        v = float(value)
        if v == v and v not in (float("inf"), float("-inf")):
            return v
    return None


def _pnum(params: dict[str, object], *keys: str, default: float) -> float:
    for k in keys:
        v = _fnum(params.get(k))
        if v is not None:
            return v
    return float(default)


def _pstr(params: dict[str, object], *keys: str, default: str) -> str:
    for k in keys:
        v = params.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return default


def _extract_saved_events(rows: list[dict[str, object]]) -> list[EventRow]:
    out: list[EventRow] = []
    for row in rows:
        if row.get("phase") != "accepted_extrema":
            continue
        kind = row.get("kind")
        side = row.get("side")
        if not isinstance(kind, str) or not isinstance(side, str):
            continue
        ts = _fnum(row.get("emitted_ts_ms"))
        if ts is None:
            ts = _fnum(row.get("ts_ms"))
        if ts is None:
            continue
        out.append(EventRow(ts_ms=int(ts), kind=kind, side=side))
    out.sort(key=lambda x: (x.ts_ms, x.side, x.kind))
    return out


def _make_detector(params: dict[str, object]) -> _SideDetector:
    location_mode = _pstr(params, "extrema_location_mode", "extremaLocationMode", default="spread_anchored").lower()
    return _SideDetector(
        span=int(_pnum(params, "span", default=20)),
        noise_filter=_pstr(params, "noise_filter", "noiseFilter", default="gaussian").lower(),
        structural_hysteresis=_pnum(
            params,
            "quote_structural_hysteresis_cents",
            "quoteStructuralHysteresisCents",
            default=0.1,
        ),
        sustained_tangent_ms=int(_pnum(params, "sustained_tangent_ms", "sustainedTangentMs", default=1000)),
        max_valley_ask_exclusive=_pnum(
            params,
            "valley_max_raw_ask_cents",
            "valleyMaxRawAskCents",
            default=45.0,
        ),
        valley_to_peak_min_cents=_pnum(
            params,
            "valley_to_peak_raw_spread_min_cents",
            "valleyToPeakRawSpreadMinCents",
            default=10.0,
        ),
        anchor_to_quote_series=location_mode == "spread_anchored",
    )


def _slice_by_window(events: list[EventRow], start_ms: int | None, rounds: int) -> list[EventRow]:
    if start_ms is None:
        return events
    end_ms = start_ms + max(1, rounds) * WINDOW_MS
    return [x for x in events if start_ms <= x.ts_ms < end_ms]


def _recompute_events(result: dict[str, Any]) -> list[EventRow]:
    meta = result.get("meta") if isinstance(result.get("meta"), dict) else {}
    params = meta.get("strategy_params") if isinstance(meta, dict) and isinstance(meta.get("strategy_params"), dict) else {}
    equity = result.get("equity")
    if not isinstance(equity, list):
        raise ValueError("result JSON has no `equity` array")
    points = [x for x in equity if isinstance(x, dict)]
    points.sort(key=lambda x: int(_fnum(x.get("timestamp_ms")) or -1))

    yes = _make_detector(params)
    no = _make_detector(params)
    out: list[EventRow] = []
    round_start_ms: int | None = None

    for p in points:
        ts = _fnum(p.get("timestamp_ms"))
        if ts is None:
            continue
        ts_i = int(ts)
        this_round_start = ts_i - (ts_i % WINDOW_MS)
        if round_start_ms != this_round_start:
            if round_start_ms is not None:
                yes = _make_detector(params)
                no = _make_detector(params)
            round_start_ms = this_round_start

        yes_ask = _fnum(p.get("yes_ask"))
        yes_bid = _fnum(p.get("yes_bid"))
        no_ask = _fnum(p.get("no_ask"))
        no_bid = _fnum(p.get("no_bid"))
        if yes_ask is None:
            yes_ask = _fnum(p.get("yes"))
        if no_ask is None:
            no_ask = _fnum(p.get("no"))
        if yes_bid is None:
            yes_bid = yes_ask
        if no_bid is None:
            no_bid = no_ask
        if yes_ask is None or yes_bid is None or no_ask is None or no_bid is None:
            continue

        sig_yes = yes.update(ts_ms=ts_i, ask=yes_ask, bid=yes_bid)
        if sig_yes and yes.last_emitted_idx is not None:
            out.append(EventRow(ts_ms=int(yes.times[yes.last_emitted_idx]), kind=sig_yes, side="yes"))
        sig_no = no.update(ts_ms=ts_i, ask=no_ask, bid=no_bid)
        if sig_no and no.last_emitted_idx is not None:
            out.append(EventRow(ts_ms=int(no.times[no.last_emitted_idx]), kind=sig_no, side="no"))

    out.sort(key=lambda x: (x.ts_ms, x.side, x.kind))
    return out


def _print_diff(left: list[EventRow], right: list[EventRow]) -> int:
    i = 0
    while i < len(left) and i < len(right):
        if left[i] != right[i]:
            print("Mismatch at index", i)
            print(" saved :", left[i])
            print(" recompute:", right[i])
            return 1
        i += 1
    if len(left) != len(right):
        print("Length mismatch:")
        print(" saved :", len(left))
        print(" recompute:", len(right))
        if i < len(left):
            print(" next saved :", left[i])
        if i < len(right):
            print(" next recompute:", right[i])
        return 1
    print("OK: saved events and recomputed events match exactly.")
    print("event_count =", len(left))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("result_json", type=Path, help="Path to exported backtest result JSON")
    parser.add_argument(
        "--round-start-ms",
        type=int,
        default=None,
        help="Optional UTC 5m window start timestamp; compare only this window (or windows with --rounds).",
    )
    parser.add_argument("--rounds", type=int, default=1, help="Window count when --round-start-ms is provided")
    args = parser.parse_args()

    obj = json.loads(args.result_json.read_text(encoding="utf-8"))
    if not isinstance(obj, dict):
        raise ValueError("Result JSON root must be an object")

    raw_debug = obj.get("strategy_debug_events")
    if not isinstance(raw_debug, list):
        raise ValueError(
            "No `strategy_debug_events` found. Re-run mike_v1 with strategy param `debug_trace=true`."
        )
    saved = _extract_saved_events([x for x in raw_debug if isinstance(x, dict)])
    recomputed = _recompute_events(obj)
    saved = _slice_by_window(saved, args.round_start_ms, args.rounds)
    recomputed = _slice_by_window(recomputed, args.round_start_ms, args.rounds)
    return _print_diff(saved, recomputed)


if __name__ == "__main__":
    raise SystemExit(main())
