"""Close fills are clamped to remaining inventory (multi-fill same tick / rounding)."""

from __future__ import annotations

from pmbacktest.core.portfolio_manager import PortfolioManager, RiskLimits
from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.types import Fill, OrderAction, TokenSide


def _f(
    action: OrderAction,
    qty: float,
    px: float,
    fee: float,
    ts: int,
) -> Fill:
    return Fill(
        fill_id=f"f{ts}",
        order_id=f"o{ts}",
        run_id="r",
        timestamp_ms=ts,
        action=action,
        side=TokenSide.YES,
        quantity=qty,
        price_per_share=px,
        fee=fee,
        slippage_cost=0.0,
        metadata={},
    )


def test_second_close_clamped_when_exceeds_remaining() -> None:
    p = PortfolioManager(
        initial_cash=10_000.0,
        positions=PositionManager(),
        risk=RiskLimits(apply_risk_limits=False),
        run_id="r",
        fee_rate=0.0,
    )
    p.apply_fill(_f(OrderAction.OPEN_YES, 10.0, 0.5, 0.0, 1))
    p.apply_fill(_f(OrderAction.CLOSE_YES, 7.0, 0.6, 0.0, 2))
    assert abs(p.positions.view(TokenSide.YES).quantity - 3.0) < 1e-9
    p.apply_fill(_f(OrderAction.CLOSE_YES, 7.0, 0.6, 0.0, 2))
    assert p.positions.view(TokenSide.YES).quantity <= 1e-9
