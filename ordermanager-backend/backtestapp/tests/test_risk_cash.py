from pmbacktest.core.portfolio_manager import PortfolioManager, RiskLimits
from pmbacktest.core.position_manager import PositionManager
from pmbacktest.core.types import OrderAction, OrderIntent, TickEvent


def test_open_rejected_when_cash_below_mid_notional() -> None:
    pos = PositionManager()
    p = PortfolioManager(
        initial_cash=0.10,
        positions=pos,
        risk=RiskLimits(
            require_cash_covers_open=True,
            open_notional_buffer_rate=0.0,
            apply_risk_limits=True,
        ),
        run_id="r",
    )
    ev = TickEvent(1, 100.0, 80.0, 20.0)
    intent = OrderIntent(OrderAction.OPEN_YES, 1.0)
    assert p.validate_intent(intent, ev) == "insufficient_cash"


def test_open_allowed_with_buffer_when_cash_covers() -> None:
    pos = PositionManager()
    p = PortfolioManager(
        initial_cash=1.0,
        positions=pos,
        risk=RiskLimits(
            require_cash_covers_open=True,
            open_notional_buffer_rate=0.0,
            apply_risk_limits=True,
        ),
        run_id="r",
    )
    ev = TickEvent(1, 100.0, 50.0, 50.0)
    intent = OrderIntent(OrderAction.OPEN_YES, 1.0)
    assert p.validate_intent(intent, ev) is None


def test_cash_check_disabled() -> None:
    pos = PositionManager()
    p = PortfolioManager(
        initial_cash=0.01,
        positions=pos,
        risk=RiskLimits(require_cash_covers_open=False, apply_risk_limits=True),
        run_id="r",
    )
    ev = TickEvent(1, 100.0, 90.0, 10.0)
    intent = OrderIntent(OrderAction.OPEN_YES, 10.0)
    assert p.validate_intent(intent, ev) is None


def test_master_risk_switch_skips_validate_intent() -> None:
    pos = PositionManager()
    p = PortfolioManager(
        initial_cash=0.10,
        positions=pos,
        risk=RiskLimits(
            require_cash_covers_open=True,
            open_notional_buffer_rate=0.0,
            apply_risk_limits=False,
        ),
        run_id="r",
    )
    ev = TickEvent(1, 100.0, 80.0, 20.0)
    intent = OrderIntent(OrderAction.OPEN_YES, 1.0)
    assert p.validate_intent(intent, ev) is None
