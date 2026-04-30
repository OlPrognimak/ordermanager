import pytest

from pmbacktest.config.run_build import build_tick_source
from pmbacktest.core.broker import MARKET_WINDOW_MS
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import TickEvent
from pmbacktest.data.mongo_own import (
    _fit_yes_no_cent_sum,
    _to_yes_no_cents,
    _ts_range_filter,
    _yes_no_cents_from_book,
    coerce_ts_ms,
    inject_round_bookend_ticks,
)


def test_coerce_ts_ms() -> None:
    assert coerce_ts_ms(1774893091000) == 1774893091000
    assert coerce_ts_ms({"$numberLong": "1774893091000"}) == 1774893091000


def test_ts_range_filter() -> None:
    assert _ts_range_filter(None, None) == {}
    assert _ts_range_filter(1, None) == {"ts_ms": {"$gte": 1}}
    assert _ts_range_filter(None, 2) == {"ts_ms": {"$lte": 2}}
    assert _ts_range_filter(1, 2) == {"ts_ms": {"$gte": 1, "$lte": 2}}


def test_to_yes_no_cents_dollar_scale() -> None:
    doc = {
        "up_best_bid": 0.98,
        "up_best_ask": 1.0,
        "down_best_bid": 0.0,
        "down_best_ask": 0.02,
    }
    y, n = _to_yes_no_cents(doc, yes_from="mid", no_from="mid", quote_scale="dollar_0_1")
    assert abs(y - 99.0) < 1e-9
    assert abs(n - 1.0) < 1e-9


def test_to_yes_no_cents_camel_case_schema() -> None:
    doc = {
        "upBid": 0.98,
        "upAsk": 1.0,
        "downBid": 0.0,
        "downAsk": 0.02,
    }
    y, n = _to_yes_no_cents(doc, yes_from="mid", no_from="mid", quote_scale="dollar_0_1")
    assert abs(y - 99.0) < 1e-9
    assert abs(n - 1.0) < 1e-9


def test_fit_yes_no_cent_sum_when_double_ask_exceeds_soft_max() -> None:
    """Using ask as both bid and mid can yield yes+no > 120 (spread on both legs)."""
    y, n = _yes_no_cents_from_book(
        0.61, 0.61, 0.61, 0.61, yes_from="mid", no_from="mid", quote_scale="dollar_0_1"
    )
    assert y + n > 120
    y2, n2 = _fit_yes_no_cent_sum(y, n)
    assert abs(y2 + n2 - 100.0) < 1e-9


def test_to_yes_no_cents_ask_only_schema() -> None:
    doc = {
        "up_best_ask": 0.55,
        "down_best_ask": 0.45,
    }
    y, n = _to_yes_no_cents(doc, yes_from="mid", no_from="mid", quote_scale="dollar_0_1")
    assert abs(y - 55.0) < 1e-9
    assert abs(n - 45.0) < 1e-9


def test_to_yes_no_cents_yes_no_field_names() -> None:
    doc = {
        "yes_bid": 40.0,
        "yes_ask": 42.0,
        "no_bid": 58.0,
        "no_ask": 60.0,
    }
    y, n = _to_yes_no_cents(doc, yes_from="mid", no_from="mid", quote_scale="cents_0_100")
    assert abs(y - 41.0) < 1e-9
    assert abs(n - 59.0) < 1e-9


def test_build_tick_source_mongo_requires_uri() -> None:
    cfg = {
        "data": {"type": "mongo_own", "own_db": "own"},
    }
    with pytest.raises(ValueError, match="MongoDB URI"):
        build_tick_source(cfg, mongo_uri_override=None)


def test_build_tick_source_csv() -> None:
    src, path = build_tick_source({"data_path": "/tmp/x.csv", "data": {"type": "csv"}})
    assert src is None
    assert path == "/tmp/x.csv"


def test_inject_round_bookend_ticks_empty() -> None:
    assert list(inject_round_bookend_ticks(iter(()))) == []


def test_inject_round_bookend_ticks_single_round() -> None:
    ts_mid = 1_700_000_000_000
    rs = utc_five_minute_round_start_ms(ts_mid)
    ev = TickEvent(timestamp_ms=ts_mid, price=99.0, yes=55.0, no=45.0)
    out = list(inject_round_bookend_ticks(iter([ev])))
    assert len(out) == 3
    assert out[0].timestamp_ms == rs and out[0].yes == 50.0 and out[0].no == 50.0 and out[0].price == 0.0
    assert out[1] == ev
    assert out[2].yes == 100.0 and out[2].no == 0.0 and out[2].price == 99.0
    assert out[2].timestamp_ms == rs + MARKET_WINDOW_MS - 1


def test_inject_round_bookend_ticks_skipped_round() -> None:
    """Gap of one empty UTC round: close, synthetic open/close for gap, open next, real tick."""
    r0 = utc_five_minute_round_start_ms(1_700_000_000_000)
    r1 = r0 + MARKET_WINDOW_MS
    r2 = r1 + MARKET_WINDOW_MS
    last_in_r0 = r0 + 60_000
    first_in_r2 = r2 + 10_000
    e0 = TickEvent(timestamp_ms=last_in_r0, price=1.0, yes=60.0, no=40.0)
    e2 = TickEvent(timestamp_ms=first_in_r2, price=2.0, yes=52.0, no=48.0)
    out = list(inject_round_bookend_ticks(iter([e0, e2])))
    assert out[0].timestamp_ms == r0 and out[0].yes == 50.0
    assert out[1] == e0
    assert out[2].timestamp_ms == r0 + MARKET_WINDOW_MS - 1 and out[2].yes == 100.0
    assert out[3].timestamp_ms == r1 and out[3].yes == 50.0
    assert out[4].timestamp_ms == r1 + MARKET_WINDOW_MS - 1 and out[4].yes == 100.0
    assert out[5].timestamp_ms == r2 and out[5].yes == 50.0
    assert out[6] == e2
    assert out[7].timestamp_ms == r2 + MARKET_WINDOW_MS - 1 and out[7].yes == 100.0


def test_inject_round_bookend_ticks_close_can_be_zero_hundred() -> None:
    ts_mid = 1_700_000_000_000
    rs = utc_five_minute_round_start_ms(ts_mid)
    # With direct TickEvent input, fallback comparator uses yes vs no.
    ev = TickEvent(timestamp_ms=ts_mid, price=99.0, yes=30.0, no=70.0)
    out = list(inject_round_bookend_ticks(iter([ev])))
    assert out[-1].timestamp_ms == rs + MARKET_WINDOW_MS - 1
    assert out[-1].yes == 0.0
    assert out[-1].no == 100.0
