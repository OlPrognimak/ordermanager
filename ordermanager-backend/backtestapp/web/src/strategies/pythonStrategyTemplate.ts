/** Starter template: id must match filename stem (e.g. id `my_alpha` → `my_alpha.py`). */
export const PYTHON_STRATEGY_TEMPLATE = `"""Custom 5m BTC up/down strategy — replace this docstring."""

from __future__ import annotations

from pmbacktest.core.run_context import RunContext
from pmbacktest.core.types import TickEvent
from pmbacktest.strategies.base import Strategy


class MyDashboardStrategy(Strategy):
    """
    Exactly one Strategy subclass per file. The strategy id in the GUI is the file name
    without .py (e.g. my_strategy.py → select "my_strategy" in Configure).
    JSON parameters from the form are passed as constructor kwargs.
    """

    def __init__(self, **kwargs: object) -> None:
        _ = kwargs  # e.g. self.qty = float(kwargs.get("qty", 1.0))

    def on_tick(self, event: TickEvent, ctx: RunContext) -> None:
        # Use event (price, ts, …) and ctx (positions, submit_order, …).
        _ = (event, ctx)
`;
