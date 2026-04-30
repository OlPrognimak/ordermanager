"""MarketFillEngine must buy at ask and sell at bid when tick.data carries book quotes."""

from __future__ import annotations

from pmbacktest.config_io import execution_from_mapping
from pmbacktest.core.types import OrderAction, OrderRecord, OrderStatus, TickEvent, TokenSide
from pmbacktest.execution.fill_engine import MarketFillEngine


def _order(action: OrderAction, qty: float = 1.0) -> OrderRecord:
    return OrderRecord(
        order_id="o1",
        run_id="r",
        action=action,
        quantity=qty,
        created_ts_ms=1,
        execute_after_ts_ms=1,
        status=OrderStatus.PENDING,
        metadata={},
    )


def test_open_yes_uses_up_best_ask_not_mid() -> None:
    eng = MarketFillEngine(execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0}))
    ev = TickEvent(
        1,
        50_000.0,
        48.0,
        52.0,
        data={"up_best_ask": 55.0, "down_best_ask": 50.0, "up_best_bid": 45.0, "down_best_bid": 48.0},
    )
    f = eng.try_fill(_order(OrderAction.OPEN_YES), ev)
    assert f is not None
    assert f.side == TokenSide.YES
    assert abs(f.price_per_share - 0.55) < 1e-9


def test_close_yes_uses_up_best_bid_not_mid() -> None:
    eng = MarketFillEngine(execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0}))
    ev = TickEvent(
        1,
        50_000.0,
        48.0,
        52.0,
        data={"up_best_ask": 55.0, "down_best_ask": 50.0, "up_best_bid": 45.0, "down_best_bid": 48.0},
    )
    f = eng.try_fill(_order(OrderAction.CLOSE_YES), ev)
    assert f is not None
    assert f.side == TokenSide.YES
    assert abs(f.price_per_share - 0.45) < 1e-9


def test_close_no_uses_down_best_bid_alias() -> None:
    eng = MarketFillEngine(execution_from_mapping({"slippage_fraction": 0.0, "fee_rate": 0.0, "latency_ms": 0}))
    ev = TickEvent(
        1,
        50_000.0,
        50.0,
        50.0,
        data={"no_bid": 38.0, "up_best_ask": 60.0, "down_best_ask": 42.0},
    )
    f = eng.try_fill(_order(OrderAction.CLOSE_NO), ev)
    assert f is not None
    assert f.side == TokenSide.NO
    assert abs(f.price_per_share - 0.38) < 1e-9
