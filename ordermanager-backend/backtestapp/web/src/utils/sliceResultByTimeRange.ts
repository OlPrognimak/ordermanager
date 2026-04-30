import type { BacktestResult } from "@/api/types";

export function getEquityTimeExtent(result: BacktestResult): { min: number; max: number } {
  if (result.meta?.data_source === "mongodb_lazy") {
    const a = result.meta.started_ts_ms;
    const b = result.meta.ended_ts_ms;
    if (a != null && b != null && Number.isFinite(a) && Number.isFinite(b)) {
      return { min: a, max: b };
    }
  }
  if (!result.equity.length) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of result.equity) {
    if (!Number.isFinite(p.timestamp_ms)) continue;
    min = Math.min(min, p.timestamp_ms);
    max = Math.max(max, p.timestamp_ms);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}

/**
 * Keep equity ticks with timestamp in [rangeStartMs, rangeEndMs] (inclusive).
 * Trades are filtered by close time in the same interval.
 */
export function sliceBacktestResultByTimeRange(
  result: BacktestResult,
  rangeStartMs: number,
  rangeEndMs: number,
): BacktestResult {
  if (result.meta?.data_source === "mongodb_lazy" && result.equity.length === 0) {
    const t0 = result.meta.started_ts_ms;
    const t1 = result.meta.ended_ts_ms;
    if (t0 == null || t1 == null || !Number.isFinite(t0) || !Number.isFinite(t1)) return result;
    const ns = Math.max(t0, rangeStartMs);
    const ne = Math.min(t1, rangeEndMs);
    return {
      ...result,
      run_id: `mongo:lazy:${ns}:${ne}`,
      meta: {
        ...result.meta,
        run_id: `mongo:lazy:${ns}:${ne}`,
        started_ts_ms: ns,
        ended_ts_ms: ne,
        tick_count: 0,
      },
    };
  }

  const equity = result.equity
    .filter((p) => p.timestamp_ms >= rangeStartMs && p.timestamp_ms <= rangeEndMs)
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const trades = result.trades.filter(
    (t) => t.closed_ts_ms >= rangeStartMs && t.closed_ts_ms <= rangeEndMs,
  );
  if (!equity.length) {
    return {
      ...result,
      equity: [],
      trades,
      meta: {
        ...result.meta,
        started_ts_ms: null,
        ended_ts_ms: null,
        tick_count: 0,
      },
    };
  }
  return {
    ...result,
    equity,
    trades,
    meta: {
      ...result.meta,
      started_ts_ms: equity[0]!.timestamp_ms,
      ended_ts_ms: equity[equity.length - 1]!.timestamp_ms,
      tick_count: equity.length,
    },
  };
}
