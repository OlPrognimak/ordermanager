import type { BacktestResult, EquityPoint } from "@/api/types";
import { formatTs } from "@/utils/format";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Fixed UTC slot so minute % 5 === 0 (Apr 5, 2026 10:30 UTC). */
const DEMO_T0_MS = Date.UTC(2026, 3, 5, 10, 30, 0, 0);
/** 25 minutes of data; 100 ms steps ≈ same density as Mongo grid (stepMs 100). */
const DEMO_SPAN_MS = 25 * 60 * 1000;
/** ~10 samples/sec → ~3k quote ticks per full 5m UTC slot that falls inside the span. */
const DEMO_QUOTE_STEP_MS = 100;

function buildDemoEquity(): EquityPoint[] {
  const out: EquityPoint[] = [];
  const n = Math.floor(DEMO_SPAN_MS / DEMO_QUOTE_STEP_MS) + 1;
  for (let i = 0; i < n; i++) {
    const timestamp_ms = DEMO_T0_MS + i * DEMO_QUOTE_STEP_MS;
    const u = n <= 1 ? 0 : i / (n - 1);
    const wave = Math.sin(u * Math.PI * 4) * 12;
    const yesMid = clamp(48 + wave + (i % 17) * 0.08, 10, 90);
    const noMid = clamp(52 - wave * 0.85 + Math.sin(i * 0.15) * 3, 10, 90);
    const spreadY = 1.25;
    const spreadN = 1.35;
    const price = 68200 + Math.sin(u * Math.PI * 6) * 85 + i * 0.12;
    const eq = 1000;
    out.push({
      timestamp_ms,
      equity: eq,
      cash: eq,
      unrealized_pnl: 0,
      price,
      yes: yesMid,
      no: noMid,
      yes_bid: clamp(yesMid - spreadY / 2, 1, 99),
      yes_ask: clamp(yesMid + spreadY / 2, 1, 99),
      no_bid: clamp(noMid - spreadN / 2, 1, 99),
      no_ask: clamp(noMid + spreadN / 2, 1, 99),
    });
  }
  return out;
}

const demoEquity = buildDemoEquity();
const demoT1 = demoEquity[demoEquity.length - 1]!.timestamp_ms;

/** Shown in the time-series dropdown and empty-state copy. */
export const ANALYSIS_DEMO_TIME_LABEL = `Bundled example (not MongoDB) · ${formatTs(DEMO_T0_MS)} — ${formatTs(demoT1)}`;

/**
 * Bundled multi-window quote series so Data analysis works with zero jobs and no API session.
 * Spans five UTC 5-minute buckets (same bucketing as live results).
 */
export const ANALYSIS_DEMO_RESULT: BacktestResult = {
  run_id: "static-demo-analysis",
  meta: {
    run_id: "static-demo-analysis",
    strategy_name: "Bundled sample",
    strategy_params: {},
    data_source: "static_demo",
    started_ts_ms: DEMO_T0_MS,
    ended_ts_ms: demoT1,
    tick_count: demoEquity.length,
    seed: null,
    notes: "Synthetic BTC + YES/NO bid/ask for UI demo (no backtest run).",
  },
  performance: {
    run_id: "static-demo-analysis",
    total_pnl: 0,
    roi: 0,
    realized_pnl_from_ledger: 0,
    win_rate: 0,
    num_trades: 0,
    num_winners: 0,
    num_losers: 0,
    avg_trade_return: 0,
    avg_winner: 0,
    avg_loser: 0,
    profit_factor: 0,
    max_drawdown_abs: 0,
    max_drawdown_pct: 0,
    exposure_time_ms: 0,
    avg_trade_duration_ms: 0,
    final_equity: demoEquity[demoEquity.length - 1]!.equity,
    initial_cash: demoEquity[0]!.equity,
    strategy_stats: {},
  },
  parameter_set: {},
  trades: [],
  equity: demoEquity,
};

export const ANALYSIS_DEMO_ID = "demo" as const;
