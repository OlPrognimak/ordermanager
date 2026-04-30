"""
Optimization-oriented hooks (v1 placeholder).

`iter_param_sweep` in `pmbacktest.batch` already produces Cartesian grids suitable for
embarrassingly parallel evaluation. Future work: shard specs across processes and merge
`SessionResult` rows into a single study manifest.
"""

from __future__ import annotations

from typing import Protocol

from pmbacktest.core.session import SessionResult


class OptimizationAdapter(Protocol):
    """Future: plug in Optuna / Ray Tune / internal grid executor."""

    def submit(self, run_id: str, payload: object) -> None: ...

    def collect(self) -> list[SessionResult]: ...


__all__ = ["OptimizationAdapter"]
