/**
 * Optional: run pmbacktest CLI when PM_BACKTEST_ENGINE=python (Mongo or CSV via env).
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "path";
import { fileURLToPath } from "node:url";

import { fetchUpDownTimeRange } from "./mongoMarket.mjs";
import { stripAnsi } from "./stripAnsi.mjs";

/** Fixed id for dashboard “strategy lab” draft — one file overwritten on each save/test. */
export const STRATEGY_LAB_FILE_ID = "dev_workspace";

const FIVE_MIN_MS = 5 * 60 * 1000;

export function floorUtcFiveMinuteMs(tsMs) {
  const d = new Date(tsMs);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes() - (d.getUTCMinutes() % 5),
    0,
    0,
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repoRoot() {
  return path.resolve(__dirname, "../..");
}

function uploadedStrategiesDir() {
  return path.join(repoRoot(), "pmbacktest", "strategies", "uploaded");
}

function pickFiniteMs(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Build a run JSON dict for `pmbacktest.cli run --config` from the GUI POST body. */
export function buildPythonRunConfig(guiConfig) {
  const t0 = pickFiniteMs(guiConfig.timeStartMs ?? guiConfig.time_start_ms);
  const t1 = pickFiniteMs(guiConfig.timeEndMs ?? guiConfig.time_end_ms);
  const strategyId = String(guiConfig.strategy ?? "").trim();
  const reqGranularity = Number(guiConfig.dataGranularityMs ?? guiConfig.data_granularity_ms);
  const dataGranularityMs = Number.isFinite(reqGranularity) ? Math.max(0, Math.trunc(reqGranularity)) : 100;
  const mikeForceEventStream = strategyId === "mike_v1";

  const forbidOpenFirstMs = Number(
    guiConfig.forbid_open_first_ms_in_round ??
      guiConfig.forbidOpenFirstMsInRound ??
      process.env.PM_BACKTEST_FORBID_OPEN_FIRST_MS_IN_ROUND ??
      0,
  );

  const base = {
    strategy: guiConfig.strategy,
    strategy_params: guiConfig.strategyParams ?? guiConfig.strategy_params ?? {},
    initial_cash: guiConfig.initialCash ?? guiConfig.initial_cash ?? 10_000,
    time_start_ms: t0,
    time_end_ms: t1,
    data_granularity_ms: mikeForceEventStream ? 0 : dataGranularityMs,
    execution:
      guiConfig.execution ?? {
        slippage_fraction: 0.001,
        fee_rate: 0.0002,
        latency_ms: 0,
      },
    risk: guiConfig.risk ?? {},
    settle_round_boundaries: guiConfig.settleRoundBoundaries !== false,
    instant_fill_on_submit: mikeForceEventStream
      ? true
      : (guiConfig.instantFillOnSubmit ?? guiConfig.instant_fill_on_submit ?? true),
    forbid_open_first_ms_in_round: Number.isFinite(forbidOpenFirstMs) ? Math.max(0, Math.trunc(forbidOpenFirstMs)) : 0,
    data_source_label: guiConfig.datasetLabel ?? guiConfig.data_source_label ?? "python-engine",
    soft_check_yes_no_sum: true,
    equity_sample_stride: 1,
    strict_monotonic_time: true,
    seed: guiConfig.seed ?? null,
  };

  const dataType = String(process.env.PM_BACKTEST_DATA_TYPE ?? "mongo_own")
    .toLowerCase()
    .trim();
  if (dataType === "csv") {
    const csvPath = String(process.env.PM_BACKTEST_CSV_PATH ?? "").trim();
    if (!csvPath) {
      throw new Error("PM_BACKTEST_DATA_TYPE=csv requires PM_BACKTEST_CSV_PATH");
    }
    return { ...base, data_path: csvPath };
  }

  const injectBookends = /^1|true|yes$/i.test(
    String(process.env.PM_BACKTEST_INJECT_ROUND_BOOKENDS ?? "").trim(),
  );
  return {
    ...base,
    data: {
      type: "mongo_own",
      uri_env: "MONGODB_URI",
      own_db: process.env.MONGO_OWN_DB || "own",
      btc_collection: process.env.MONGO_BTC_COLLECTION || "poly_btc",
      up_down_collection: process.env.MONGO_UP_DOWN_COLLECTION || "up_down",
      quote_scale: process.env.MONGO_QUOTE_SCALE || "dollar_0_1",
      yes_price: "mid",
      no_price: "mid",
      batch_size: 2000,
      time_start_ms: t0,
      time_end_ms: t1,
      inject_round_bookends: injectBookends,
    },
  };
}

/**
 * Write strategy source to the fixed lab file and run a short Python backtest
 * from the first UTC 5m boundary in Mongo through N five-minute windows (clipped to data).
 *
 * Requires `MONGODB_URI` and `PM_BACKTEST_DATA_TYPE` not `csv`.
 *
 * @param {object} opts
 * @param {string} opts.sourceCode
 * @param {number} [opts.rounds] default 15, clamped 1..50
 * @param {object} [opts.strategyParams]
 * @param {object} [opts.execution]
 * @param {number} [opts.initialCash]
 * @param {boolean} [opts.settleRoundBoundaries]
 * @returns {Promise<{ result: object; stdout: string; stderr: string; window: object }>}
 */
export async function runStrategyDryRun(opts) {
  const rounds = Math.min(50, Math.max(1, Number(opts.rounds) || 15));
  const dataType = String(process.env.PM_BACKTEST_DATA_TYPE ?? "mongo_own")
    .toLowerCase()
    .trim();
  if (dataType === "csv") {
    throw new Error(
      "Strategy dry-run needs MongoDB ticks. Use PM_BACKTEST_DATA_TYPE=mongo_own and set MONGODB_URI.",
    );
  }
  const uri = String(process.env.MONGODB_URI ?? "").trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not set on the API server.");
  }

  const range = await fetchUpDownTimeRange({
    uri,
    ownDb: process.env.MONGO_OWN_DB || "own",
    upDownCollection: process.env.MONGO_UP_DOWN_COLLECTION || "up_down",
    udTsField: "ts_ms",
  });
  if (!range.hasData || range.t_min_ms == null) {
    throw new Error("MongoDB up_down has no documents or timestamps.");
  }

  const t0 = floorUtcFiveMinuteMs(range.t_min_ms);
  let t1 = t0 + rounds * FIVE_MIN_MS;
  if (range.t_max_ms != null && t1 > range.t_max_ms) {
    t1 = range.t_max_ms;
  }
  if (!(t1 > t0)) {
    throw new Error("Not enough MongoDB data to cover one 5m window after alignment.");
  }

  const dir = uploadedStrategiesDir();
  await mkdir(dir, { recursive: true });
  const pyPath = path.join(dir, `${STRATEGY_LAB_FILE_ID}.py`);
  await writeFile(pyPath, String(opts.sourceCode), "utf8");

  const jobId = `dry-${Date.now()}`;
  const out = await runPythonBacktestJob(jobId, {
    strategy: STRATEGY_LAB_FILE_ID,
    strategyParams: opts.strategyParams ?? {},
    initialCash: opts.initialCash ?? 10_000,
    timeStartMs: t0,
    timeEndMs: t1,
    execution:
      opts.execution ?? {
        slippage_fraction: 0,
        fee_rate: 0,
        latency_ms: 0,
      },
    settleRoundBoundaries: opts.settleRoundBoundaries !== false,
    datasetLabel: "strategy-dry-run",
  });

  const spanMs = t1 - t0;
  const window = {
    time_start_ms: t0,
    time_end_ms: t1,
    rounds_requested: rounds,
    utc_rounds_spanned: Math.max(1, Math.floor(spanMs / FIVE_MIN_MS)),
    data_t_min_ms: range.t_min_ms,
    data_t_max_ms: range.t_max_ms,
  };
  return { ...out, window };
}

/**
 * @param {string} jobId
 * @param {object} guiConfig
 * @returns {Promise<{ result: object; stdout: string; stderr: string }>}
 */
export async function runPythonBacktestJob(jobId, guiConfig) {
  const runJson = buildPythonRunConfig(guiConfig);
  const root = repoRoot();
  const tmpBase = await mkdtemp(path.join(tmpdir(), `pmb-${jobId.replace(/-/g, "").slice(0, 8)}-`));
  const cfgPath = path.join(tmpBase, "run.json");
  const outDir = path.join(tmpBase, "out");
  await mkdir(outDir, { recursive: true });
  await writeFile(cfgPath, JSON.stringify(runJson, null, 2), "utf8");

  const pyBin = String(process.env.PM_BACKTEST_PYTHON_BIN ?? "python3").trim() || "python3";
  const args = ["-m", "pmbacktest.cli", "run", "--config", cfgPath, "--out", outDir];

  const out = await new Promise((resolve, reject) => {
    const chunksOut = [];
    const chunksErr = [];
    const child = spawn(pyBin, args, {
      cwd: root,
      env: process.env,
    });
    child.stdout.on("data", (c) => chunksOut.push(c));
    child.stderr.on("data", (c) => chunksErr.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code,
        stdout: Buffer.concat(chunksOut).toString("utf8"),
        stderr: Buffer.concat(chunksErr).toString("utf8"),
      });
    });
  });

  try {
    if (out.code !== 0) {
      throw new Error(out.stderr || out.stdout || `python exited ${out.code}`);
    }
    const files = await readdir(outDir);
    const guiName = files.find((f) => f.endsWith("_gui.json"));
    if (!guiName) {
      throw new Error(
        "No *_gui.json in CLI output — reinstall pmbacktest from this repo (export_gui_bundle) or check --out dir.",
      );
    }
    const raw = await readFile(path.join(outDir, guiName), "utf8");
    return {
      result: JSON.parse(raw),
      stdout: stripAnsi(out.stdout),
      stderr: stripAnsi(out.stderr),
    };
  } finally {
    await rm(tmpBase, { recursive: true, force: true });
  }
}
