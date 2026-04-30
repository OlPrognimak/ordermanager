"""Batch job specifications (decoupled from CSV specifics)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Mapping

if TYPE_CHECKING:
    from pmbacktest.data.ports import TickSource
    from pmbacktest.strategies.base import Strategy


@dataclass(frozen=True, slots=True)
class BatchRunSpec:
    """
    One unit of work: strategy instance + how to obtain ticks + session overrides.

    Provide ``tick_source`` **or** ``data_path`` (CSV). When both are set, ``tick_source`` wins.
    """

    strategy: Strategy
    strategy_params: Mapping[str, Any]
    strategy_name: str
    data_path: str = ""
    tick_source: TickSource | None = None
    session_kwargs: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.tick_source is not None:
            return
        if (self.data_path or "").strip():
            return
        data = (self.session_kwargs or {}).get("data")
        if isinstance(data, dict) and str(data.get("type", "")).lower() == "mongo_own":
            return
        raise ValueError(
            "BatchRunSpec requires tick_source, non-empty data_path, or session.data.type=mongo_own"
        )
