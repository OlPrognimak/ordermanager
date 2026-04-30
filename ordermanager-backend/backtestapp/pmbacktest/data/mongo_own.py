"""
Merge ``own.poly_btc`` with ``own.up_down`` into engine ``TickEvent`` rows.

Uses an *as-of* join on ``ts_ms``: each ``up_down`` row is paired with the latest
``poly_btc`` document whose ``ts_ms`` is less than or equal to that row's ``ts_ms``.
"""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from typing import Any, Literal

from pmbacktest.core.broker import MARKET_WINDOW_MS
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import TickEvent
from pmbacktest.data.ports import TickSource
from pmbacktest.data.schema import YES_NO_SUM_SOFT_MAX, to_event

try:
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError
except ImportError as e:  # pragma: no cover
    MongoClient = None  # type: ignore[misc, assignment]
    PyMongoError = Exception  # type: ignore[misc, assignment]
    _IMPORT_ERROR = e
else:
    _IMPORT_ERROR = None


def _require_pymongo() -> None:
    if MongoClient is None:
        raise ImportError(
            "pymongo is required for MongoDB tick sources. "
            "Install with: pip install 'pmbacktest[mongodb]'"
        ) from _IMPORT_ERROR


def coerce_ts_ms(value: Any) -> int:
    """Normalize ``ts_ms`` from PyMongo (int, float, or Extended JSON style)."""
    if value is None:
        raise ValueError("missing ts_ms")
    if isinstance(value, bool):
        raise TypeError("ts_ms must not be bool")
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, dict):
        if "$numberLong" in value:
            return int(value["$numberLong"])
        if "$numberInt" in value:
            return int(value["$numberInt"])
    raise TypeError(f"unsupported ts_ms type: {type(value)!r}")


QuoteScale = Literal["dollar_0_1", "cents_0_100"]
SidePrice = Literal["mid", "bid", "ask"]


def _anchor_range_filter(
    time_start_ms: int | None,
    time_end_ms: int | None,
) -> dict[str, Any]:
    if time_start_ms is None and time_end_ms is None:
        return {}
    bounds: dict[str, Any] = {}
    if time_start_ms is not None:
        bounds["$gte"] = time_start_ms
    if time_end_ms is not None:
        bounds["$lte"] = time_end_ms
    return {"anchor_ts": bounds}


def _load_round_predictions(
    *,
    own,
    predictions_collection: str,
    time_start_ms: int | None,
    time_end_ms: int | None,
) -> dict[int, dict[str, Any]]:
    """
    Load latest per-round prediction keyed by ``anchor_ts``.

    Expected fields on documents:
      - anchor_ts: round start (ms)
      - decision_ts: when prediction becomes available (ms)
      - target_ts: optional sanity field (ms)
      - direction_pred: "up" or "down"
      - confidence: 0..1
    """
    if not predictions_collection:
        return {}
    flt = _anchor_range_filter(time_start_ms, time_end_ms)
    cur = (
        own[predictions_collection]
        .find(flt)
        .sort([("anchor_ts", 1), ("decision_ts", 1)])
        .batch_size(5_000)
    )
    out: dict[int, dict[str, Any]] = {}
    for doc in cur:
        try:
            anchor = coerce_ts_ms(doc.get("anchor_ts"))
            decision = coerce_ts_ms(doc.get("decision_ts"))
            target = doc.get("target_ts")
            target_ms = coerce_ts_ms(target) if target is not None else None
            raw_dir = doc.get("direction_pred")
            raw_conf = doc.get("confidence")
            if not isinstance(raw_dir, str):
                continue
            direction = raw_dir.strip().lower()
            if direction not in {"up", "down"}:
                continue
            if not isinstance(raw_conf, (int, float)):
                continue
            conf = float(raw_conf)
            if conf != conf:  # NaN
                continue
            prev = out.get(anchor)
            if prev is None or int(decision) >= int(prev.get("decision_ts", -1)):
                out[anchor] = {
                    "anchor_ts": int(anchor),
                    "decision_ts": int(decision),
                    "target_ts": int(target_ms) if target_ms is not None else None,
                    "direction_pred": direction,
                    "confidence": max(0.0, min(1.0, conf)),
                }
        except Exception:
            continue
    return out


def _ts_range_filter(
    time_start_ms: int | None,
    time_end_ms: int | None,
) -> dict[str, Any]:
    if time_start_ms is None and time_end_ms is None:
        return {}
    bounds: dict[str, Any] = {}
    if time_start_ms is not None:
        bounds["$gte"] = time_start_ms
    if time_end_ms is not None:
        bounds["$lte"] = time_end_ms
    return {"ts_ms": bounds}


def _round_end_ms(round_start_ms: int) -> int:
    return round_start_ms + MARKET_WINDOW_MS - 1


@dataclass(frozen=True, slots=True)
class _TickWithAsks:
    event: TickEvent
    up_ask: float
    down_ask: float


def _close_yes_no_from_asks(up_ask: float, down_ask: float) -> tuple[float, float]:
    if up_ask > down_ask:
        return 100.0, 0.0
    if down_ask > up_ask:
        return 0.0, 100.0
    # Tie fallback: neutral close to avoid directional bias.
    return 50.0, 50.0


def inject_round_bookend_ticks(
    base: Iterator[TickEvent | _TickWithAsks],
    *,
    soft_check_yes_no_sum: bool = True,
) -> Iterator[TickEvent]:
    """
    Insert synthetic quotes for analyzable UTC 5m rounds without resampling real ticks.

    For each round that appears in the stream (including empty rounds skipped by data gaps):

    - One **open** tick at ``round_start`` with YES/NO = 50/50 (cents scale).
    - Then all **real** ticks for that round, preserving original timestamps and spacing.
    - **Close** ticks: at the last millisecond of each round, compare last seen
      UP and DOWN **ask** (or mid when bid was synthesized from ask):
      ``up > down => 100/0``, ``down > up => 0/100``, tie => 50/50.
      Then emit 50/50 at the next round start (if any).

    Spot ``price`` on synthetics is the last seen BTC from real ticks (0 until the first real row).
    """
    prev_round: int | None = None
    last_price = 0.0
    last_up_ask = 0.0
    last_down_ask = 0.0

    for item in base:
        if isinstance(item, TickEvent):
            # Backward-compatible fallback for direct unit tests.
            e = item
            up_ask = e.yes
            down_ask = e.no
        else:
            e = item.event
            up_ask = item.up_ask
            down_ask = item.down_ask
        rs = utc_five_minute_round_start_ms(e.timestamp_ms)
        if prev_round is None:
            yield to_event(
                rs,
                last_price,
                50.0,
                50.0,
                soft_check_yes_no_sum=soft_check_yes_no_sum,
            )
            prev_round = rs
        elif rs != prev_round:
            cur_close = prev_round
            while cur_close < rs:
                close_yes, close_no = _close_yes_no_from_asks(last_up_ask, last_down_ask)
                yield to_event(
                    _round_end_ms(cur_close),
                    last_price,
                    close_yes,
                    close_no,
                    soft_check_yes_no_sum=soft_check_yes_no_sum,
                )
                nxt = cur_close + MARKET_WINDOW_MS
                if nxt < rs:
                    yield to_event(
                        nxt,
                        last_price,
                        50.0,
                        50.0,
                        soft_check_yes_no_sum=soft_check_yes_no_sum,
                    )
                cur_close = nxt
            yield to_event(
                rs,
                last_price,
                50.0,
                50.0,
                soft_check_yes_no_sum=soft_check_yes_no_sum,
            )
            prev_round = rs

        yield e
        last_price = e.price
        last_up_ask = up_ask
        last_down_ask = down_ask

    if prev_round is not None:
        close_yes, close_no = _close_yes_no_from_asks(last_up_ask, last_down_ask)
        yield to_event(
            _round_end_ms(prev_round),
            last_price,
            close_yes,
            close_no,
            soft_check_yes_no_sum=soft_check_yes_no_sum,
        )


def _leg_price(bid: float, ask: float, side: SidePrice) -> float:
    if side == "bid":
        return bid
    if side == "ask":
        return ask
    return (bid + ask) / 2.0


# Full book (optional). Same idea as ``web/server/mongoMarket.mjs`` ``legsToCents``.
_UP_DOWN_BOOK_SCHEMAS: tuple[tuple[str, str, str, str], ...] = (
    ("up_best_bid", "up_best_ask", "down_best_bid", "down_best_ask"),
    ("upBid", "upAsk", "downBid", "downAsk"),
    ("yes_bid", "yes_ask", "no_bid", "no_ask"),
)
# Ask-only rows: synthetic bid = ask so ``mid``/``bid``/``ask`` modes stay well-defined.
_UP_DOWN_ASK_ONLY_SCHEMAS: tuple[tuple[str, str], ...] = (
    ("up_best_ask", "down_best_ask"),
    ("upAsk", "downAsk"),
    ("yes_ask", "no_ask"),
)


def _float_field(doc: Mapping[str, Any], key: str) -> float | None:
    v = doc.get(key)
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x != x or x in (float("inf"), float("-inf")):
        return None
    return x


def resolve_up_down_book(doc: Mapping[str, Any]) -> tuple[float, float, float, float]:
    """
    Return ``(up_bid, up_ask, down_bid, down_ask)`` from an ``up_down`` document.

    Uses full bid+ask fields when present; otherwise **ask-only** pairs (bid is set equal
    to ask). Raises ``KeyError`` with context if nothing matches.
    """
    for ubk, uak, dbk, dak in _UP_DOWN_BOOK_SCHEMAS:
        ub = _float_field(doc, ubk)
        ua = _float_field(doc, uak)
        db = _float_field(doc, dbk)
        da = _float_field(doc, dak)
        if ub is None or ua is None or db is None or da is None:
            continue
        return ub, ua, db, da
    for uak, dak in _UP_DOWN_ASK_ONLY_SCHEMAS:
        ua = _float_field(doc, uak)
        da = _float_field(doc, dak)
        if ua is None or da is None:
            continue
        return ua, ua, da, da
    sample = [k for k in doc.keys() if not str(k).startswith("_")][:24]
    raise KeyError(
        "up_down document has no recognized quote fields "
        "(need bid+ask sets, or ask-only: up_best_ask/down_best_ask, upAsk/downAsk, "
        "yes_ask/no_ask, etc.); "
        f"ts_ms={doc.get('ts_ms')!r}; sample_keys={sample!r}"
    )


def _yes_no_cents_from_book(
    ub: float,
    ua: float,
    db: float,
    da: float,
    *,
    yes_from: SidePrice,
    no_from: SidePrice,
    quote_scale: QuoteScale,
) -> tuple[float, float]:
    y = _leg_price(ub, ua, yes_from)
    n = _leg_price(db, da, no_from)
    if quote_scale == "dollar_0_1":
        return y * 100.0, n * 100.0
    return y, n


def _ask_cents_from_book(
    ua: float,
    da: float,
    *,
    quote_scale: QuoteScale,
) -> tuple[float, float]:
    if quote_scale == "dollar_0_1":
        return ua * 100.0, da * 100.0
    return ua, da


def _fit_yes_no_cent_sum(y: float, n: float, *, max_sum: float = YES_NO_SUM_SOFT_MAX) -> tuple[float, float]:
    """
    When both legs use **asks** (or wide books), ``yes + no`` can exceed ``max_sum``.
    Scale proportionally so the sum is 100 (cent scale) and validation passes.
    """
    s = y + n
    if s <= max_sum + 1e-9:
        return y, n
    if s <= 1e-12:
        return 50.0, 50.0
    k = 100.0 / s
    return y * k, n * k


def _to_yes_no_cents(
    up_doc: dict[str, Any],
    *,
    yes_from: SidePrice,
    no_from: SidePrice,
    quote_scale: QuoteScale,
) -> tuple[float, float]:
    ub, ua, db, da = resolve_up_down_book(up_doc)
    return _yes_no_cents_from_book(
        ub, ua, db, da, yes_from=yes_from, no_from=no_from, quote_scale=quote_scale
    )


@dataclass(slots=True)
class MongoOwnMergedTickSource:
    """
    Stream ticks by walking ``up_down`` in ``ts_ms`` order and carrying forward BTC.

    ``yes`` / ``no`` on ``TickEvent`` use the engine's 0–100 scale (``MarketFillEngine`` divides
    by 100 for dollars per share). With ``quote_scale=\"dollar_0_1\"``, book prices in ~[0,1]
    are multiplied by 100.
    """

    uri: str
    own_db: str = "own"
    btc_collection: str = "poly_btc"
    up_down_collection: str = "up_down"
    time_start_ms: int | None = None
    time_end_ms: int | None = None
    batch_size: int = 2_000
    quote_scale: QuoteScale = "dollar_0_1"
    yes_price: SidePrice = "mid"
    no_price: SidePrice = "mid"
    soft_check_yes_no_sum: bool = True
    #: Optional label for ``RunMeta.data_source`` / batch manifests.
    name: str | None = None
    #: Prepend/append 50/50 and 100/0 synthetic ticks at UTC 5m boundaries (see ``inject_round_bookend_ticks``).
    inject_round_bookends: bool = False
    #: Optional: attach ML predictions from a collection (keyed by anchor_ts).
    predictions_collection: str | None = "live_all_predictions_binance"
    #: Field names used by strategies (`hybrid_deepseek_v1` reads these from `TickEvent.data`).
    prediction_direction_field: str = "direction_pred"
    prediction_confidence_field: str = "confidence"

    def _iter_merged_with_asks(self) -> Iterator[_TickWithAsks]:
        _require_pymongo()
        assert MongoClient is not None

        client = MongoClient(self.uri)
        try:
            own = client[self.own_db]
            flt = _ts_range_filter(self.time_start_ms, self.time_end_ms)
            btc_cur = own[self.btc_collection].find(flt).sort("ts_ms", 1).batch_size(self.batch_size)
            ud_cur = own[self.up_down_collection].find(flt).sort("ts_ms", 1).batch_size(self.batch_size)
            preds = (
                _load_round_predictions(
                    own=own,
                    predictions_collection=str(self.predictions_collection or "").strip(),
                    time_start_ms=self.time_start_ms,
                    time_end_ms=self.time_end_ms,
                )
                if self.predictions_collection
                else {}
            )

            btc_iter = iter(btc_cur)
            next_btc: dict[str, Any] | None = None
            last_btc: dict[str, Any] | None = None

            def _advance_btc_through(ts_ud: int) -> None:
                nonlocal next_btc, last_btc
                while True:
                    if next_btc is None:
                        try:
                            next_btc = next(btc_iter)
                        except StopIteration:
                            return
                    bts = coerce_ts_ms(next_btc.get("ts_ms"))
                    if bts <= ts_ud:
                        last_btc = next_btc
                        next_btc = None
                    else:
                        return

            for up_doc in ud_cur:
                ts_ud = coerce_ts_ms(up_doc.get("ts_ms"))
                _advance_btc_through(ts_ud)
                # If poly_btc has no rows in range (or lags), still emit up/down with placeholder spot.
                if last_btc is None:
                    price = 0.0
                else:
                    price = float(last_btc["price"])
                ub, ua, db, da = resolve_up_down_book(up_doc)
                yes_c, no_c = _yes_no_cents_from_book(
                    ub,
                    ua,
                    db,
                    da,
                    yes_from=self.yes_price,
                    no_from=self.no_price,
                    quote_scale=self.quote_scale,
                )
                if self.soft_check_yes_no_sum:
                    yes_c, no_c = _fit_yes_no_cent_sum(yes_c, no_c)
                extra: dict[str, Any] = {}
                up_ask_c, down_ask_c = _ask_cents_from_book(ua, da, quote_scale=self.quote_scale)
                # Expose top-of-book asks in cent scale for ask-based strategies.
                extra["up_best_ask"] = float(up_ask_c)
                extra["down_best_ask"] = float(down_ask_c)
                if self.quote_scale == "dollar_0_1":
                    extra["up_best_bid"] = float(ub * 100.0)
                    extra["down_best_bid"] = float(db * 100.0)
                else:
                    extra["up_best_bid"] = float(ub)
                    extra["down_best_bid"] = float(db)
                if preds:
                    anchor = utc_five_minute_round_start_ms(int(ts_ud))
                    pred = preds.get(anchor)
                    if pred is not None and int(ts_ud) >= int(pred.get("decision_ts", 0)):
                        extra[self.prediction_direction_field] = pred.get("direction_pred")
                        extra[self.prediction_confidence_field] = pred.get("confidence")
                        extra["pred_anchor_ts"] = pred.get("anchor_ts")
                        extra["pred_decision_ts"] = pred.get("decision_ts")
                        extra["pred_target_ts"] = pred.get("target_ts")
                event = to_event(
                    ts_ud,
                    price,
                    yes_c,
                    no_c,
                    data=extra,
                    soft_check_yes_no_sum=self.soft_check_yes_no_sum,
                )
                yield _TickWithAsks(
                    event=event,
                    up_ask=ua,
                    down_ask=da,
                )
        except PyMongoError as e:
            raise RuntimeError(f"MongoDB tick stream failed: {e}") from e
        finally:
            client.close()

    def _iter_merged_raw(self) -> Iterator[TickEvent]:
        for rec in self._iter_merged_with_asks():
            yield rec.event

    def iter_ticks(self) -> Iterator[TickEvent]:
        if self.inject_round_bookends:
            yield from inject_round_bookend_ticks(
                self._iter_merged_with_asks(),
                soft_check_yes_no_sum=self.soft_check_yes_no_sum,
            )
        else:
            yield from self._iter_merged_raw()

    @property
    def label(self) -> str:
        if self.name is not None:
            return self.name
        return f"mongo:{self.own_db}/{self.btc_collection}+{self.up_down_collection}"
