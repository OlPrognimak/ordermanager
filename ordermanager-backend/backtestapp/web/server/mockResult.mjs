/**
 * Builds a result payload aligned with pmbacktest `export_result` summary + arrays.
 */

/**
 * @typedef {object} JobRecord
 * @property {string} id
 * @property {'queued'|'running'|'completed'|'failed'} status
 * @property {number} progress
 * @property {string[]} logs
 * @property {object} config
 * @property {number} createdAt
 * @property {object | null} result
 * @property {string | null} error
 */

/** Minimum synthetic span so UTC 5m round cards are meaningful (mock API only). */
const MIN_MOCK_SPAN_MS = 25 * 60 * 1000;
/** Default span when the user does not set a replay window (multiple 5m buckets). */
const DEFAULT_MOCK_SPAN_MS = 2 * 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

/** Floor epoch ms to UTC hh:mm:00 with minute % 5 === 0 (same as dashboard / Python round_clock). */
function floorUtcFiveMinuteMs(tsMs) {
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

/** Same as dashboard / Python: winning_rounds / total_rounds (UTC 5m slots). */
function winRateFromUtc5mRounds(trades, equity) {
  let t0 = Infinity;
  let t1 = -Infinity;
  for (const p of equity) {
    t0 = Math.min(t0, p.timestamp_ms);
    t1 = Math.max(t1, p.timestamp_ms);
  }
  for (const tr of trades) {
    t0 = Math.min(t0, tr.opened_ts_ms, tr.closed_ts_ms);
    t1 = Math.max(t1, tr.opened_ts_ms, tr.closed_ts_ms);
  }
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return 0;
  let start = floorUtcFiveMinuteMs(t0);
  const lastStart = floorUtcFiveMinuteMs(t1);
  let winning = 0;
  let total = 0;
  for (let ws = start; ws <= lastStart; ws += FIVE_MIN_MS) {
    const we = ws + FIVE_MIN_MS;
    const pnl = trades
      .filter((t) => t.closed_ts_ms >= ws && t.closed_ts_ms < we)
      .reduce((s, t) => s + t.realized_pnl, 0);
    if (pnl > 0) winning += 1;
    total += 1;
  }
  return total ? winning / total : 0;
}

/** Snap span up to a whole number of UTC 5-minute markets. */
function ceilToFiveMinuteMultipleMs(spanMs) {
  if (spanMs <= 0) return FIVE_MIN_MS;
  return Math.ceil(spanMs / FIVE_MIN_MS) * FIVE_MIN_MS;
}

function toEpochMs(v) {
  if (v == null || v === "") return NaN;
  const x = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(x) ? x : NaN;
}

export function clampSimulationSpeed(raw) {
  const x = Number(raw);
  if (!Number.isFinite(x) || x < 0.25) return 1;
  return Math.min(x, 20);
}

/**
 * Spread `n` samples across [startMs, startMs + spanMs] so dashboard round bucketing matches the
 * configured hours. Previously we used start + i*granularity (often under one minute total, so one round).
 */
function resolveMockTimeSpan(config, n, granularity) {
  const t0 = toEpochMs(config.timeStartMs ?? config.time_start_ms);
  const t1 = toEpochMs(config.timeEndMs ?? config.time_end_ms);
  const tickSpan = n * granularity;

  let startMs;
  let spanMs;

  if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
    startMs = floorUtcFiveMinuteMs(t0);
    const endAligned = floorUtcFiveMinuteMs(t1);
    spanMs = Math.max(FIVE_MIN_MS, endAligned - startMs);
    spanMs = ceilToFiveMinuteMultipleMs(spanMs);
  } else if (Number.isFinite(t0)) {
    startMs = floorUtcFiveMinuteMs(t0);
    spanMs = ceilToFiveMinuteMultipleMs(Math.max(tickSpan, MIN_MOCK_SPAN_MS, DEFAULT_MOCK_SPAN_MS));
  } else if (Number.isFinite(t1)) {
    spanMs = ceilToFiveMinuteMultipleMs(Math.max(tickSpan, MIN_MOCK_SPAN_MS, DEFAULT_MOCK_SPAN_MS));
    startMs = floorUtcFiveMinuteMs(t1) - spanMs;
  } else {
    spanMs = ceilToFiveMinuteMultipleMs(Math.max(tickSpan, MIN_MOCK_SPAN_MS, DEFAULT_MOCK_SPAN_MS));
    startMs = floorUtcFiveMinuteMs(Date.now()) - spanMs;
  }

  spanMs = Math.max(spanMs, n - 1);
  spanMs = ceilToFiveMinuteMultipleMs(spanMs);
  return { startMs, spanMs };
}

/** Strictly increasing timestamps covering at least [startMs, endMs] (end may extend by a few ms if needed). */
function mockEquityTimestamps(startMs, spanMs, n) {
  const endMs = startMs + spanMs;
  if (n <= 1) return [startMs];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(startMs + Math.floor((i * spanMs) / (n - 1)));
  }
  out[0] = startMs;
  out[n - 1] = endMs;
  for (let i = 1; i < n; i++) {
    if (out[i] <= out[i - 1]) out[i] = out[i - 1] + 1;
  }
  out[n - 1] = Math.max(endMs, out[n - 2] + 1);
  return out;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pseudoNormal(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x) - 0.5;
}

function buildTrades(equity, strategy, seed, feeRate) {
  const trades = [];
  const step = Math.max(3, Math.floor(equity.length / 25));
  let k = 0;
  for (let i = 0; i + step < equity.length; i += step) {
    const open = equity[i];
    const close = equity[i + step];
    const side = pseudoNormal(seed + k++) > 0 ? "yes" : "no";
    const qty = 1 + (k % 3);
    const entryC = side === "yes" ? open.yes : open.no;
    const exitC = side === "yes" ? close.yes : close.no;
    const entry = Math.max(0.01, Math.min(0.99, entryC / 100));
    const exit = Math.max(0.01, Math.min(0.99, exitC / 100));
    const gross = (exit - entry) * qty * (strategy === "mean_reversion" ? -80 : 100);
    const fee = gross > 0 ? gross * Math.max(0, Math.min(1, feeRate)) : 0;
    const pnl = gross <= 0 ? gross : gross - fee;
    trades.push({
      trade_id: `t-${k}`,
      side,
      opened_ts_ms: open.timestamp_ms,
      closed_ts_ms: close.timestamp_ms,
      quantity: qty,
      entry_price: entry,
      exit_price: exit,
      fees_paid: fee,
      realized_pnl: pnl,
    });
  }
  return trades;
}

/**
 * Full synthetic run: equity path + BTC spot + YES/NO cents (0–100) per tick + trades.
 * Used for final JSON and for live replay slicing in the dev API.
 */
export function buildMockSeries(config, jobId) {
  const initial = Number(config.initialCash ?? config.initial_cash ?? 10_000);
  const strategy = config.strategy ?? "momentum";
  const n = Math.min(5000, Math.max(80, Number(config.mockPoints ?? 400)));
  const seed = hashString(jobId + strategy);
  const granularity = Number(config.dataGranularityMs ?? 100);
  const { startMs, spanMs } = resolveMockTimeSpan(config, n, granularity);
  const tsList = mockEquityTimestamps(startMs, spanMs, n);

  let eq = initial;
  let peak = eq;
  let maxDd = 0;
  let maxDdPct = 0;
  let basePx = 95_000 + pseudoNormal(seed + 99_999) * 400;

  const equity = [];
  for (let i = 0; i < n; i++) {
    const drift = pseudoNormal(seed + i) * (12 + (strategy === "momentum" ? 8 : 0));
    eq += drift;
    peak = Math.max(peak, eq);
    const dd = peak - eq;
    maxDd = Math.max(maxDd, dd);
    if (peak > 0) maxDdPct = Math.max(maxDdPct, dd / peak);

    basePx += pseudoNormal(seed + 50_000 + i) * 14;
    const walkY = pseudoNormal(seed + 60_000 + i) * 5;
    let yes =
      i === 0
        ? 50
        : 50 + walkY + pseudoNormal(seed + 70_000 + i) * 10;
    let no =
      i === 0
        ? 50
        : 100 - yes + pseudoNormal(seed + 80_000 + i) * 6;
    yes = Math.max(2, Math.min(98, yes));
    no = Math.max(2, Math.min(98, no));

    const sprY = 0.55 + Math.abs(pseudoNormal(seed + 90_000 + i)) * 1.35;
    const sprN = 0.55 + Math.abs(pseudoNormal(seed + 91_000 + i)) * 1.35;
    const yh = sprY / 2;
    const nh = sprN / 2;
    const yes_bid = Math.max(1, Math.min(99, Math.round((yes - yh) * 100) / 100));
    const yes_ask = Math.max(1, Math.min(99, Math.round((yes + yh) * 100) / 100));
    const no_bid = Math.max(1, Math.min(99, Math.round((no - nh) * 100) / 100));
    const no_ask = Math.max(1, Math.min(99, Math.round((no + nh) * 100) / 100));

    equity.push({
      timestamp_ms: tsList[i],
      equity: eq,
      cash: eq * 0.3,
      unrealized_pnl: eq * 0.7,
      price: Math.round(basePx * 100) / 100,
      yes: Math.round(yes * 100) / 100,
      no: Math.round(no * 100) / 100,
      yes_bid,
      yes_ask,
      no_bid,
      no_ask,
    });
  }

  const feeRate = Number(config?.execution?.fee_rate ?? config?.execution?.feeRate ?? 0);
  const trades = buildTrades(equity, strategy, seed, Number.isFinite(feeRate) ? feeRate : 0);
  return {
    equity,
    trades,
    initial,
    strategy,
    n,
    seed,
    spanMs,
    granularity,
    maxDd,
    maxDdPct,
    finalEq: eq,
  };
}

export function assembleMockResult(jobId, config, series) {
  const {
    equity,
    trades,
    initial,
    strategy,
    n,
    seed,
    spanMs,
    granularity,
    maxDd,
    maxDdPct,
    finalEq,
  } = series;

  const wins = trades.filter((t) => t.realized_pnl > 0);
  const losses = trades.filter((t) => t.realized_pnl <= 0);
  const realized = trades.reduce((s, t) => s + t.realized_pnl, 0);
  const grossWin = wins.reduce((s, t) => s + t.realized_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realized_pnl, 0));
  const profitFactor =
    grossLoss > 1e-9 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const totalPnl = finalEq - initial;
  const roi = initial > 0 ? totalPnl / initial : 0;

  return {
    run_id: jobId.replace(/-/g, "").slice(0, 24),
    meta: {
      run_id: jobId.replace(/-/g, "").slice(0, 24),
      strategy_name: strategy,
      strategy_params: config.strategyParams ?? config.strategy_params ?? {},
      data_source: config.datasetLabel ?? config.data_source_label ?? "mock-stream",
      started_ts_ms: equity[0]?.timestamp_ms ?? null,
      ended_ts_ms: equity.at(-1)?.timestamp_ms ?? null,
      tick_count: n,
      seed: config.seed ?? null,
      notes: "",
    },
    performance: {
      run_id: jobId.replace(/-/g, "").slice(0, 24),
      total_pnl: totalPnl,
      roi,
      realized_pnl_from_ledger: realized,
      win_rate: winRateFromUtc5mRounds(trades, equity),
      num_trades: trades.length,
      num_winners: wins.length,
      num_losers: losses.length,
      avg_trade_return: trades.length ? realized / trades.length : 0,
      avg_winner: wins.length ? grossWin / wins.length : 0,
      avg_loser: losses.length ? -grossLoss / losses.length : 0,
      profit_factor: profitFactor === Infinity ? "inf" : profitFactor,
      max_drawdown_abs: maxDd,
      max_drawdown_pct: maxDdPct,
      exposure_time_ms: Math.floor(n * granularity * 0.35),
      avg_trade_duration_ms: trades.length
        ? trades.reduce((s, t) => s + (t.closed_ts_ms - t.opened_ts_ms), 0) / trades.length
        : 0,
      final_equity: finalEq,
      initial_cash: initial,
      strategy_stats: {
        mock: true,
        data_granularity_ms: granularity,
        stop_loss_pct: config.stopLossPct ?? null,
        take_profit_pct: config.takeProfitPct ?? null,
        settle_round_boundaries: config.settleRoundBoundaries !== false,
        mock_effective_span_ms: spanMs,
        simulation_speed: clampSimulationSpeed(config.simulationSpeed ?? config.simulation_speed ?? 1),
      },
    },
    parameter_set: config.strategyParams ?? config.strategy_params ?? {},
    trades,
    equity,
  };
}

export function buildMockResult(config, jobId) {
  return assembleMockResult(jobId, config, buildMockSeries(config, jobId));
}

function nearestTick(equity, tsMs) {
  if (!equity.length) return null;
  let lo = 0;
  let hi = equity.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (equity[mid].timestamp_ms < tsMs) lo = mid + 1;
    else hi = mid;
  }
  let best = lo;
  if (lo > 0) {
    const dPrev = Math.abs(equity[lo - 1].timestamp_ms - tsMs);
    const dHere = Math.abs(equity[lo].timestamp_ms - tsMs);
    if (dPrev <= dHere) best = lo - 1;
  }
  return equity[best];
}

/**
 * Buy / exit markers for chart (YES/NO legs in cent space).
 */
function quoteCentsForMarker(tk, kind) {
  switch (kind) {
    case "buy_yes":
      return tk.yes_ask ?? tk.yes;
    case "exit_yes":
      return tk.yes_bid ?? tk.yes;
    case "buy_no":
      return tk.no_ask ?? tk.no;
    case "exit_no":
      return tk.no_bid ?? tk.no;
    default:
      return tk.yes;
  }
}

export function buildReplayMarkers(trades, equity, lastTsMs) {
  const out = [];
  for (const t of trades) {
    if (t.opened_ts_ms <= lastTsMs) {
      const kind = t.side === "yes" ? "buy_yes" : "buy_no";
      const fromLedger =
        typeof t.entry_price === "number" && Number.isFinite(t.entry_price)
          ? t.entry_price * 100
          : null;
      const tk = nearestTick(equity, t.opened_ts_ms);
      const quote_cents = fromLedger ?? (tk ? quoteCentsForMarker(tk, kind) : null);
      if (quote_cents != null && Number.isFinite(quote_cents)) {
        out.push({
          timestamp_ms: t.opened_ts_ms,
          kind,
          quantity: t.quantity,
          usd_amount: t.quantity * t.entry_price,
          quote_cents,
        });
      }
    }
    if (t.closed_ts_ms <= lastTsMs) {
      const kind = t.side === "yes" ? "exit_yes" : "exit_no";
      const fromLedger =
        typeof t.exit_price === "number" && Number.isFinite(t.exit_price)
          ? t.exit_price * 100
          : null;
      const tk = nearestTick(equity, t.closed_ts_ms);
      const quote_cents = fromLedger ?? (tk ? quoteCentsForMarker(tk, kind) : null);
      if (quote_cents != null && Number.isFinite(quote_cents)) {
        out.push({
          timestamp_ms: t.closed_ts_ms,
          kind,
          quantity: t.quantity,
          usd_amount: t.quantity * t.entry_price,
          quote_cents,
        });
      }
    }
  }
  return out;
}

/** Cap points sent over polling JSON. */
export function downsampleTicks(ticks, maxPoints) {
  if (ticks.length <= maxPoints) return ticks;
  const out = [];
  const last = ticks.length - 1;
  for (let j = 0; j < maxPoints; j++) {
    const idx = Math.round((j * last) / (maxPoints - 1));
    out.push(ticks[idx]);
  }
  return out;
}
