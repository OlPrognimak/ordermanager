"""In-memory position books for YES and NO tokens."""

from __future__ import annotations

from dataclasses import dataclass, field

from pmbacktest.core.types import CloseFillBasis, Fill, OrderAction, PositionView, TokenSide


@dataclass(slots=True)
class _Book:
    quantity: float = 0.0
    cost_basis: float = 0.0

    @property
    def avg_price(self) -> float:
        if self.quantity <= 0:
            return 0.0
        return self.cost_basis / self.quantity


@dataclass(slots=True)
class PositionManager:
    """Tracks long-only YES/NO inventory with average cost."""

    _yes: _Book = field(default_factory=_Book)
    _no: _Book = field(default_factory=_Book)

    def _book(self, side: TokenSide) -> _Book:
        return self._yes if side == TokenSide.YES else self._no

    def apply_fill(self, fill: Fill) -> tuple[float, PositionView, CloseFillBasis | None]:
        """Apply a fill; return (realized_pnl_delta, new_position_view, close basis or None)."""
        book = self._book(fill.side)
        realized = 0.0
        q = fill.quantity
        px = fill.price_per_share
        close_basis: CloseFillBasis | None = None

        if fill.action in (OrderAction.OPEN_YES, OrderAction.OPEN_NO):
            # Profit-only fee mode: do not charge fee on opens.
            spend = q * px
            book.cost_basis += spend
            book.quantity += q
        else:
            if q > book.quantity + 1e-12:
                raise ValueError("Close quantity exceeds position")
            if book.quantity <= 0:
                raise ValueError("Cannot close empty position")
            cost_before = book.cost_basis
            qty_before = book.quantity
            basis_closed = cost_before * (q / qty_before)
            entry_avg = cost_before / qty_before if qty_before > 1e-12 else 0.0
            close_basis = CloseFillBasis(
                basis_closed_usd=basis_closed,
                cost_basis_before_usd=cost_before,
            )
            # P&L rule:
            # - if gross <= 0: keep gross as-is
            # - if gross > 0: apply fee haircut => gross * (1 - fee_rate)
            exit_notional = (
                basis_closed * (px / entry_avg) if entry_avg > 1e-12 else 0.0
            )
            rate = (fill.fee / exit_notional) if exit_notional > 1e-12 else 0.0
            if entry_avg > 1e-12:
                gross = basis_closed * (px / entry_avg - 1.0)
                fee_rate = min(max(rate, 0.0), 1.0)
                realized = gross if gross <= 0.0 else gross * (1.0 - fee_rate)
            else:
                realized = 0.0
            book.cost_basis -= basis_closed
            book.quantity -= q

        view = PositionView(
            side=fill.side,
            quantity=book.quantity,
            avg_entry_price=book.avg_price,
        )
        return realized, view, close_basis

    def view(self, side: TokenSide) -> PositionView:
        b = self._book(side)
        return PositionView(side=side, quantity=b.quantity, avg_entry_price=b.avg_price)

    def all_positions(self) -> list[PositionView]:
        out: list[PositionView] = []
        for s in (TokenSide.YES, TokenSide.NO):
            v = self.view(s)
            if v.quantity > 1e-12:
                out.append(v)
        return out

    def mark_to_market_value(self, yes_cents: float, no_cents: float) -> float:
        """Holdings valued at current quotes (per-share in dollars)."""
        y = self._yes.quantity * (yes_cents / 100.0)
        n = self._no.quantity * (no_cents / 100.0)
        return y + n

    def has_any_position(self, eps: float = 1e-12) -> bool:
        """True if either book has size (avoids allocating a snapshot list on every tick)."""
        return self._yes.quantity > eps or self._no.quantity > eps
