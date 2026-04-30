"""Backward-compatible name for the default market fill engine."""

from __future__ import annotations

from pmbacktest.execution.fill_engine import FillEngine, MarketFillEngine

FillSimulator = MarketFillEngine

__all__ = ["FillEngine", "FillSimulator", "MarketFillEngine"]
