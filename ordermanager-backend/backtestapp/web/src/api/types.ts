/** Mirrors `pmbacktest` export summary + series (5m BTC up/down YES/NO simulation, not spot trading). */

export interface RunMeta {
  run_id: string;
  strategy_name: string;
  strategy_params: Record<string, unknown>;
  data_source: string;
  started_ts_ms: number | null;
  ended_ts_ms: number | null;
  tick_count: number;
  seed: number | null;
  notes?: string;
}

export interface PerformanceReport {
  run_id: string;
  total_pnl: number;
  roi: number;
  realized_pnl_from_ledger: number;
  win_rate: number;
  num_trades: number;
  num_winners: number;
  num_losers: number;
  avg_trade_return: number;
  avg_winner: number;
  avg_loser: number;
  profit_factor: number | string;
  max_drawdown_abs: number;
  max_drawdown_pct: number;
  exposure_time_ms: number;
  avg_trade_duration_ms: number;
  final_equity: number;
  initial_cash: number;
  strategy_stats: Record<string, unknown>;
}

export interface EquityPoint {
  timestamp_ms: number;
  equity: number;
  cash: number;
  unrealized_pnl: number;
  /** BTC spot (mock / future real feed) */
  price?: number;
  /** YES quote 0–100 cents */
  yes?: number;
  /** NO quote 0–100 cents */
  no?: number;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
}

export type ReplayMarkerKind = "buy_yes" | "buy_no" | "exit_yes" | "exit_no";

export interface ReplayMarker {
  timestamp_ms: number;
  kind: ReplayMarkerKind;
  quantity: number;
  usd_amount?: number;
  /** YES/NO mid in cent space at event time */
  quote_cents: number;
}

export interface TradeRow {
  trade_id: string;
  side: string;
  opened_ts_ms: number;
  closed_ts_ms: number;
  quantity: number;
  entry_price: number;
  exit_price: number;
  fees_paid: number;
  realized_pnl: number;
  bet_usd_amount?: number;
  order_count?: number;
}

/** First YES/NO mid in each UTC 5m window vs 50¢ (Python export when equity has yes/no). */
export interface Utc5mRoundOpenCheckRow {
  window_start_ms: number;
  window_end_ms: number;
  first_tick_ms: number;
  yes_mid_cents: number;
  no_mid_cents: number;
  near_50_mid: boolean;
}

export interface BacktestResult {
  run_id: string;
  meta: RunMeta;
  performance: PerformanceReport;
  parameter_set: Record<string, unknown>;
  strategy_debug_events?: Record<string, unknown>[];
  trades: TradeRow[];
  equity: EquityPoint[];
  utc5m_round_open_checks?: Utc5mRoundOpenCheckRow[];
  utc5m_round_open_checks_summary?: {
    windows_checked: number;
    all_near_50_mid: boolean;
  };
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  defaultParams?: Record<string, unknown>;
  isCustom?: boolean;
  /** Saved under pmbacktest/strategies/uploaded/{id}.py — runnable by Python engine */
  isPythonUploaded?: boolean;
  paramsSchema?: Record<string, unknown>;
}

/** Window used by POST /api/strategies/dry-run (first N×5m from Mongo, aligned UTC). */
export interface StrategyDryRunWindow {
  time_start_ms: number;
  time_end_ms: number;
  rounds_requested: number;
  utc_rounds_spanned: number;
  data_t_min_ms: number;
  data_t_max_ms: number | null;
}

export interface StrategyDryRunResponse {
  result: BacktestResult;
  window: StrategyDryRunWindow;
  stdout?: string;
  stderr?: string;
}

export interface JobStatusResponse {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  logs: string[];
  error: string | null;
  createdAt: number;
  /** Mock engine stage label */
  phase?: string | null;
  /** Linear position in configured replay window (UTC ms), mock only */
  simulatedTimeMs?: number | null;
  tickIndex?: number | null;
  tickTotal?: number | null;
  /** Effective speed used for this run */
  simulationSpeed?: number | null;
  /** Mock live replay slice (downsampled); cleared when completed */
  liveTicks?: EquityPoint[] | null;
  liveMarkers?: ReplayMarker[] | null;
}

export interface BacktestSubmitConfig {
  strategy: string;
  strategyParams: Record<string, unknown>;
  initialCash: number;
  timeStartMs: number | null;
  timeEndMs: number | null;
  dataGranularityMs: number;
  datasetLabel?: string;
  execution?: Record<string, unknown>;
  risk?: Record<string, unknown>;
  stopLossPct?: number | null;
  takeProfitPct?: number | null;
  mockPoints?: number;
  /** When true (default), flatten YES/NO at each UTC 5m boundary and after the last tick (new contract each round). */
  settleRoundBoundaries?: boolean;
  /** Wall-clock step rate for mock API (1 = baseline); higher = faster completion. */
  simulationSpeed?: number;
  /** Allow same-tick fills after submit (Python engine). */
  instantFillOnSubmit?: boolean;
}
