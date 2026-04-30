from pathlib import Path

from pmbacktest.data.csv_loader import _parse_timestamp_ms, csv_tick_stream


def test_parse_timestamp_integer_string_no_float_loss() -> None:
    s = "1774893091000"
    assert _parse_timestamp_ms(s) == 1774893091000


def test_parse_timestamp_float_string() -> None:
    assert _parse_timestamp_ms("1774893091000.0") == 1774893091000


def test_csv_roundtrip_large_timestamp(tmp_path: Path) -> None:
    p = tmp_path / "t.csv"
    p.write_text(
        "timestamp,price,yes,no\n"
        "9223372036854775800,1.0,50.0,50.0\n",
        encoding="utf-8",
    )
    evs = list(csv_tick_stream(p, soft_check_yes_no_sum=False))
    assert len(evs) == 1
    assert evs[0].timestamp_ms == 9223372036854775800
