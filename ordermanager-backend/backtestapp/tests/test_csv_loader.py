from pathlib import Path

import pytest

from pmbacktest.data.csv_loader import csv_tick_stream


def test_csv_stream_monotonic(tmp_path: Path) -> None:
    p = tmp_path / "t.csv"
    p.write_text(
        "timestamp,price,yes,no\n1000,1,50,50\n2000,1,51,49\n",
        encoding="utf-8",
    )
    evs = list(csv_tick_stream(p))
    assert len(evs) == 2
    assert evs[0].timestamp_ms == 1000


def test_csv_rejects_non_monotonic(tmp_path: Path) -> None:
    p = tmp_path / "t.csv"
    p.write_text(
        "timestamp,price,yes,no\n2000,1,50,50\n1000,1,51,49\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        list(csv_tick_stream(p, strict_monotonic=True))
