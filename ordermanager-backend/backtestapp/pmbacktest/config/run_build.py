"""Resolve Mongo URI and construct tick sources from a run config dict (JSON or MongoDB)."""

from __future__ import annotations

import os
from typing import Any

from pmbacktest.data.mongo_own import MongoOwnMergedTickSource
from pmbacktest.data.ports import TickSource


def resolve_mongo_uri(cfg: dict[str, Any], override: str | None) -> str:
    if override and override.strip():
        return override.strip()
    data = cfg.get("data") or {}
    inline = data.get("uri")
    if isinstance(inline, str) and inline.strip():
        return inline.strip()
    env_key = data.get("uri_env") or "MONGODB_URI"
    u = os.environ.get(str(env_key), "")
    if not u.strip():
        raise ValueError(
            f"MongoDB URI not set: use data.uri, --mongo-uri, or environment variable {env_key!r}"
        )
    return u.strip()


def build_tick_source(
    cfg: dict[str, Any],
    *,
    mongo_uri_override: str | None = None,
) -> tuple[TickSource | None, str]:
    """
    Return ``(tick_source, data_path_for_meta)``.

    - ``data.type`` missing or ``\"csv\"`` → ``(None, cfg[\"data_path\"])``.
    - ``data.type == \"mongo_own\"`` → merged Mongo source; ``data_path_for_meta`` is
      ``data.data_source_label`` or the source ``label``.
    """
    data = cfg.get("data") or {}
    dtype = (data.get("type") or "csv").lower()
    if dtype in ("csv", "file", ""):
        path = str(cfg.get("data_path") or "")
        return None, path
    if dtype == "mongo_own":
        uri = resolve_mongo_uri(cfg, mongo_uri_override)
        t0 = data.get("time_start_ms")
        if t0 is None:
            t0 = cfg.get("time_start_ms")
        t1 = data.get("time_end_ms")
        if t1 is None:
            t1 = cfg.get("time_end_ms")
        qs = str(data.get("quote_scale", "dollar_0_1"))
        if qs not in ("dollar_0_1", "cents_0_100"):
            raise ValueError(f"Invalid quote_scale: {qs!r}")
        yp = str(data.get("yes_price", "mid"))
        np = str(data.get("no_price", "mid"))
        for k, v in (("yes_price", yp), ("no_price", np)):
            if v not in ("mid", "bid", "ask"):
                raise ValueError(f"Invalid {k}: {v!r}")
        src = MongoOwnMergedTickSource(
            uri=uri,
            own_db=str(data.get("own_db", "own")),
            btc_collection=str(data.get("btc_collection", "poly_btc")),
            up_down_collection=str(data.get("up_down_collection", "up_down")),
            time_start_ms=t0,
            time_end_ms=t1,
            batch_size=int(data.get("batch_size", 2000)),
            quote_scale=qs,  # type: ignore[arg-type]
            yes_price=yp,  # type: ignore[arg-type]
            no_price=np,  # type: ignore[arg-type]
            soft_check_yes_no_sum=bool(data.get("soft_check_yes_no_sum", True)),
            name=data.get("name"),
            inject_round_bookends=bool(data.get("inject_round_bookends", False)),
            predictions_collection=(
                str(data.get("predictions_collection", "live_all_predictions_binance")).strip()
                if data.get("predictions_collection", None) is not None
                else None
            ),
        )
        meta_path = str(
            data.get("data_source_label") or cfg.get("data_source_label") or src.label
        )
        return src, meta_path
    raise ValueError(f"Unknown data.type: {dtype!r} (expected 'csv' or 'mongo_own')")
