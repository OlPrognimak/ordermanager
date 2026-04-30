"""Cash, risk checks, trade ledger, and coordination with positions."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field, replace
from typing import Any, Mapping

from pmbacktest.core.position_manager import PositionManager


class InsufficientCashForFillError(ValueError):
    """Raised when an OPEN fill would overdraw cash (e.g. multiple fills on one tick)."""
from pmbacktest.core.types import (
    ClosedTrade,
    Fill,
    OrderAction,
    OrderIntent,
    PositionUpdate,
    PositionView,
    TickEvent,
    TokenSide,
)


@dataclass(frozen=True, slots=True)
class RiskLimits:
    """
    Optional constraints evaluated at order submission time.

    ``max_gross_notional_usd`` is a *heuristic*: current mark-to-market of holdings plus
    the notional of the proposed OPEN at the displayed quote (not a full portfolio optimization).
    """

    max_position_shares_per_side: float | None = None
    max_gross_notional_usd: float | None = None
    max_concurrent_sides: int | None = None
    require_cash_covers_open: bool = True
    #: Extra cushion on required cash vs mid notional (e.g. 0.02 for ~2% fees+slippage guess).
    open_notional_buffer_rate: float = 0.0
    #: When False (default), :meth:`PortfolioManager.validate_intent` is a no-op (GUI opt-in).
    apply_risk_limits: bool = False

    def __post_init__(self) -> None:
        if self.max_concurrent_sides is not None and self.max_concurrent_sides < 0:
            raise ValueError("max_concurrent_sides must be non-negative")
        if self.open_notional_buffer_rate < 0:
            raise ValueError("open_notional_buffer_rate must be non-negative")


@dataclass(slots=True)
class _SideMeta:
    opened_ts_ms: int
    trade_id: str
    #: Count of OPEN fills on this side since flat; starts at 1 on first open, +1 per add.
    open_order_count: int = 0
    bet_usd_total: float = 0.0


@dataclass(slots=True)
class PortfolioManager:
    """Cash ledger, positions, closed-trade log, and risk gates."""

    initial_cash: float
    positions: PositionManager
    risk: RiskLimits
    run_id: str
    fee_rate: float = 0.0
    cash: float = field(init=False)
    closed_trades: list[ClosedTrade] = field(default_factory=list)
    _side_meta: dict[TokenSide, _SideMeta] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.cash = self.initial_cash

    def equity(self, event: TickEvent) -> float:
        return self.cash + self._mark_to_market_value_from_usd_stake(event)

    def _mark_to_market_value_from_usd_stake(self, event: TickEvent) -> float:
        """
        MTM value derived from USD stake + entry + current + fee rate.

        For each open side with recorded ``bet_usd_total``, value is:
            stake * (1 - fee_rate) * (current / entry)
        This avoids using share quantity for valuation.
        """
        total = 0.0
        for side in (TokenSide.YES, TokenSide.NO):
            v = self.positions.view(side)
            if v.quantity <= 1e-12:
                continue
            px = (event.yes if side == TokenSide.YES else event.no) / 100.0
            entry = v.avg_entry_price
            meta = self._side_meta.get(side)
            if meta is not None and entry > 1e-12:
                total += float(meta.bet_usd_total) * (1.0 - max(self.fee_rate, 0.0)) * (px / entry)
            else:
                # Fallback for missing stake metadata (legacy or manual fills).
                total += v.quantity * px
        return total

    def positions_snapshot(self) -> list[PositionView]:
        return self.positions.all_positions()

    def has_open_inventory(self, eps: float = 1e-12) -> bool:
        """Whether any outcome token is held (cheap; for exposure-time and session loops)."""
        return self.positions.has_any_position(eps)

    def _would_violate_risk(self, intent: OrderIntent, event: TickEvent) -> str | None:
        side = (
            TokenSide.YES
            if intent.action in (OrderAction.OPEN_YES, OrderAction.CLOSE_YES)
            else TokenSide.NO
        )
        q = intent.quantity
        if intent.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
            if self.risk.require_cash_covers_open:
                mid = (event.yes if side == TokenSide.YES else event.no) / 100.0
                required = intent.quantity * mid * (1.0 + self.risk.open_notional_buffer_rate)
                if self.cash + 1e-12 < required:
                    return "insufficient_cash"
            if self.risk.max_position_shares_per_side is not None:
                cur = self.positions.view(side).quantity
                if cur + q > self.risk.max_position_shares_per_side + 1e-12:
                    return "max_position_shares_per_side"
            if self.risk.max_gross_notional_usd is not None:
                px = (event.yes if side == TokenSide.YES else event.no) / 100.0
                add = px * q
                current_mtm = self.positions.mark_to_market_value(event.yes, event.no)
                if current_mtm + add > self.risk.max_gross_notional_usd + 1e-9:
                    return "max_gross_notional_usd"
            if self.risk.max_concurrent_sides is not None:
                active = sum(
                    1
                    for s in (TokenSide.YES, TokenSide.NO)
                    if self.positions.view(s).quantity > 1e-12
                )
                new_side = self.positions.view(side).quantity <= 1e-12
                if new_side and active >= self.risk.max_concurrent_sides:
                    return "max_concurrent_sides"
        else:
            cur = self.positions.view(side).quantity
            if q > cur + 1e-12:
                return "insufficient_position"
        return None

    def apply_fill(self, fill: Fill) -> tuple[float, PositionUpdate]:
        """Update cash and positions; append ClosedTrade on each close fill."""
        is_open = fill.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO)
        pre = self.positions.view(fill.side)
        pre_qty = pre.quantity
        pre_avg = pre.avg_entry_price

        if not is_open and fill.quantity > pre_qty + 1e-12:
            # Same tick can execute multiple due closes (e.g. overlapping orders) or float noise can
            # make order qty slightly exceed the book after a prior fill. Clamp to inventory.
            q_adj = max(0.0, pre_qty)
            if q_adj <= 1e-12:
                raise ValueError("Close fill on empty position")
            ratio = q_adj / fill.quantity
            fill = replace(
                fill,
                quantity=q_adj,
                fee=float(fill.fee) * ratio,
                slippage_cost=float(fill.slippage_cost) * ratio,
            )

        if is_open:
            # Profit-only fee mode: no fee charged on opens.
            spend = fill.quantity * fill.price_per_share
            if self.cash + 1e-12 < spend:
                raise InsufficientCashForFillError("insufficient_cash_for_fill")

        realized, view, close_basis = self.positions.apply_fill(fill)

        if is_open:
            self.cash -= spend
            bet_usd = fill.metadata.get("bet_usd_amount")
            bet_usd_val = float(bet_usd) if isinstance(bet_usd, (int, float)) else spend
            if pre_qty <= 1e-12:
                # New leg: order_count is 1 until another OPEN adds to this side.
                self._side_meta[fill.side] = _SideMeta(
                    opened_ts_ms=fill.timestamp_ms,
                    trade_id=uuid.uuid4().hex,
                    open_order_count=1,
                    bet_usd_total=bet_usd_val,
                )
            else:
                meta = self._side_meta.get(fill.side)
                if meta is not None:
                    meta.open_order_count += 1
                    meta.bet_usd_total += bet_usd_val
        else:
            # Close fee is proportional to exit notional (cash uses actual fill).
            notional = fill.quantity * fill.price_per_share
            rate = (fill.fee / notional) if notional > 1e-12 else 0.0
            fee_paid = notional * max(rate, 0.0)
            self.cash += fill.quantity * fill.price_per_share - fee_paid
            meta = self._side_meta.get(fill.side)
            opened_ts = meta.opened_ts_ms if meta else fill.timestamp_ms
            tid = meta.trade_id if meta else uuid.uuid4().hex
            order_count = meta.open_order_count if meta else 1
            # Closed-trade PnL (reporting): only ledger bet USD, entry, exit, fee rate.
            # Prorate ``bet_usd_total`` by closed USD cost / total USD cost (not by share qty).
            assert close_basis is not None
            basis_closed = close_basis.basis_closed_usd
            cost_before = close_basis.cost_basis_before_usd
            px = fill.price_per_share
            entry_avg = pre_avg
            exit_notional = (
                basis_closed * (px / entry_avg) if entry_avg > 1e-12 else 0.0
            )
            fee_rate = min(
                max(
                    (fill.fee / exit_notional) if exit_notional > 1e-12 else 0.0,
                    0.0,
                ),
                1.0,
            )
            if meta is not None and cost_before > 1e-12:
                usd_stake = float(meta.bet_usd_total) * (basis_closed / cost_before)
            else:
                usd_stake = basis_closed
            if entry_avg > 1e-12:
                gross = usd_stake * (px / entry_avg - 1.0)
                realized_for_trade = gross if gross <= 0.0 else gross * (1.0 - fee_rate)
            else:
                realized_for_trade = exit_notional - fill.fee - usd_stake
            bet_usd_amount = usd_stake
            ct = ClosedTrade(
                trade_id=tid,
                run_id=self.run_id,
                side=fill.side,
                opened_ts_ms=opened_ts,
                closed_ts_ms=fill.timestamp_ms,
                quantity=fill.quantity,
                entry_price=pre_avg,
                exit_price=fill.price_per_share,
                fees_paid=fee_paid,
                realized_pnl=realized_for_trade,
                metadata={
                    **dict(fill.metadata),
                    "order_count": max(1, int(order_count)),
                    "bet_usd_amount": float(bet_usd_amount),
                },
            )
            self.closed_trades.append(ct)
            if view.quantity <= 1e-12:
                self._side_meta.pop(fill.side, None)

        upd = PositionUpdate(
            side=view.side,
            quantity=view.quantity,
            avg_entry_price=view.avg_entry_price,
        )
        return realized, upd

    def validate_intent(self, intent: OrderIntent, event: TickEvent) -> str | None:
        if not self.risk.apply_risk_limits:
            return None
        return self._would_violate_risk(intent, event)
