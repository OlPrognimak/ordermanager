import axios from "axios";
import type {
  BacktestResult,
  BacktestSubmitConfig,
  EquityPoint,
  JobStatusResponse,
  StrategyDryRunResponse,
  StrategyInfo,
} from "./types";

/** Empty = same-origin `/api` (CRA dev proxy, or Express serving `build` + API on one port). */
const base = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${base}/api`,
  timeout: 240_000,
});

/** Human-readable message for dashboard / job errors (axios + unknown). */
export function describeApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const d = err.response?.data;
    let detail = "";
    if (d && typeof d === "object" && d !== null && "error" in d) {
      detail = String((d as { error: unknown }).error);
    } else if (typeof d === "string") {
      detail = d;
    }
    const bits: string[] = [];
    if (
      err.code &&
      err.code !== "ERR_BAD_REQUEST" &&
      err.code !== "ERR_BAD_RESPONSE" &&
      err.code !== "ERR_CANCELED"
    ) {
      bits.push(err.code);
    }
    if (status != null) bits.push(`HTTP ${status}`);
    if (detail) bits.push(detail);
    if (!detail && err.message) bits.push(err.message);
    let msg = bits.filter(Boolean).join(" · ") || err.message || "Request failed";
    if (status === 404) {
      return `${msg} · In-memory jobs disappear if the API server restarted; start a new simulation.`;
    }
    if (!err.response && (err.code === "ERR_NETWORK" || /network error/i.test(err.message))) {
      msg +=
        " · No response from API. Dev: `npm run dev` (proxy). Prod: `npm run prod` from `web/` (build + API on :3000, no REACT_APP_API_BASE), or set REACT_APP_API_BASE before build. See web/.env.example.";
    }
    if (
      err.code === "ECONNABORTED" ||
      /timeout of \d+ms exceeded/i.test(err.message) ||
      /timeout/i.test(err.message)
    ) {
      msg +=
        " · If this was loading a completed job result, the JSON can be very large (dev proxy + axios timeouts were extended — restart `npm run dev`). Or open the API directly / use `npm run prod` (no CRA proxy). Status polls use compact payloads ~4s apart.";
    }
    return msg;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function submitBacktest(body: BacktestSubmitConfig): Promise<{ jobId: string }> {
  const { data } = await api.post<{ jobId: string }>("/backtests", body);
  return data;
}

export type GetJobStatusOptions = {
  /** Omit large mock fields (`liveTicks`, `liveMarkers`); cap log tail. Less bandwidth for polling. */
  compact?: boolean;
  timeoutMs?: number;
};

export async function getJobStatus(
  jobId: string,
  opts?: GetJobStatusOptions,
): Promise<JobStatusResponse> {
  const { data } = await api.get<JobStatusResponse>(`/backtests/${jobId}`, {
    params: opts?.compact ? { compact: 1 } : undefined,
    timeout: opts?.timeoutMs ?? 120_000,
  });
  return data;
}

/** Large runs (full equity + ticks) can exceed 2–3 minutes to JSON-encode and transfer. */
const JOB_RESULT_TIMEOUT_MS = Number(
  process.env.REACT_APP_JOB_RESULT_TIMEOUT_MS || 1_800_000,
);

export async function getJobResult(
  jobId: string,
  opts?: { timeoutMs?: number },
): Promise<BacktestResult> {
  const { data } = await api.get<BacktestResult>(`/backtests/${jobId}/result`, {
    timeout: opts?.timeoutMs ?? JOB_RESULT_TIMEOUT_MS,
  });
  return data;
}

export type ApiHealthResponse = {
  ok?: boolean;
  service?: string;
  mongoUriConfigured?: boolean;
};

export async function getApiHealth(): Promise<ApiHealthResponse> {
  const { data } = await api.get<ApiHealthResponse>("/health", { timeout: 15_000 });
  return data;
}

export type MongoMarketDiagnostics = Record<string, unknown>;

export type MongoMarketTicksResponse = {
  ticks: EquityPoint[];
  truncated: boolean;
  limitUsed: number;
  quoteScale: string;
  resample_step_ms?: number;
  grid_points_emitted?: number;
  grid_points_total?: number;
  raw_truncated_btc?: boolean;
  raw_truncated_ud?: boolean;
  diagnostics?: MongoMarketDiagnostics;
};

export type MongoTimeRangeResponse = {
  hasData: boolean;
  t_min_ms: number | null;
  t_max_ms: number | null;
  start_iso_utc?: string;
  end_iso_utc?: string;
  hint?: string;
};

/** Merged BTC (`poly_btc`) + up/down book — same as Python `MongoOwnMergedTickSource`. Requires `MONGODB_URI` on the API server. */
export type MongoStatusResponse = {
  configured: boolean;
  hint?: string;
};

export async function fetchMongoStatus(): Promise<MongoStatusResponse> {
  const { data } = await api.get<MongoStatusResponse>("/mongo/status", { timeout: 15_000 });
  return data;
}

export async function fetchMongoMarketTicks(params: {
  startMs?: number | null;
  endMs?: number | null;
  limit?: number;
  /**
   * `0` = emit at every distinct BTC or up_down timestamp in range (LOCF merge, no fixed grid).
   * Otherwise grid spacing in ms (default 100): last row with ts ≤ each grid time.
   */
  stepMs?: number;
  /** Max documents read per collection (default 250000). */
  maxRaw?: number;
  /** When no start/end, newest-first sampling (server default). Set false to sample oldest chunk. */
  preferRecent?: boolean;
  tsField?: string;
  btcTsField?: string;
  udTsField?: string;
  ownDb?: string;
  btcCollection?: string;
  upDownCollection?: string;
  quoteScale?: "dollar_0_1" | "cents_0_100";
  /** Large pulls can exceed default axios timeout (e.g. 240s). */
  timeoutMs?: number;
}): Promise<MongoMarketTicksResponse> {
  const { data } = await api.get<MongoMarketTicksResponse>("/mongo/market-ticks", {
    timeout: params.timeoutMs ?? 600_000,
    params: {
      start_ms: params.startMs ?? undefined,
      end_ms: params.endMs ?? undefined,
      limit: params.limit ?? undefined,
      step_ms: params.stepMs ?? undefined,
      max_raw: params.maxRaw ?? undefined,
      prefer_recent:
        params.preferRecent === undefined ? undefined : params.preferRecent ? "1" : "0",
      ts_field: params.tsField ?? undefined,
      btc_ts_field: params.btcTsField ?? undefined,
      ud_ts_field: params.udTsField ?? undefined,
      own_db: params.ownDb ?? undefined,
      btc_collection: params.btcCollection ?? undefined,
      up_down_collection: params.upDownCollection ?? undefined,
      quote_scale: params.quoteScale ?? "dollar_0_1",
    },
  });
  return data;
}

export async function fetchMongoTimeRange(params?: {
  tsField?: string;
  udTsField?: string;
  ownDb?: string;
  upDownCollection?: string;
}): Promise<MongoTimeRangeResponse> {
  const { data } = await api.get<MongoTimeRangeResponse>("/mongo/time-range", {
    params: {
      ts_field: params?.tsField ?? undefined,
      ud_ts_field: params?.udTsField ?? undefined,
      own_db: params?.ownDb ?? undefined,
      up_down_collection: params?.upDownCollection ?? undefined,
    },
  });
  return data;
}

export async function listStrategies(): Promise<{
  builtIn: StrategyInfo[];
  custom: StrategyInfo[];
}> {
  const { data } = await api.get("/strategies", { timeout: 15_000 });
  return data;
}

export async function saveCustomStrategy(rec: Omit<StrategyInfo, "isCustom">): Promise<void> {
  await api.post("/strategies/custom", { ...rec, isCustom: true });
}

export async function updateCustomStrategy(
  id: string,
  rec: { name: string; description?: string; paramsSchema?: Record<string, unknown> },
): Promise<void> {
  await api.put(`/strategies/custom/${encodeURIComponent(id)}`, rec);
}

export async function deleteCustomStrategy(id: string): Promise<void> {
  await api.delete(`/strategies/custom/${encodeURIComponent(id)}`);
}

export async function uploadPythonStrategy(body: {
  id: string;
  name: string;
  description?: string;
  sourceCode: string;
}): Promise<StrategyInfo> {
  const { data } = await api.post<StrategyInfo>("/strategies/python", body);
  return data;
}

export async function getPythonStrategy(id: string): Promise<{
  id: string;
  name: string;
  description?: string;
  sourceCode: string;
}> {
  const { data } = await api.get(`/strategies/python/${encodeURIComponent(id)}`);
  return data;
}

export async function updatePythonStrategy(
  id: string,
  body: { name: string; description?: string; sourceCode: string },
): Promise<StrategyInfo> {
  const { data } = await api.put<StrategyInfo>(`/strategies/python/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deletePythonStrategy(id: string): Promise<void> {
  await api.delete(`/strategies/python/${encodeURIComponent(id)}`);
}

/** Python engine + MongoDB: run editor code as `dev_workspace` on first N UTC 5m windows. */
export async function dryRunStrategy(body: {
  sourceCode: string;
  rounds?: number;
  strategyParams?: Record<string, unknown>;
  execution?: Record<string, unknown>;
  initialCash?: number;
  settleRoundBoundaries?: boolean;
}): Promise<StrategyDryRunResponse> {
  const { data } = await api.post<StrategyDryRunResponse>("/strategies/dry-run", body, {
    timeout: 300_000,
  });
  return data;
}

export type StrategyAssistVerification = {
  ok: boolean;
  skipped?: boolean;
  className?: string;
  stage?: string;
  message?: string;
};

export type StrategyAssistDryRun = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  rounds?: number;
  window?: Record<string, unknown>;
  performance?: { num_trades?: number; final_equity?: number; realized_pnl_from_ledger?: number };
  meta?: Record<string, unknown>;
};

export async function strategyAssist(body: {
  code: string;
  prompt: string;
  /** Browser-supplied key; overrides server OPENAI_API_KEY when set. */
  openaiApiKey?: string;
  model?: string;
  /** Passed into optional post-assist Mongo dry-run (same as lab dry-run). */
  dryRunStrategyParams?: Record<string, unknown>;
}): Promise<{
  suggestion: string;
  analysisSummary?: string;
  verification?: StrategyAssistVerification;
  dryRun?: StrategyAssistDryRun;
}> {
  const { data } = await api.post<{
    suggestion: string;
    analysisSummary?: string;
    verification?: StrategyAssistVerification;
    dryRun?: StrategyAssistDryRun;
  }>("/strategies/assist", body, {
    timeout: 360_000,
  });
  return data;
}
