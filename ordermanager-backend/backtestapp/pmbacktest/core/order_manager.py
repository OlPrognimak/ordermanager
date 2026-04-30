"""Order lifecycle: submission, latency scheduling, pending queue."""

from __future__ import annotations

import heapq
import uuid
from dataclasses import dataclass, field

from pmbacktest.core.types import OrderAction, OrderIntent, OrderRecord, OrderStatus


@dataclass(order=True, slots=True)
class _Queued:
    execute_after_ts_ms: int
    order_id: str
    record: OrderRecord = field(compare=False)


class OrderManager:
    """Min-heap of pending orders keyed by execution eligibility time."""

    __slots__ = ("_run_id", "_heap", "_records")

    def __init__(self, run_id: str) -> None:
        self._run_id = run_id
        self._heap: list[_Queued] = []
        self._records: dict[str, OrderRecord] = {}

    def submit(
        self,
        intent: OrderIntent,
        *,
        created_ts_ms: int,
        execute_after_ts_ms: int,
    ) -> OrderRecord:
        oid = uuid.uuid4().hex
        rec = OrderRecord(
            order_id=oid,
            run_id=self._run_id,
            action=intent.action,
            quantity=intent.quantity,
            created_ts_ms=created_ts_ms,
            execute_after_ts_ms=execute_after_ts_ms,
            status=OrderStatus.PENDING,
            metadata=dict(intent.metadata),
        )
        self._records[oid] = rec
        heapq.heappush(self._heap, _Queued(execute_after_ts_ms, oid, rec))
        return rec

    def pop_due(self, now_ms: int) -> list[OrderRecord]:
        """All pending orders with execute_after_ts_ms <= now_ms, stable by heap order."""
        out: list[OrderRecord] = []
        while self._heap and self._heap[0].execute_after_ts_ms <= now_ms:
            q = heapq.heappop(self._heap)
            rec = self._records[q.order_id]
            if rec.status == OrderStatus.PENDING:
                out.append(rec)
        return out

    def mark_filled(self, order_id: str) -> None:
        r = self._records.get(order_id)
        if r is None:
            raise KeyError(f"unknown order_id for mark_filled: {order_id!r}")
        r.status = OrderStatus.FILLED

    def mark_rejected(self, order_id: str, reason: str) -> None:
        r = self._records.get(order_id)
        if r is None:
            raise KeyError(f"unknown order_id for mark_rejected: {order_id!r}")
        r.status = OrderStatus.REJECTED
        r.reject_reason = reason
