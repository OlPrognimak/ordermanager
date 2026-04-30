import pytest

from pmbacktest.core.portfolio_manager import (
    InsufficientCashForFillError,
    PortfolioManager,
    RiskLimits,
)
from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.types import Fill, OrderAction, TokenSide


def _fill_open(*, qty: float, px: float, fee: float, meta: dict | None = None) -> Fill:
    return Fill(
        fill_id="f",
        order_id="o",
        run_id="r",
        timestamp_ms=1,
        action=OrderAction.OPEN_YES,
        side=TokenSide.YES,
        quantity=qty,
        price_per_share=px,
        fee=fee,
        slippage_cost=0.0,
        metadata=dict(meta or {}),
    )


def _fill_close(*, qty: float, px: float, fee: float, ts: int = 2) -> Fill:
    return Fill(
        fill_id="fc",
        order_id="oc",
        run_id="r",
        timestamp_ms=ts,
        action=OrderAction.CLOSE_YES,
        side=TokenSide.YES,
        quantity=qty,
        price_per_share=px,
        fee=fee,
        slippage_cost=0.0,
        metadata={},
    )


def test_apply_fill_open_does_not_mutate_book_when_cash_insufficient() -> None:
    p = PortfolioManager(
        initial_cash=0.2,
        positions=PositionManager(),
        risk=RiskLimits(require_cash_covers_open=False),
        run_id="r",
    )
    with pytest.raises(InsufficientCashForFillError):
        p.apply_fill(_fill_open(qty=1.0, px=0.5, fee=0.0))
    assert p.positions.view(TokenSide.YES).quantity == 0
    assert p.cash == 0.2


def test_closed_trade_realized_pnl_bet_usd_exit_entry_cents_formula() -> None:
    """realized_pnl uses gross; fee haircut applies only when gross > 0."""
    p = PortfolioManager(
        initial_cash=10_000.0,
        positions=PositionManager(),
        risk=RiskLimits(),
        run_id="r",
    )
    # 20 shares @ 0.5 = $10; ledger stake = 10
    p.apply_fill(
        _fill_open(qty=20.0, px=0.5, fee=0.0, meta={"bet_usd_amount": 10.0}),
    )
    # Binary win: $1/share, no fee on exit notional for this check
    p.apply_fill(_fill_close(qty=20.0, px=1.0, fee=0.0))
    assert len(p.closed_trades) == 1
    t = p.closed_trades[0]
    # entry_cents=50, exit_cents=100, bet 10 => 10 * (100/50 - 1) = 10
    assert abs(t.realized_pnl - 10.0) < 1e-9

    p2 = PortfolioManager(
        initial_cash=10_000.0,
        positions=PositionManager(),
        risk=RiskLimits(),
        run_id="r2",
    )
    p2.apply_fill(_fill_open(qty=20.0, px=0.5, fee=0.0, meta={"bet_usd_amount": 10.0}))
    p2.apply_fill(_fill_close(qty=20.0, px=0.0, fee=0.0))
    assert abs(p2.closed_trades[0].realized_pnl - (-10.0)) < 1e-9


def test_closed_trade_realized_pnl_fee_applies_only_to_positive_pnl() -> None:
    p = PortfolioManager(
        initial_cash=10_000.0,
        positions=PositionManager(),
        risk=RiskLimits(),
        run_id="r",
    )
    p.apply_fill(_fill_open(qty=20.0, px=0.5, fee=0.0, meta={"bet_usd_amount": 10.0}))
    # gross=+10, fee_rate=10% => realized=+9
    p.apply_fill(_fill_close(qty=20.0, px=1.0, fee=2.0, ts=2))
    assert abs(p.closed_trades[0].realized_pnl - 9.0) < 1e-9

    p2 = PortfolioManager(
        initial_cash=10_000.0,
        positions=PositionManager(),
        risk=RiskLimits(),
        run_id="r2",
    )
    p2.apply_fill(_fill_open(qty=20.0, px=0.5, fee=0.0, meta={"bet_usd_amount": 10.0}))
    # gross=-10, even with fee present, realized stays -10 by rule.
    p2.apply_fill(_fill_close(qty=20.0, px=0.0, fee=1.0, ts=2))
    assert abs(p2.closed_trades[0].realized_pnl - (-10.0)) < 1e-9
