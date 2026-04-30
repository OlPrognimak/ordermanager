"""Tests for dashboard-uploaded strategy modules."""

from __future__ import annotations

from pathlib import Path

import pmbacktest.strategies.upload_loader as ul
from pmbacktest.strategies.base import Strategy


def test_strategy_class_from_minimal_module(tmp_path: Path) -> None:
    p = tmp_path / "hello.py"
    p.write_text(
        """
from pmbacktest.strategies.base import Strategy
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent

class HelloStrategy(Strategy):
    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        pass
""",
        encoding="utf-8",
    )
    cls = ul.load_strategy_class_from_file(p)
    assert issubclass(cls, Strategy)
    assert cls.__name__ == "HelloStrategy"


def test_uploaded_registry_scans_directory(tmp_path: Path, monkeypatch) -> None:
    (tmp_path / "a.py").write_text(
        """
from pmbacktest.strategies.base import Strategy
from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent
class A(Strategy):
    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        pass
""",
        encoding="utf-8",
    )
    monkeypatch.setattr(ul, "_UPLOAD_DIR", tmp_path)
    reg = ul.uploaded_strategy_registry()
    assert "a" in reg.names()
    inst = reg.create("a", {})
    assert isinstance(inst, Strategy)
