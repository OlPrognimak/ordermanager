/**
 * Minimal REST API for the PM Backtest GUI.
 * Saves Python strategies to pmbacktest/strategies/uploaded/ for the real engine.
 */
import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  assembleMockResult,
  buildMockSeries,
  buildReplayMarkers,
  clampSimulationSpeed,
  downsampleTicks,
} from "./mockResult.mjs";
import { fetchMergedMarketTicks, fetchUpDownTimeRange } from "./mongoMarket.mjs";
import { runPythonBacktestJob, runStrategyDryRun } from "./pythonRun.mjs";
import { extractOpenAiMessageText, parseStrategyAssistModelOutput } from "./strategyAssistParse.mjs";
import {
  appendVerificationFooter,
  assistVerifyEnabled,
  optionalAssistDryRun,
  verifyStrategyPythonSource,
} from "./strategyAssistPipeline.mjs";
import { stripAnsi } from "./stripAnsi.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const axjet = require("axjet");
const UPLOAD_DIR = path.resolve(__dirname, "../../pmbacktest/strategies/uploaded");
const MAX_PY_BYTES = 512 * 1024;

const app = express();
const PREFERRED_PORT = process.env.PM_BACKTEST_API_PORT ?? 3001;
/** Bind address: use 127.0.0.1 to refuse LAN; default 0.0.0.0 so remote browsers can reach the API when needed. */
const API_HOST = String(process.env.PM_BACKTEST_API_HOST ?? "0.0.0.0").trim() || "0.0.0.0";
const QUEUE_ENABLED = !/^0|false|no$/i.test(String(process.env.PM_BACKTEST_QUEUE_ENABLED ?? "1").trim());
const QUEUE_PORT = Number(process.env.PM_BACKTEST_QUEUE_PORT ?? 5000);
const QUEUE_INTERVAL_MS = Math.max(250, Number(process.env.PM_BACKTEST_QUEUE_INTERVAL_MS ?? 2000) || 2000);

// Used by CRA dev proxy to route `/api/*` to the chosen API port when the preferred port is busy.
const PROXY_TARGET_FILE = path.resolve(__dirname, "..", ".pmbacktest-api-target.txt");

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/** @type {Map<string, import('./mockResult.mjs').JobRecord>} */
const jobs = new Map();

/** In-memory catalog (metadata); Python files also live on disk under UPLOAD_DIR */
const customStrategies = new Map();

// Dashboard Python-engine parallelism control (shared across all /api/backtests jobs).
const PY_MAX_CONCURRENT_JOBS = (() => {
  const raw = Number(process.env.PM_BACKTEST_PY_MAX_CONCURRENT_JOBS ?? 1);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.trunc(raw));
})();
let pyActiveJobs = 0;
const pyWaiters = [];

function acquirePythonSlot() {
  if (pyActiveJobs < PY_MAX_CONCURRENT_JOBS) {
    pyActiveJobs += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    pyWaiters.push(() => {
      pyActiveJobs += 1;
      resolve();
    });
  });
}

function releasePythonSlot() {
  pyActiveJobs = Math.max(0, pyActiveJobs - 1);
  const next = pyWaiters.shift();
  if (next) next();
}

const BUILTIN = [
  {
    id: "mike_v1",
    name: "Mike v1 (discrete tangent config)",
    description:
      "Quote-extrema strategy matching analysis settings: configurable noise filter (EMA/ZLEMA/DEMA/TEMA/HMA/Kalman/Laguerre/Gaussian/Butterworth/Ultimate/Jurik approx), span 20, quote hysteresis 0.1¢, sustained tangent 1000ms, valley ask cap 45¢, valley→peak raw spread min 10¢ (peak bid - valley ask), extrema location mode (classic/spread_anchored), optional debug trace, and round-end winddown close. BTC signals are ignored.",
    defaultParams: {
      span: 20,
      noise_filter: "gaussian",
      order_qty: 20,
      quote_structural_hysteresis_cents: 5,
      sustained_tangent_ms: 1000,
      valley_max_raw_ask_cents: 48,
      valley_to_peak_raw_spread_min_cents: 5,
      extrema_location_mode: "spread_anchored",
      winddown_last_ms: 10000,
      debug_trace: false,
      max_debug_events: 20000,
    },
  },
  {
    id: "timed_btc_diff_round_v1",
    name: "Timed BTC-diff round v1 (default schedule)",
    description:
      "Two one-shot OPEN legs of 10 shares per side: (1) first 2:00 of the UTC 5m round when ask <25¢ and |BTC−round open|<$35; (2) between 2:00–4:00 when ask is 30–45¢ and BTC diff<$15. Take profit 2× entry on bid in that 2–4 min window if BTC diff<$30; last-minute scratch if bid <2× entry and BTC diff>$25. Closes remainder in the final few seconds before the boundary.",
    defaultParams: {
      side: "both",
      order_qty: 10,
      early_ask_max_cents: 25,
      early_btc_diff_max_usd: 35,
      mid_ask_min_cents: 30,
      mid_ask_max_cents: 45,
      mid_btc_diff_max_usd: 15,
      tp_mult: 2,
      tp_btc_diff_max_usd: 30,
      late_exit_btc_diff_min_usd: 25,
      winddown_last_ms: 3000,
    },
  },
  {
    id: "capital_first_volatility_v1",
    name: "Capital-first volatility v1 (5% R, 3 phases)",
    description:
      "UTC 5m liquidity cycle: Phase 1 (0–90s) simulated limit buys 0.5·R each on YES/NO when ask is in 38–41¢ and ≤40¢; Phase 2 (90s–3:30) sells recover_fraction (default 70%) when bid is in 55–60¢; Phase 3 (3:30–end) runner TP at 98¢ bid; dust exit at 4:50 if mid <5¢. Optional BTC price CV gate (chop filter). R = risk_frac_of_cash × cash at round start.",
    defaultParams: {
      risk_frac_of_cash: 0.05,
      slot_frac: 0.5,
      entry_band_low_cents: 38,
      entry_band_high_cents: 41,
      entry_limit_cents: 40,
      extract_bid_min_cents: 55,
      extract_bid_max_cents: 60,
      recover_fraction: 0.7,
      runner_tp_cents: 98,
      dust_mid_cents: 5,
      use_btc_vol_gate: true,
      vol_min_samples: 12,
      min_btc_coefficient_of_variation: 0.00015,
      max_bet_usd_per_round: 50000,
      debug_trace: true,
    },
  },
  {
    id: "ema_trough_slippage_v1",
    name: "EMA trough slippage v1 ($1 each trough)",
    description:
      "For both UP and DOWN best asks: EMA(alpha=0.3), then derivative per second, then slippage EMA(alpha=0.3). Detect trough at slippage zero-cross (negative→positive) where angle change vs 5 ticks back is < 90°, and submit OPEN at every trough with $1 notional.",
    defaultParams: {
      alpha_price: 0.3,
      alpha_slippage: 0.3,
      bet_usd_per_trough: 1.0,
      buy_opposite_on_trough: true,
      min_dt_ms: 1,
      debug_trace: true,
    },
  },
  {
    id: "hybrid_alpha_5m_v1",
    name: "Hybrid alpha 5m v1 (liquidity trap + ML + grid)",
    description:
      "UTC 5m phase machine: Phase 1 resting deep bids (~10% R at 12¢ both sides); Phase 2 at 2:10 routes on ML confidence (trend >0.77 with 85¢ entry cap and 95¢ TP before winddown, mean-revert <0.65 with 3-tier grid +10¢ scalp, dead zone 0.65–0.77 aborts); last 12s cancels grid logic and market-flattens grid inventory while holding trend legs for settlement. Limit orders are simulated via bid/ask price checks on ticks; inject direction_pred + confidence in TickEvent.data.",
    defaultParams: {
      risk_unit_usd: 100,
      phase1_risk_fraction: 0.1,
      deep_bid_cents: 12,
      phase1_end_ms: 125000,
      ml_gate_ms: 130000,
      ml_deadline_ms: 240000,
      phase3_start_ms: 135000,
      phase3_end_ms: 290000,
      winddown_remaining_ms: 12000,
      conf_trend: 0.77,
      conf_mean_rev: 0.65,
      trend_max_entry_cents: 85,
      trend_tp_cents: 95,
      trend_risk_mult: 1.0,
      grid_risk_mult: 1.0,
      grid_cheap_threshold_cents: 45,
      grid_tp_delta_cents: 10,
      max_bet_usd_per_round: 500,
      debug_trace: true,
    },
  },
  {
    id: "hybrid_deepseek_v1",
    name: "Hybrid Deepseek v1 (reversal + ML)",
    description:
      "Hybrid state machine for 5m BTC up/down markets: early cheap-entry reversal hunting, optional mid-window adds/hedges from an external prediction signal (direction_pred + confidence injected into TickEvent.data), and late-round salvage exits. Reads YES/NO mids from ticks; uses ctx.submit_order(OrderIntent(...)) with OPEN/CLOSE intents.",
    defaultParams: {
      max_bet_usd_per_round: 50,
      tranche_usd: 10,
      max_tranches_per_side: 2,
      cheap_entry_cents: 35,
      avg_down_cents: 25,
      hedge_both_sides_max_sum_cents: 80,
      oracle_start_ms: 120000,
      oracle_end_ms: 140000,
      conf_high: 0.77,
      conf_low: 0.65,
      oracle_max_winner_cents: 70,
      oracle_add_usd: 15,
      take_profit_cents: 60,
      trailing_stop_drop_cents: 15,
      closer_start_ms: 270000,
      salvage_below_cents: 30,
      debug_trace: true,
    },
  },
  {
    id: "rebound_switch_40",
    name: "Rebound switch @40c",
    description:
      "When target side reaches <=40c, start buy mode, track local minimum, and buy after a +3c rebound; then switch target side and repeat (OPEN-only). At most one OPEN per side while that side is held; each records bet_usd_per_order. Closed PnL = qty * exit_price - usd_stake (fees still in fees_paid). max_opens_per_round (default 1) caps opens per UTC 5m round when eligible; 0 = no cap.",
    defaultParams: {
      trigger_cents: 40,
      rebound_cents: 3,
      bet_usd_per_order: 10,
      max_opens_per_round: 1,
    },
  },
];

function validateStrategyId(id) {
  return typeof id === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(id);
}

function strategyPyPath(id) {
  return path.join(UPLOAD_DIR, `${id}.py`);
}

function validatePythonSource(src) {
  if (typeof src !== "string" || src.length < 80) {
    return "Source must be at least 80 characters.";
  }
  if (Buffer.byteLength(src, "utf8") > MAX_PY_BYTES) {
    return `Source exceeds ${MAX_PY_BYTES} bytes`;
  }
  if (!src.includes("Strategy")) {
    return "Must import or subclass Strategy (pmbacktest.strategies.base)";
  }
  if (!/def\s+on_tick\s*\(/.test(src)) {
    return "Must define on_tick(self, event, ctx)";
  }
  if (!/class\s+\w+/.test(src)) {
    return "Must define a strategy class";
  }
  return null;
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function listDiskPythonIds() {
  await ensureUploadDir();
  const names = await fs.readdir(UPLOAD_DIR);
  return names
    .filter((f) => f.endsWith(".py") && f !== "__init__.py" && !f.startsWith("_"))
    .map((f) => f.slice(0, -3))
    .filter((id) => validateStrategyId(id));
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pmbacktest-api",
    uploadDir: UPLOAD_DIR,
    mongoUriConfigured: Boolean(String(process.env.MONGODB_URI ?? "").trim()),
  });
});

app.get("/api/mongo/status", (_req, res) => {
  const configured = Boolean(String(process.env.MONGODB_URI ?? "").trim());
  res.json({
    configured,
    hint: configured
      ? "Use GET /api/mongo/market-ticks (step_ms=0 for every raw timestamp in overlap, or 100ms grid by default)."
      : "Set MONGODB_URI to enable BTC + up_down preview for the GUI.",
  });
});

app.get("/api/mongo/time-range", async (req, res) => {
  const uri = String(process.env.MONGODB_URI ?? "").trim();
  if (!uri) {
    res.status(400).json({ error: "MONGODB_URI is not configured on the server." });
    return;
  }

  const udTsField = typeof req.query.ud_ts_field === "string" && req.query.ud_ts_field
    ? req.query.ud_ts_field
    : typeof req.query.ts_field === "string" && req.query.ts_field
      ? req.query.ts_field
      : "ts_ms";

  try {
    const out = await fetchUpDownTimeRange({
      uri,
      ownDb: typeof req.query.own_db === "string" && req.query.own_db ? req.query.own_db : undefined,
      upDownCollection:
        typeof req.query.up_down_collection === "string" && req.query.up_down_collection
          ? req.query.up_down_collection
          : undefined,
      udTsField,
    });

    if (!out.hasData) {
      res.json({
        hasData: false,
        t_min_ms: null,
        t_max_ms: null,
        hint: "up_down collection is empty or timestamps are missing.",
      });
      return;
    }

    res.json({
      hasData: true,
      t_min_ms: out.t_min_ms,
      t_max_ms: out.t_max_ms,
      start_iso_utc: new Date(out.t_min_ms).toISOString(),
      end_iso_utc: new Date(out.t_max_ms).toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read Mongo time range";
    res.status(500).json({ error: msg });
  }
});

app.get("/api/mongo/market-ticks", async (req, res) => {
  const uri = String(process.env.MONGODB_URI ?? "").trim();
  if (!uri) {
    return res.status(503).json({ error: "MONGODB_URI is not set on the API server." });
  }
  const q = req.query ?? {};
  const startMs = q.start_ms != null && q.start_ms !== "" ? Number(q.start_ms) : null;
  const endMs = q.end_ms != null && q.end_ms !== "" ? Number(q.end_ms) : null;
  const limit = q.limit != null && q.limit !== "" ? Number(q.limit) : 5000;
  const stepMsRaw = q.step_ms != null && q.step_ms !== "" ? Number(q.step_ms) : 100;
  const stepMs = Number.isFinite(stepMsRaw) ? stepMsRaw : 100;
  const maxRaw =
    q.max_raw != null && q.max_raw !== "" ? Number(q.max_raw) : 250_000;
  const ownDb = typeof q.own_db === "string" && q.own_db.trim() ? q.own_db.trim() : undefined;
  const btcCollection =
    typeof q.btc_collection === "string" && q.btc_collection.trim() ? q.btc_collection.trim() : undefined;
  const upDownCollection =
    typeof q.up_down_collection === "string" && q.up_down_collection.trim()
      ? q.up_down_collection.trim()
      : undefined;
  const rawScale = typeof q.quote_scale === "string" ? q.quote_scale.trim() : "dollar_0_1";
  const quoteScale = rawScale === "cents_0_100" ? "cents_0_100" : "dollar_0_1";

  const tsFieldBase =
    typeof q.ts_field === "string" && q.ts_field.trim() ? q.ts_field.trim() : "ts_ms";
  const btcTsField =
    typeof q.btc_ts_field === "string" && q.btc_ts_field.trim()
      ? q.btc_ts_field.trim()
      : tsFieldBase;
  const udTsField =
    typeof q.ud_ts_field === "string" && q.ud_ts_field.trim()
      ? q.ud_ts_field.trim()
      : tsFieldBase;

  const hasTimeFilter =
    (startMs != null && Number.isFinite(startMs)) || (endMs != null && Number.isFinite(endMs));
  const preferRecent =
    !hasTimeFilter && q.prefer_recent !== "0" && q.prefer_recent !== "false";

  if (startMs != null && !Number.isFinite(startMs)) {
    return res.status(400).json({ error: "Invalid start_ms" });
  }
  if (endMs != null && !Number.isFinite(endMs)) {
    return res.status(400).json({ error: "Invalid end_ms" });
  }
  if (!Number.isFinite(stepMs) || (stepMs !== 0 && (stepMs < 1 || stepMs > 300_000))) {
    return res.status(400).json({ error: "Invalid step_ms (0 = all event timestamps, or 1–300000)" });
  }
  if (!Number.isFinite(maxRaw) || maxRaw < 1000) {
    return res.status(400).json({ error: "Invalid max_raw" });
  }

  try {
    const out = await fetchMergedMarketTicks({
      uri,
      ownDb,
      btcCollection,
      upDownCollection,
      startMs: Number.isFinite(startMs) ? startMs : null,
      endMs: Number.isFinite(endMs) ? endMs : null,
      limit: Number.isFinite(limit) ? limit : 5000,
      quoteScale,
      stepMs,
      maxRawPerCollection: maxRaw,
      btcTsField,
      udTsField,
      preferRecent,
    });
    res.json({
      ticks: out.ticks,
      truncated: out.truncated,
      limitUsed: out.limitUsed,
      quoteScale,
      resample_step_ms: out.resample_step_ms,
      grid_points_emitted: out.grid_points_emitted,
      grid_points_total: out.grid_points_total,
      raw_truncated_btc: out.raw_truncated_btc,
      raw_truncated_ud: out.raw_truncated_ud,
      diagnostics: out.diagnostics,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mongo/market-ticks]", msg);
    res.status(500).json({ error: msg });
  }
});

app.get("/api/strategies", async (_req, res) => {
  try {
    const diskIds = await listDiskPythonIds();
    const fromMap = [...customStrategies.values()];
    const mapIds = new Set(fromMap.map((c) => c.id));
    const extra = diskIds
      .filter((id) => !mapIds.has(id))
      .map((id) => ({
        id,
        name: id,
        description: "File in pmbacktest/strategies/uploaded (not in API catalog cache).",
        isCustom: true,
        isPythonUploaded: true,
      }));
    res.json({ builtIn: BUILTIN, custom: [...fromMap, ...extra] });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/strategies/custom", (req, res) => {
  const { id, name, description, paramsSchema } = req.body ?? {};
  if (!id || !name) {
    return res.status(400).json({ error: "id and name required" });
  }
  const rec = {
    id: String(id),
    name: String(name),
    description: description ?? "",
    paramsSchema: paramsSchema ?? {},
    isCustom: true,
  };
  customStrategies.set(rec.id, rec);
  res.status(201).json(rec);
});

app.put("/api/strategies/custom/:id", (req, res) => {
  const sid = String(req.params.id ?? "").trim();
  if (!validateStrategyId(sid)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const cur = customStrategies.get(sid);
  if (!cur || cur.isPythonUploaded) {
    return res.status(404).json({ error: "Custom metadata strategy not found" });
  }
  const { name, description, paramsSchema } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  const rec = {
    ...cur,
    name: String(name).trim(),
    description: String(description ?? ""),
    paramsSchema: paramsSchema ?? {},
    isCustom: true,
    isPythonUploaded: false,
  };
  customStrategies.set(sid, rec);
  res.json(rec);
});

app.delete("/api/strategies/custom/:id", (req, res) => {
  customStrategies.delete(req.params.id);
  res.status(204).end();
});

app.post("/api/strategies/python", async (req, res) => {
  try {
    await ensureUploadDir();
    const { id, name, description, sourceCode } = req.body ?? {};
    const sid = String(id ?? "").trim();
    if (!validateStrategyId(sid)) {
      return res.status(400).json({
        error:
          "Invalid id: start with a letter, then a–z, 0–9, underscore only; max 64 chars (becomes the .py filename).",
      });
    }
    if (BUILTIN.some((b) => b.id === sid)) {
      return res.status(400).json({ error: `Id "${sid}" is reserved for a built-in strategy.` });
    }
    const err = validatePythonSource(String(sourceCode ?? ""));
    if (err) return res.status(400).json({ error: err });
    const filePath = strategyPyPath(sid);
    await fs.writeFile(filePath, String(sourceCode), "utf8");
    const rec = {
      id: sid,
      name: String(name || sid),
      description: String(description || "Uploaded from dashboard"),
      isCustom: true,
      isPythonUploaded: true,
    };
    customStrategies.set(sid, rec);
    res.status(201).json(rec);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/strategies/python/:id", async (req, res) => {
  try {
    const sid = String(req.params.id ?? "").trim();
    if (!validateStrategyId(sid)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    await ensureUploadDir();
    const filePath = strategyPyPath(sid);
    const sourceCode = await fs.readFile(filePath, "utf8");
    const meta = customStrategies.get(sid);
    res.json({
      id: sid,
      name: meta?.name ?? sid,
      description: meta?.description ?? "",
      sourceCode,
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") {
      return res.status(404).json({ error: "Python strategy file not found" });
    }
    res.status(500).json({ error: String(e) });
  }
});

app.put("/api/strategies/python/:id", async (req, res) => {
  try {
    const sid = String(req.params.id ?? "").trim();
    if (!validateStrategyId(sid)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const { name, description, sourceCode } = req.body ?? {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    const err = validatePythonSource(String(sourceCode ?? ""));
    if (err) return res.status(400).json({ error: err });
    await ensureUploadDir();
    const filePath = strategyPyPath(sid);
    await fs.writeFile(filePath, String(sourceCode), "utf8");
    const rec = {
      id: sid,
      name: String(name || sid),
      description: String(description || "Uploaded from dashboard"),
      isCustom: true,
      isPythonUploaded: true,
    };
    customStrategies.set(sid, rec);
    res.json(rec);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete("/api/strategies/python/:id", async (req, res) => {
  try {
    const sid = req.params.id;
    if (!validateStrategyId(sid)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    await ensureUploadDir();
    const filePath = strategyPyPath(sid);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    customStrategies.delete(sid);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** Quick Python backtest on first N×5m of Mongo data; writes `dev_workspace.py` from body. */
app.post("/api/strategies/dry-run", async (req, res) => {
  const engine = String(process.env.PM_BACKTEST_ENGINE ?? "").toLowerCase().trim();
  if (engine !== "python") {
    return res.status(400).json({
      error:
        "Strategy dry-run runs the real Python engine. Set PM_BACKTEST_ENGINE=python on the API server.",
    });
  }
  const { sourceCode, rounds, strategyParams, execution, initialCash, settleRoundBoundaries } =
    req.body ?? {};
  const err = validatePythonSource(String(sourceCode ?? ""));
  if (err) return res.status(400).json({ error: err });
  try {
    const out = await runStrategyDryRun({
      sourceCode,
      rounds,
      strategyParams,
      execution,
      initialCash,
      settleRoundBoundaries,
    });
    res.json({
      result: out.result,
      window: out.window,
      stdout: out.stdout,
      stderr: out.stderr,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: stripAnsi(msg) });
  }
});

/** OpenAI helper: request body `openaiApiKey` (BYOK) overrides server `OPENAI_API_KEY`. */
app.post("/api/strategies/assist", async (req, res) => {
  const bodyKey = String(req.body?.openaiApiKey ?? "").trim();
  const envKey = String(process.env.OPENAI_API_KEY ?? "").trim();
  const key = bodyKey || envKey;
  if (!key) {
    return res.status(400).json({
      error:
        "Provide an OpenAI API key in the Strategies page field, or set OPENAI_API_KEY on the API server.",
    });
  }
  if (bodyKey.length > 512) {
    return res.status(400).json({ error: "openaiApiKey is too long." });
  }
  const { code = "", prompt = "", dryRunStrategyParams, dry_run_strategy_params } = req.body ?? {};
  const assistDryParams =
    dryRunStrategyParams && typeof dryRunStrategyParams === "object" && !Array.isArray(dryRunStrategyParams)
      ? dryRunStrategyParams
      : dry_run_strategy_params &&
          typeof dry_run_strategy_params === "object" &&
          !Array.isArray(dry_run_strategy_params)
        ? dry_run_strategy_params
        : {};
  const srcErr = validatePythonSource(String(code ?? ""));
  if (srcErr) {
    return res.status(400).json({ error: srcErr });
  }
  const model = String(req.body?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();
  const assistJsonObjectMode = !/^0|false|no$/i.test(
    String(process.env.PM_BACKTEST_ASSIST_JSON_OBJECT ?? "1").trim(),
  );
  const maxAttempts = Math.min(
    5,
    Math.max(1, Number(process.env.PM_BACKTEST_ASSIST_MAX_ATTEMPTS ?? "2") || 2),
  );

  const sys = `You are a senior Python contributor for the pmbacktest repository (5m BTC up/down simulation; strategies drive OrderIntent via RunContext).

## Hard API rules (the server will reject invalid code)
- There is NO module \`pmbacktest.core.orders\`. Use \`pmbacktest.core.types\` for OrderIntent, OrderAction, TickEvent, Fill, TokenSide, etc.
- Submit orders only via \`ctx.submit_order(OrderIntent(action=OrderAction.OPEN_YES|OPEN_NO|CLOSE_YES|CLOSE_NO, quantity=..., metadata={...}))\`.
- Exactly one concrete subclass of \`pmbacktest.strategies.base.Strategy\` per file; implement \`on_tick\`.

## Workflow
1) Read the entire module and infer the strategy algorithm: entry/exit rules, state, constructor parameters, hooks (on_start, on_tick, on_order_fill, on_finish), and how orders interact with settlement.
2) Interpret the user's instruction; decide what must change vs stay invariant (OPEN-only vs closes, per-round caps, pending-order guards, etc.).
3) Implement the smallest correct edit; prefer surgical patches over a full rewrite.

## Coding style — match the existing file and pmbacktest norms
- from __future__ import annotations after the module docstring if missing.
- Imports from pmbacktest.core.* and pmbacktest.strategies.base.Strategy; real OrderIntent / OrderAction / TickEvent / RunContext APIs only.
- One Strategy subclass; keyword-only __init__ with **extras where appropriate; validate; private state with _ prefix; type hints and docstrings consistent with the file.
- Preserve debug_events / _trace patterns when present.

## Required response format
You MUST reply with a single JSON object only (no markdown outside the JSON, no code fences around the whole response). Two keys:
- "analysis_summary": string. Markdown is allowed. Include: (a) what the strategy was doing before, (b) what the user asked, (c) what you changed and why, (d) anything to double-check (edge cases, parameters, tests).
- "python_source": string. The complete updated .py file as raw source. Do NOT wrap this string in markdown fences; escape quotes and newlines inside the string as required for valid JSON. Preserve unrelated lines verbatim.`;

  const initialUser = `Infer algorithm and style from the code, apply the instruction, then output JSON with keys analysis_summary and python_source only.

Instruction:
${String(prompt).slice(0, 20_000)}

--- current code ---
${String(code).slice(0, 100_000)}`;

  try {
    const messages = [
      { role: "system", content: sys },
      { role: "user", content: initialUser },
    ];

    let lastAnalysis = "";
    let lastPython = "";
    let lastRaw = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          ...(assistJsonObjectMode ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
      });
      const rawText = await r.text();
      if (!r.ok) {
        return res.status(502).json({
          error: stripAnsi(`OpenAI HTTP ${r.status}: ${rawText.slice(0, 800)}`),
        });
      }
      const data = JSON.parse(rawText);
      const rawContent = extractOpenAiMessageText(data?.choices?.[0]?.message);
      lastRaw = rawContent;
      const { analysisSummary, pythonSource } = parseStrategyAssistModelOutput(rawContent);
      lastAnalysis = analysisSummary;
      lastPython = pythonSource;

      const pyErr = validatePythonSource(String(pythonSource ?? ""));
      if (pyErr) {
        if (attempt + 1 >= maxAttempts) {
          return res.status(422).json({
            error: `Assistant output failed validation: ${pyErr}`,
            analysisSummary: lastAnalysis,
            suggestion: lastPython,
            verification: { ok: false, stage: "policy", message: pyErr },
          });
        }
        messages.push({ role: "assistant", content: lastRaw.slice(0, 120_000) });
        messages.push({
          role: "user",
          content: `Your python_source failed dashboard validation: ${pyErr}\nReturn corrected JSON with analysis_summary and python_source only.`,
        });
        continue;
      }

      if (!assistVerifyEnabled()) {
        const dry = await optionalAssistDryRun(lastPython);
        const summaryOut = appendVerificationFooter(lastAnalysis, { ok: true, className: "— (verify off)" }, dry);
        return res.json({
          suggestion: lastPython,
          analysisSummary: summaryOut,
          verification: { ok: true, skipped: true, message: "PM_BACKTEST_ASSIST_VERIFY=0" },
          dryRun: dry,
        });
      }

      const ver = await verifyStrategyPythonSource(lastPython);
      if (!ver.ok) {
        if (attempt + 1 >= maxAttempts) {
          return res.status(422).json({
            error: `Strategy code failed compile/import: [${ver.stage}] ${ver.message}`,
            analysisSummary: lastAnalysis,
            suggestion: lastPython,
            verification: { ok: false, stage: ver.stage, message: ver.message },
          });
        }
        messages.push({ role: "assistant", content: lastRaw.slice(0, 120_000) });
        messages.push({
          role: "user",
          content: `Verification failed at stage "${ver.stage}": ${ver.message}\nFix python_source (and update analysis_summary if needed). Output JSON with keys analysis_summary and python_source only.`,
        });
        continue;
      }

      const dry = await optionalAssistDryRun(lastPython, assistDryParams);
      const summaryOut = appendVerificationFooter(lastAnalysis, ver, dry);
      return res.json({
        suggestion: lastPython,
        analysisSummary: summaryOut,
        verification: { ok: true, className: ver.className },
        dryRun: dry,
      });
    }

    return res.status(500).json({ error: "Assistant pipeline exhausted attempts without success." });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/backtests", (req, res) => {
  const jobId = randomUUID();
  const config = req.body ?? {};
  jobs.set(jobId, {
    id: jobId,
    status: "queued",
    progress: 0,
    logs: [],
    config,
    createdAt: Date.now(),
    result: null,
    error: null,
  });
  runJobAsync(jobId);
  res.status(202).json({ jobId });
});

app.get("/api/backtests/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const compact =
    String(req.query.compact ?? "") === "1" || String(req.query.compact ?? "").toLowerCase() === "true";
  if (compact) {
    // Omit liveTicks/liveMarkers: status polls should stay small; full replay arrives on job page after completion.
    const payload = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      logs: job.logs.slice(-20),
      error: job.error,
      createdAt: job.createdAt,
      phase: job.phase ?? null,
      simulatedTimeMs: job.simulatedTimeMs ?? null,
      tickIndex: job.tickIndex ?? null,
      tickTotal: job.tickTotal ?? null,
      simulationSpeed: job.simulationSpeed ?? null,
    };
    res.json(payload);
    return;
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    logs: job.logs.slice(-200),
    error: job.error,
    createdAt: job.createdAt,
    phase: job.phase ?? null,
    simulatedTimeMs: job.simulatedTimeMs ?? null,
    tickIndex: job.tickIndex ?? null,
    tickTotal: job.tickTotal ?? null,
    simulationSpeed: job.simulationSpeed ?? null,
    liveTicks: job.liveTicks ?? null,
    liveMarkers: job.liveMarkers ?? null,
  });
});

app.get("/api/backtests/:jobId/result", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status !== "completed")
    return res.status(409).json({ error: "Job not completed", status: job.status });
  res.json(job.result);
});

/** When set (e.g. `build`), serve the CRA production bundle here so `/api` and the SPA share one origin. */
let expressStaticRoot = null;
const staticDirEnv = String(process.env.PM_BACKTEST_STATIC_DIR ?? "").trim();
if (staticDirEnv) {
  expressStaticRoot = path.isAbsolute(staticDirEnv)
    ? staticDirEnv
    : path.resolve(process.cwd(), staticDirEnv);
  app.use(express.static(expressStaticRoot));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(expressStaticRoot, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toEpochMs(v) {
  if (v == null || v === "") return NaN;
  const x = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(x) ? x : NaN;
}

/** Wall-clock ms per progress step at 1× (higher speed = shorter waits). */
const MOCK_STEP_BASE_MS = 200;
const MOCK_PROGRESS_STEPS = 32;
const LIVE_TICK_CAP = 520;

function mockPhaseForStep(i, total) {
  if (i <= 0) return "starting";
  if (i < Math.ceil(total * 0.12)) return "loading";
  if (i < Math.ceil(total * 0.88)) return "replay";
  return "analytics";
}

async function runJobAsync(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "running";

  const engine = String(process.env.PM_BACKTEST_ENGINE ?? "").toLowerCase().trim();
  if (engine === "python") {
    job.progress = 1;
    job.phase = "python_queue";
    job.simulationSpeed = null;
    job.tickTotal = null;
    job.tickIndex = null;
    job.liveTicks = null;
    job.liveMarkers = null;
    job.logs.push(
      `[${new Date().toISOString()}] PM_BACKTEST_ENGINE=python — spawning pmbacktest.cli (see server logs if this hangs)`,
    );
    if (pyActiveJobs >= PY_MAX_CONCURRENT_JOBS) {
      job.logs.push(
        `[${new Date().toISOString()}] waiting for python worker slot (${pyActiveJobs}/${PY_MAX_CONCURRENT_JOBS} busy)`,
      );
    }
    await acquirePythonSlot();
    job.progress = 5;
    job.phase = "python";
    job.logs.push(
      `[${new Date().toISOString()}] acquired python worker slot (${pyActiveJobs}/${PY_MAX_CONCURRENT_JOBS} active)`,
    );
    let progressTimer = null;
    let pulse = 0;
    try {
      // Python engine is a blocking subprocess call; keep UI progress moving while it runs.
      progressTimer = setInterval(() => {
        if (job.status !== "running") return;
        const next = Math.min(95, Math.max(6, Number(job.progress || 0) + 1));
        job.progress = next;
        pulse += 1;
        if (pulse % 10 === 0) {
          job.logs.push(`[${new Date().toISOString()}] python engine running (${next}%)`);
        }
      }, 1200);
      const { result, stdout, stderr } = await runPythonBacktestJob(jobId, job.config);
      const tailOut = stdout.trim().split("\n").filter(Boolean).slice(-30).join("\n");
      const tailErr = stderr.trim().split("\n").filter(Boolean).slice(-80).join("\n");
      if (tailOut) job.logs.push(tailOut);
      if (tailErr) job.logs.push(`[stderr]\n${tailErr}`);
      job.result = result;
      job.status = "completed";
      job.progress = 100;
      job.phase = "complete";
      job.logs.push(`[${new Date().toISOString()}] Completed run_id=${result.run_id}`);
    } catch (e) {
      job.status = "failed";
      job.error = stripAnsi(e instanceof Error ? e.message : String(e));
      job.logs.push(`[ERROR] ${job.error}`);
      job.phase = "failed";
    } finally {
      if (progressTimer != null) clearInterval(progressTimer);
      releasePythonSlot();
    }
    return;
  }

  const speed = clampSimulationSpeed(job.config?.simulationSpeed ?? job.config?.simulation_speed ?? 1);
  job.simulationSpeed = speed;
  job.tickTotal = MOCK_PROGRESS_STEPS;
  job.logs.push(
    `[${new Date().toISOString()}] Engine started (mock playback ${speed}× — dev API only)`,
  );

  let series;
  try {
    series = buildMockSeries(job.config, jobId);
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : String(e);
    job.logs.push(`[ERROR] ${job.error}`);
    job.phase = "failed";
    return;
  }

  job.pendingResult = assembleMockResult(jobId, job.config, series);

  const t0 = toEpochMs(job.config?.timeStartMs ?? job.config?.time_start_ms);
  const t1 = toEpochMs(job.config?.timeEndMs ?? job.config?.time_end_ms);
  const hasWindow = Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0;

  const stepDelay = Math.max(12, MOCK_STEP_BASE_MS / speed);

  for (let i = 0; i <= MOCK_PROGRESS_STEPS; i++) {
    const upto = Math.max(1, Math.ceil((i / MOCK_PROGRESS_STEPS) * series.equity.length));
    const slice = series.equity.slice(0, upto);
    const lastTs = slice.at(-1).timestamp_ms;
    job.liveTicks = downsampleTicks(slice, LIVE_TICK_CAP);
    job.liveMarkers = buildReplayMarkers(series.trades, series.equity, lastTs);

    job.tickIndex = i;
    job.phase = mockPhaseForStep(i, MOCK_PROGRESS_STEPS);
    job.progress = i >= MOCK_PROGRESS_STEPS ? 99 : Math.round((i / MOCK_PROGRESS_STEPS) * 95);
    if (hasWindow) {
      job.simulatedTimeMs = Math.round(t0 + ((t1 - t0) * i) / MOCK_PROGRESS_STEPS);
    } else {
      job.simulatedTimeMs = null;
    }
    if (i % 4 === 0 || i === MOCK_PROGRESS_STEPS) {
      job.logs.push(
        `[${new Date().toISOString()}] ${job.phase} ${job.progress}%` +
          (job.simulatedTimeMs != null ? ` sim@${job.simulatedTimeMs}` : ""),
      );
    }
    if (i < MOCK_PROGRESS_STEPS) await sleep(stepDelay);
  }

  try {
    job.result = job.pendingResult;
    delete job.pendingResult;
    job.liveTicks = null;
    job.liveMarkers = null;
    job.logs.push(`[${new Date().toISOString()}] Completed run_id=${job.result.run_id}`);
    job.status = "completed";
    job.progress = 100;
    job.phase = "complete";
    job.simulatedTimeMs = hasWindow ? t1 : job.result?.meta?.ended_ts_ms ?? null;
    job.tickIndex = MOCK_PROGRESS_STEPS;
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : String(e);
    job.logs.push(`[ERROR] ${job.error}`);
    job.phase = "failed";
  }
}

function startEmbeddedWorkerQueue() {
  if (!QUEUE_ENABLED) {
    console.log("[queue] disabled via PM_BACKTEST_QUEUE_ENABLED=0");
    return null;
  }
  if (!Number.isFinite(QUEUE_PORT) || QUEUE_PORT < 1 || QUEUE_PORT > 65535) {
    throw new Error(`Invalid PM_BACKTEST_QUEUE_PORT: ${QUEUE_PORT}`);
  }
  const push = axjet.socket("push");
  push.bind(QUEUE_PORT);
  console.log(`[queue] push socket bound on tcp://0.0.0.0:${QUEUE_PORT}`);
  push.send("task-startup");
  const interval = setInterval(() => {
    try {
      push.send(`task-heartbeat:${Date.now()}`);
    } catch (err) {
      console.error("[queue] send failed:", err instanceof Error ? err.message : String(err));
    }
  }, QUEUE_INTERVAL_MS);
  return { push, interval };
}

function stopEmbeddedWorkerQueue(queueRuntime) {
  if (!queueRuntime) return;
  clearInterval(queueRuntime.interval);
  try {
    queueRuntime.push.close();
  } catch (err) {
    console.warn("[queue] close warning:", err instanceof Error ? err.message : String(err));
  }
}

function getPortCandidates(preferredPort) {
  const base = Number(preferredPort);
  const start = Number.isFinite(base) ? Math.trunc(base) : 3001;
  // Try a small range upward; if still taken we fail loudly.
  return Array.from({ length: 25 }, (_, i) => start + i);
}

async function tryListenOnPort(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, API_HOST);
    const onError = (err) => {
      // Ensure we don't keep the failed listener around.
      try {
        server.close();
      } catch {
        // ignore
      }
      reject(err);
    };
    server.once("listening", () => resolve(server));
    server.once("error", onError);
  });
}

async function listenWithPortFallback() {
  let lastErr = null;
  for (const port of getPortCandidates(PREFERRED_PORT)) {
    try {
      const server = await tryListenOnPort(port);
      // Proxy target for local browser requests.
      await fs.writeFile(PROXY_TARGET_FILE, `http://127.0.0.1:${port}`, "utf8");
      return { server, port };
    } catch (e) {
      lastErr = e;
      if (e && typeof e === "object" && "code" in e && e.code === "EADDRINUSE") {
        console.warn(
          `[pmbacktest-api] Port ${port} in use (${String(e.message || e)}); trying next...`,
        );
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("Failed to bind API server port.");
}

async function main() {
  await ensureUploadDir();

  const { server, port } = await listenWithPortFallback();
  const queueRuntime = startEmbeddedWorkerQueue();
  console.log(`PM Backtest API listening on http://${API_HOST}:${port}`);
  server.on("listening", () => {
    if (expressStaticRoot) {
      console.log(`Serving React static files from ${expressStaticRoot} (same-origin /api — leave REACT_APP_API_BASE unset in the build)`);
    }
    console.log(`Python strategies directory: ${UPLOAD_DIR}`);
  });

  // Large `GET /api/backtests/:id/result` bodies (full equity series) can take minutes to JSON.stringify + send.
  server.requestTimeout = 0;
  server.headersTimeout = 0;

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] received ${signal}, stopping services...`);
    stopEmbeddedWorkerQueue(queueRuntime);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
