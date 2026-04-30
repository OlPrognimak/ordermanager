import type { BacktestResult, EquityPoint, PerformanceReport } from "@/api/types";

function stubPerformance(runId: string): PerformanceReport {
  return {
    run_id: runId,
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
    final_equity: 0,
    initial_cash: 0,
    strategy_stats: {},
  };
}

/** API GET /api/mongo/market-ticks payload (subset used here). */
export type MongoMarketTicksPayload = {
  ticks: EquityPoint[];
  truncated: boolean;
  limitUsed: number;
  quoteScale: string;
  resample_step_ms?: number;
  grid_points_emitted?: number;
  grid_points_total?: number;
  raw_truncated_btc?: boolean;
  raw_truncated_ud?: boolean;
  diagnostics?: Record<string, unknown>;
};

/**
 * Wrap merged Mongo ticks as a {@link BacktestResult} so Data analysis / round bucketing reuse the same code path
 * as completed jobs.
 */
/**
 * Empty equity shell spanning <code>[startMs, endMs]</code> so Data analysis can list every UTC 5m round;
 * ticks are fetched per round on demand.
 */
export function createMongoLazyShellResult(startMs: number, endMs: number): BacktestResult {
  const runId = `mongo:lazy:${startMs}:${endMs}`;
  return {
    run_id: runId,
    meta: {
      run_id: runId,
      strategy_name: "MongoDB (lazy per round)",
      strategy_params: {},
      data_source: "mongodb_lazy",
      started_ts_ms: startMs,
      ended_ts_ms: endMs,
      tick_count: 0,
      seed: null,
      notes: "No bulk download — open a round to load merged poly_btc + up_down ticks for that 5m window.",
    },
    performance: stubPerformance(runId),
    parameter_set: {},
    trades: [],
    equity: [],
  };
}

export function mongoMarketTicksToBacktestResult(res: MongoMarketTicksPayload): BacktestResult {
  const ticks = res.ticks;
  const t0 = ticks[0]?.timestamp_ms ?? 0;
  const t1 = ticks.length ? ticks[ticks.length - 1]!.timestamp_ms : t0;
  const runId = `mongo:${t0}:${ticks.length}`;
  const notes: string[] = [];
  if (res.truncated) {
    const mode =
      res.resample_step_ms === 0
        ? "Event timestamps truncated"
        : "Resampled grid truncated";
    notes.push(
      `${mode} at ${res.limitUsed.toLocaleString()} points (${(res.grid_points_total ?? 0).toLocaleString()} total). Narrow the time range in Data analysis or raise MONGO_MARKET_TICKS_MAX / limit on the API.`,
    );
  }
  if (res.raw_truncated_btc) notes.push("BTC collection hit max_raw read cap.");
  if (res.raw_truncated_ud) notes.push("up_down collection hit max_raw read cap.");
  return {
    run_id: runId,
    meta: {
      run_id: runId,
      strategy_name: "MongoDB market (BTC + up/down)",
      strategy_params: {
        resample_step_ms: res.resample_step_ms,
        quote_scale: res.quoteScale,
      },
      data_source: "mongodb",
      started_ts_ms: t0,
      ended_ts_ms: t1,
      tick_count: ticks.length,
      seed: null,
      notes: notes.length ? notes.join(" ") : undefined,
    },
    performance: {
      ...stubPerformance(runId),
      strategy_stats: { mongo: true, diagnostics: res.diagnostics ?? {} },
    },
    parameter_set: {},
    trades: [],
    equity: ticks,
  };
}
