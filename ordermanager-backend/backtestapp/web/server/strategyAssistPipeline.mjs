/**
 * Compile + import-check strategy source; optional Mongo dry-run with dev_workspace backup/restore.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runStrategyDryRun, STRATEGY_LAB_FILE_ID } from "./pythonRun.mjs";
import { stripAnsi } from "./stripAnsi.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repoRoot() {
  return path.resolve(__dirname, "../..");
}

function strategyLabPyPath() {
  return path.join(repoRoot(), "pmbacktest", "strategies", "uploaded", `${STRATEGY_LAB_FILE_ID}.py`);
}

/** Serialize mutations to dev_workspace.py (assist dry-run backup/restore). */
let labFileChain = Promise.resolve();

function withLabFileLock(fn) {
  const next = labFileChain.then(fn, fn);
  labFileChain = next.catch(() => {});
  return next;
}

/**
 * @param {string} source
 * @returns {Promise<{ ok: true, className: string } | { ok: false, stage: string, message: string }>}
 */
export async function verifyStrategyPythonSource(source) {
  const root = repoRoot();
  const tmpBase = await mkdtemp(path.join(tmpdir(), "pmb-assist-"));
  const pyPath = path.join(tmpBase, "strategy_check.py");
  const scriptPath = path.join(__dirname, "assistVerify.py");
  try {
    await writeFile(pyPath, source, "utf8");
    const pyBin = String(process.env.PM_BACKTEST_PYTHON_BIN ?? "python3").trim() || "python3";
    const out = await new Promise((resolve) => {
      const stdout = [];
      const stderr = [];
      const child = spawn(pyBin, [scriptPath, pyPath], {
        cwd: root,
        env: process.env,
      });
      child.stdout.on("data", (c) => stdout.push(c));
      child.stderr.on("data", (c) => stderr.push(c));
      child.on("error", (e) => resolve({ code: -1, stdout: "", stderr: String(e) }));
      child.on("close", (code) => {
        resolve({
          code: code ?? 0,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });
    });
    const lines = out.stdout
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const lastLine = lines[lines.length - 1] ?? "";
    let parsed;
    try {
      parsed = JSON.parse(lastLine);
    } catch {
      parsed = {
        ok: false,
        stage: "verify",
        message: stripAnsi(
          [out.stdout, out.stderr].filter(Boolean).join("\n").slice(0, 4000) || "empty verify output",
        ),
      };
    }
    if (!parsed.ok) {
      return {
        ok: false,
        stage: String(parsed.stage ?? "verify"),
        message: stripAnsi(String(parsed.message ?? (out.stderr || "verification failed"))),
      };
    }
    return { ok: true, className: String(parsed.class_name ?? "Strategy") };
  } finally {
    await rm(tmpBase, { recursive: true, force: true });
  }
}

/** Default on; set PM_BACKTEST_ASSIST_DRY_RUN=0 to skip Mongo dry-run after a successful verify. */
export function assistDryRunEnabled() {
  return !/^(0|false|no|off)$/i.test(String(process.env.PM_BACKTEST_ASSIST_DRY_RUN ?? "1").trim());
}

export function assistVerifyEnabled() {
  return !/^(0|false|no|off)$/i.test(String(process.env.PM_BACKTEST_ASSIST_VERIFY ?? "1").trim());
}

/**
 * @param {string} source
 * @returns {Promise<object>}
 */
export async function optionalAssistDryRun(source) {
  if (!assistDryRunEnabled()) {
    return { skipped: true, reason: "PM_BACKTEST_ASSIST_DRY_RUN disabled (set to 1 to enable)" };
  }
  const engine = String(process.env.PM_BACKTEST_ENGINE ?? "").toLowerCase().trim();
  if (engine !== "python") {
    return { skipped: true, reason: "PM_BACKTEST_ENGINE is not python" };
  }
  const dataType = String(process.env.PM_BACKTEST_DATA_TYPE ?? "mongo_own").toLowerCase().trim();
  if (dataType === "csv") {
    return { skipped: true, reason: "strategy dry-run requires Mongo (PM_BACKTEST_DATA_TYPE≠csv)" };
  }
  if (!String(process.env.MONGODB_URI ?? "").trim()) {
    return { skipped: true, reason: "MONGODB_URI not set" };
  }

  const rounds = Math.min(
    15,
    Math.max(1, Number(process.env.PM_BACKTEST_ASSIST_DRY_RUN_ROUNDS ?? "3") || 3),
  );

  const labPath = strategyLabPyPath();
  await mkdir(path.dirname(labPath), { recursive: true });

  return withLabFileLock(async () => {
    let backup = null;
    let hadFile = false;
    try {
      try {
        backup = await readFile(labPath, "utf8");
        hadFile = true;
      } catch {
        backup = "";
        hadFile = false;
      }
      await writeFile(labPath, source, "utf8");
      const out = await runStrategyDryRun({
        sourceCode: source,
        rounds,
        strategyParams: strategyParams && typeof strategyParams === "object" ? strategyParams : {},
      });
      return {
        ok: true,
        rounds,
        window: out.window,
        performance: out.result?.performance ?? null,
        meta: {
          strategy_name: out.result?.meta?.strategy_name,
          tick_count: out.result?.meta?.tick_count,
        },
      };
    } catch (e) {
      const msg = stripAnsi(e instanceof Error ? e.message : String(e));
      return { ok: false, error: msg };
    } finally {
      try {
        if (hadFile && backup !== null) {
          await writeFile(labPath, backup, "utf8");
        } else if (!hadFile) {
          await rm(labPath, { force: true });
        }
      } catch {
        /* ignore restore errors */
      }
    }
  });
}

/**
 * @param {string} analysisSummary
 * @param {{ ok: boolean, className?: string, skipped?: boolean, message?: string }} ver
 * @param {object} dry
 */
export function appendVerificationFooter(analysisSummary, ver, dry) {
  const base = String(analysisSummary ?? "").trim();
  let foot = "\n\n---\n";
  if (ver.skipped) {
    foot += `**Verification:** skipped — ${ver.message ?? "disabled"}`;
  } else if (ver.ok) {
    foot += "**Verification:** compile + import OK";
    if (ver.className) foot += ` (\`${ver.className}\`)`;
    foot += ".";
  } else {
    foot += "**Verification:** failed.";
  }
  if (dry?.skipped) {
    foot += `\n**Dry-run:** skipped — ${dry.reason}`;
  } else if (dry?.ok) {
    const p = dry.performance;
    const trades = p?.num_trades ?? "—";
    const eq = p?.final_equity != null ? Number(p.final_equity).toFixed(2) : "—";
    foot += `\n**Dry-run:** OK (${dry.rounds ?? "?"}×5m windows) — trades ${trades}, final equity ${eq}`;
  } else if (dry?.error) {
    foot += `\n**Dry-run:** failed — ${dry.error.slice(0, 1200)}`;
  }
  return base ? `${base}${foot}` : foot.trim();
}
