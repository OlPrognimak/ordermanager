"""UTC 5m first-tick vs 50¢ validation."""

from __future__ import annotations

from pmbacktest.analytics.utc5m_round_checks import MARKET_WINDOW_MS, build_utc5m_round_open_checks
from pmbacktest.core.round_clock import utc_five_minute_round_start_ms
from pmbacktest.core.types import EquityPoint


def test_first_tick_per_window_flagged_vs_50() -> None:
    ts_in_bucket = 1_743_509_100_000
    rs = utc_five_minute_round_start_ms(ts_in_bucket)
    eq = [
        EquityPoint(rs + 1000, 1000, 500, 500, price=50_000.0, yes=50.0, no=50.0),
        EquityPoint(rs + 60_000, 1000, 500, 500, price=50_000.0, yes=60.0, no=40.0),
        EquityPoint(rs + MARKET_WINDOW_MS + 500, 1000, 500, 500, price=50_000.0, yes=48.0, no=48.0),
    ]
    checks = build_utc5m_round_open_checks(eq, tolerance_cents=2.0)
    assert len(checks) == 2
    assert checks[0]["near_50_mid"] is True
    assert checks[1]["near_50_mid"] is True

    eq2 = [
        EquityPoint(rs + 1000, 1000, 500, 500, price=50_000.0, yes=55.0, no=45.0),
    ]
    checks2 = build_utc5m_round_open_checks(eq2, tolerance_cents=2.0)
    assert checks2[0]["near_50_mid"] is False
