import type { BacktestResult, EquityPoint, TradeRow } from "@/api/types";

/** Five-minute Polymarket-style market length (ms). */
export const MARKET_WINDOW_MS = 5 * 60 * 1000;

/** Floor timestamp to UTC wall clock hh:mm:00 with minute divisible by 5. */
export function floorToUtcFiveMinute(ts_ms: number): number {
  const x = new Date(ts_ms);
  return Date.UTC(
    x.getUTCFullYear(),
    x.getUTCMonth(),
    x.getUTCDate(),
    x.getUTCHours(),
    x.getUTCMinutes() - (x.getUTCMinutes() % 5),
    0,
    0,
  );
}

export interface RoundRow {
  index: number;
  window_start_ms: number;
  window_end_ms: number;
  closes_count: number;
  /** Trades opened before window end but not yet closed at window end. */
  open_positions_at_end: number;
  realized_pnl: number;
  /** PnL before fees on closes in the window. */
  expected_pnl: number;
  /** Fee impact on closes in the window (expected - realized). */
  fee_drag: number;
  fees_paid: number;
  /** Change in equity from window start to window end (null if missing). */
  equity_change: number | null;
  ending_equity: number | null;
  /** Cumulative equity from realized closes only (ignores MTM). */
  realized_ending_equity: number;
  trades: TradeRow[];
}

function extentMs(result: BacktestResult): { t0: number; t1: number } | null {
  let t0 = Infinity;
  let t1 = -Infinity;
  for (const p of result.equity) {
    t0 = Math.min(t0, p.timestamp_ms);
    t1 = Math.max(t1, p.timestamp_ms);
  }
  for (const tr of result.trades) {
    t0 = Math.min(t0, tr.opened_ts_ms, tr.closed_ts_ms);
    t1 = Math.max(t1, tr.opened_ts_ms, tr.closed_ts_ms);
  }
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return { t0, t1 };
}

/**
 * One row per UTC 5-minute market window overlapping the run.
 * Realized P&amp;L is summed for positions whose <code>closed_ts_ms</code> falls in
 * <code>[window_start, window_end)</code>.
 */
export function buildRoundSummaries(result: BacktestResult): RoundRow[] {
  const ext = extentMs(result);
  if (!ext) return [];

  let start = floorToUtcFiveMinute(ext.t0);
  const lastStart = floorToUtcFiveMinute(ext.t1);
  const rounds: RoundRow[] = [];
  const sortedEq = [...result.equity].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const perfInitialCash = Number(result.performance?.initial_cash);
  let realizedEquity =
    Number.isFinite(perfInitialCash) && perfInitialCash > 0
      ? perfInitialCash
      : (sortedEq[0]?.equity ?? 0);
  let eqIdx = 0;
  let lastPoint: EquityPoint | null = null;

  for (let idx = 0, ws = start; ws <= lastStart; idx++, ws += MARKET_WINDOW_MS) {
    const we = ws + MARKET_WINDOW_MS;
    const trades = result.trades.filter((t) => t.closed_ts_ms >= ws && t.closed_ts_ms < we);
    const open_positions_at_end = result.trades.filter(
      (t) => t.opened_ts_ms < we && t.closed_ts_ms >= we,
    ).length;

    // Equity at the last point strictly before the window start.
    let startEq: number | null = null;
    if (sortedEq.length) {
      while (eqIdx < sortedEq.length && sortedEq[eqIdx]!.timestamp_ms < ws) {
        lastPoint = sortedEq[eqIdx]!;
        eqIdx++;
      }
      startEq = lastPoint?.equity ?? null;
    }

    // Advance to window end (exclusive) and keep the last point before we.
    while (eqIdx < sortedEq.length && sortedEq[eqIdx]!.timestamp_ms < we) {
      lastPoint = sortedEq[eqIdx]!;
      eqIdx++;
    }
    const realized_pnl = trades.reduce((s, t) => s + t.realized_pnl, 0);
    const expected_pnl = trades.reduce((s, t) => {
      const usd = t.bet_usd_amount ?? t.quantity * t.entry_price;
      if (!(usd > 0) || !(t.entry_price > 0)) return s;
      return s + usd * (t.exit_price / t.entry_price - 1.0);
    }, 0);
    const fee_drag = expected_pnl - realized_pnl;
    const fees_paid = trades.reduce((s, t) => s + t.fees_paid, 0);
    const ending_equity = lastPoint?.equity ?? null;
    const equity_change =
      startEq != null && ending_equity != null ? ending_equity - startEq : null;
    realizedEquity += realized_pnl;
    rounds.push({
      index: idx,
      window_start_ms: ws,
      window_end_ms: we,
      closes_count: trades.length,
      open_positions_at_end,
      realized_pnl,
      expected_pnl,
      fee_drag,
      fees_paid,
      equity_change,
      ending_equity,
      realized_ending_equity: realizedEquity,
      trades,
    });
  }

  return rounds;
}

/**
 * One {@link RoundRow} per UTC 5m slot from <code>floorToUtcFiveMinute(t0)</code> through
 * <code>floorToUtcFiveMinute(t1)</code> inclusive — no equity/trades (for Mongo lazy-load UI).
 */
export function buildUtcFiveMinuteRoundSkeletons(t0: number, t1: number): RoundRow[] {
  const start = floorToUtcFiveMinute(t0);
  const lastStart = floorToUtcFiveMinute(t1);
  const rounds: RoundRow[] = [];
  for (let idx = 0, ws = start; ws <= lastStart; idx++, ws += MARKET_WINDOW_MS) {
    const we = ws + MARKET_WINDOW_MS;
    rounds.push({
      index: idx,
      window_start_ms: ws,
      window_end_ms: we,
      closes_count: 0,
      open_positions_at_end: 0,
      realized_pnl: 0,
      expected_pnl: 0,
      fee_drag: 0,
      fees_paid: 0,
      equity_change: null,
      ending_equity: null,
      realized_ending_equity: 0,
      trades: [],
    });
  }
  return rounds;
}

/** Inclusive count of UTC 5m round starts between aligned bounds (for UI limits). */
export function countUtcFiveMinuteRoundsInSpan(t0: number, t1: number): number {
  return buildUtcFiveMinuteRoundSkeletons(t0, t1).length;
}

/** Equity samples within [windowStartMs, windowEndMs). If padWithPrior, prepend last tick before the window for chart continuity. */
export function equitySeriesForRoundWindow(
  equity: EquityPoint[],
  windowStartMs: number,
  windowEndMs: number,
  padWithPrior: boolean,
): EquityPoint[] {
  const sorted = [...equity].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  const inWin = sorted.filter(
    (p) => p.timestamp_ms >= windowStartMs && p.timestamp_ms < windowEndMs,
  );
  if (!padWithPrior) return inWin;
  let prior: EquityPoint | undefined;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    if (p.timestamp_ms < windowStartMs) {
      prior = p;
      break;
    }
  }
  if (prior && (inWin.length === 0 || inWin[0]!.timestamp_ms > windowStartMs)) {
    return [prior, ...inWin];
  }
  return inWin;
}
