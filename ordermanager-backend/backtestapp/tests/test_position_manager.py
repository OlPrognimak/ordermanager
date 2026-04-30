from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.types import Fill, OrderAction, TokenSide


def _fill(
    *,
    action: OrderAction,
    side: TokenSide,
    qty: float,
    px: float,
    fee: float,
    ts: int = 1,
) -> Fill:
    return Fill(
        fill_id="f",
        order_id="o",
        run_id="r",
        timestamp_ms=ts,
        action=action,
        side=side,
        quantity=qty,
        price_per_share=px,
        fee=fee,
        slippage_cost=0.0,
        metadata={},
    )


def test_open_and_close_realized_pnl() -> None:
    pm = PositionManager()
    _, v1, _ = pm.apply_fill(_fill(action=OrderAction.OPEN_YES, side=TokenSide.YES, qty=10, px=0.7, fee=0.1))
    assert v1.quantity == 10
    assert abs(v1.avg_entry_price - 0.7) < 1e-9  # opens ignore fill.fee (profit-only fee mode)
    realized, v2, _ = pm.apply_fill(_fill(action=OrderAction.CLOSE_YES, side=TokenSide.YES, qty=10, px=0.8, fee=0.1, ts=2))
    assert v2.quantity == 0
    assert realized > 0


def test_partial_close_scales_basis() -> None:
    pm = PositionManager()
    pm.apply_fill(_fill(action=OrderAction.OPEN_YES, side=TokenSide.YES, qty=10, px=0.5, fee=0.0))
    realized, v, _ = pm.apply_fill(_fill(action=OrderAction.CLOSE_YES, side=TokenSide.YES, qty=4, px=0.6, fee=0.0, ts=2))
    assert abs(realized - 0.4) < 1e-9
    assert abs(v.quantity - 6.0) < 1e-9
