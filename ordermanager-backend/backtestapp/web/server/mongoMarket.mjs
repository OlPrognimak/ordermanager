/**
 * Read BTC + YES/NO book from MongoDB, resampled to a fixed time grid (default 100ms).
 * Uses causal LOCF: at each grid time t, last BTC row with ts<=t and last up_down row with ts<=t
 * (same idea as Python mongo_own as-of join). Grid is limited to the time overlap of loaded slices.
 */
import { Long, MongoClient } from "mongodb";

const DEFAULT_STEP_MS = 100;
const DEFAULT_MAX_RAW = 250_000;
const ABS_MAX_RAW = 2_000_000;
/** Max resampled grid points returned in one response (env override). Default 1M; cap 2M. */
const GRID_POINTS_HARD_MAX = 2_000_000;
const GRID_POINTS_CAP = Math.min(
  Math.max(5_000, Number(process.env.MONGO_MARKET_TICKS_MAX) || 1_000_000),
  GRID_POINTS_HARD_MAX,
);

const SAFE_FIELD = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

/** @param {string} f */
function assertSafeField(f, label) {
  if (!SAFE_FIELD.test(f)) {
    throw new Error(`Invalid ${label}: use alphanumeric/._ only`);
  }
}

/**
 * Normalize Mongo timestamp values to epoch ms (Python mongo_own expects ms).
 * @param {unknown} v
 */
function coerceTsMs(v) {
  if (v == null) throw new Error("missing timestamp");
  if (typeof v === "boolean") throw new Error("timestamp must not be bool");
  if (v instanceof Date) {
    const t = v.getTime();
    if (!Number.isFinite(t)) throw new Error("invalid Date");
    return Math.trunc(t);
  }
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (typeof v === "object" && v !== null) {
    if (Long.isLong(v)) {
      const n = v.toNumber();
      if (!Number.isFinite(n)) throw new Error("invalid BSON Long timestamp");
      return Math.trunc(n);
    }
    if ("$numberLong" in v) return Number(/** @type {Record<string, string>} */ (v).$numberLong);
    if ("$numberInt" in v) return Number(/** @type {Record<string, string>} */ (v).$numberInt);
    if ("$date" in v) {
      const d = /** @type {Record<string, unknown>} */ (v).$date;
      if (typeof d === "string") return Date.parse(d);
      if (d && typeof d === "object" && "$numberLong" in /** @type {object} */ (d)) {
        return Number(/** @type {Record<string, string>} */ (d).$numberLong);
      }
    }
    if (typeof /** @type {{ toNumber?: () => number }} */ (v).toNumber === "function") {
      const n = /** @type {{ toNumber: () => number }} */ (v).toNumber();
      if (Number.isFinite(n)) return Math.trunc(n);
    }
  }
  throw new Error(`unsupported timestamp type: ${Object.prototype.toString.call(v)}`);
}

/** @param {unknown} v */
function num(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && v !== null && typeof /** @type {{ toString?: () => string }} */ (v).toString === "function") {
    const n = Number(/** @type {{ toString: () => string }} */ (v).toString());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** @param {Record<string, unknown>} r */
function pickPrice(r) {
  for (const k of ["price", "px", "last_price", "close", "btc_price", "last"]) {
    const n = num(r[k]);
    if (n != null) return n;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} ud
 * @param {"dollar_0_1" | "cents_0_100"} quoteScale
 */
function legsToCents(ud, quoteScale) {
  const fullSchemas =
    quoteScale === "cents_0_100"
      ? [
          ["up_best_bid", "up_best_ask", "down_best_bid", "down_best_ask"],
          ["upBid", "upAsk", "downBid", "downAsk"],
          ["yes_bid", "yes_ask", "no_bid", "no_ask"],
        ]
      : [
          ["up_best_bid", "up_best_ask", "down_best_bid", "down_best_ask"],
          ["upBid", "upAsk", "downBid", "downAsk"],
        ];
  const askOnlySchemas =
    quoteScale === "cents_0_100"
      ? [
          ["up_best_ask", "down_best_ask"],
          ["upAsk", "downAsk"],
          ["yes_ask", "no_ask"],
        ]
      : [
          ["up_best_ask", "down_best_ask"],
          ["upAsk", "downAsk"],
        ];

  const build = (ub, ua, db, da) => {
    const yesAsk = ua;
    const noAsk = da;
    if (quoteScale === "cents_0_100") {
      return {
        yes: Math.round(yesAsk * 100) / 100,
        no: Math.round(noAsk * 100) / 100,
        yes_bid: Math.round(ub * 100) / 100,
        yes_ask: Math.round(ua * 100) / 100,
        no_bid: Math.round(db * 100) / 100,
        no_ask: Math.round(da * 100) / 100,
      };
    }
    return {
      yes: Math.round(yesAsk * 100 * 100) / 100,
      no: Math.round(noAsk * 100 * 100) / 100,
      yes_bid: Math.round(ub * 100 * 100) / 100,
      yes_ask: Math.round(ua * 100 * 100) / 100,
      no_bid: Math.round(db * 100 * 100) / 100,
      no_ask: Math.round(da * 100 * 100) / 100,
    };
  };

  for (const [ubk, uak, dbk, dak] of fullSchemas) {
    const ub = num(ud[ubk]);
    const ua = num(ud[uak]);
    const db = num(ud[dbk]);
    const da = num(ud[dak]);
    if (ub == null || ua == null || db == null || da == null) continue;
    return build(ub, ua, db, da);
  }
  for (const [uak, dak] of askOnlySchemas) {
    const ua = num(ud[uak]);
    const da = num(ud[dak]);
    if (ua == null || da == null) continue;
    return build(ua, ua, da, da);
  }
  return null;
}

/**
 * @param {unknown[]} rows
 * @param {(r: Record<string, unknown>) => { ts: number; raw: Record<string, unknown> } | null} mapRow
 */
function toSortedSeries(rows, mapRow) {
  /** @type {Array<{ ts: number; raw: Record<string, unknown> }>} */
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const m = mapRow(/** @type {Record<string, unknown>} */ (r));
    if (m) out.push(m);
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/** @param {Record<string, unknown> | undefined} doc */
function sampleKeys(doc) {
  if (!doc || typeof doc !== "object") return [];
  return Object.keys(doc)
    .filter((k) => !k.startsWith("_"))
    .slice(0, 24);
}

/**
 * @param {{
 *   uri: string;
 *   ownDb?: string;
 *   btcCollection?: string;
 *   upDownCollection?: string;
 *   startMs?: number | null;
 *   endMs?: number | null;
 *   limit?: number;
 *   quoteScale?: "dollar_0_1" | "cents_0_100";
 *   stepMs?: number;
 *   maxRawPerCollection?: number;
 *   btcTsField?: string;
 *   udTsField?: string;
 *   preferRecent?: boolean;
 * }} opts
 */
export async function fetchMergedMarketTicks(opts) {
  const {
    uri,
    ownDb = process.env.MONGO_OWN_DB || "own",
    btcCollection = process.env.MONGO_BTC_COLLECTION || "poly_btc",
    upDownCollection = process.env.MONGO_UP_DOWN_COLLECTION || "up_down",
    startMs = null,
    endMs = null,
    limit = 5000,
    quoteScale = "dollar_0_1",
    stepMs = DEFAULT_STEP_MS,
    maxRawPerCollection = DEFAULT_MAX_RAW,
    btcTsField = "ts_ms",
    udTsField = "ts_ms",
    preferRecent = false,
  } = opts;

  assertSafeField(btcTsField, "btc_ts_field");
  assertSafeField(udTsField, "ud_ts_field");

  const stepTrunc = Math.trunc(stepMs);
  const EVENT_MODE = stepTrunc === 0;
  const STEP = EVENT_MODE ? 0 : stepTrunc;
  if (!EVENT_MODE && (!Number.isFinite(STEP) || STEP < 1 || STEP > 300_000)) {
    throw new Error("step_ms must be 0 (event timestamps) or between 1 and 300000");
  }

  const maxOut = Math.min(Math.max(1, Number(limit) || 5000), GRID_POINTS_CAP);
  const maxRaw = Math.min(Math.max(1000, Number(maxRawPerCollection) || DEFAULT_MAX_RAW), ABS_MAX_RAW);

  const hasWindow = startMs != null || endMs != null;
  const fltBtc = /** @type {Record<string, unknown>} */ ({});
  const fltUd = /** @type {Record<string, unknown>} */ ({});
  if (hasWindow) {
    const bounds = /** @type {Record<string, number>} */ ({});
    if (startMs != null) bounds.$gte = startMs;
    if (endMs != null) bounds.$lte = endMs;
    fltBtc[btcTsField] = bounds;
    fltUd[udTsField] = bounds;
  }

  const sortDir = !hasWindow && preferRecent ? -1 : 1;
  const btcSort = /** @type {Record<string, 1 | -1>} */ ({ [btcTsField]: sortDir });
  const udSort = /** @type {Record<string, 1 | -1>} */ ({ [udTsField]: sortDir });

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const own = client.db(ownDb);
    const btcCur = own.collection(btcCollection).find(fltBtc).sort(btcSort).limit(maxRaw);
    const udCur = own.collection(upDownCollection).find(fltUd).sort(udSort).limit(maxRaw);

    const btcRows = await btcCur.toArray();
    const udRows = await udCur.toArray();

    if (!hasWindow && preferRecent) {
      btcRows.reverse();
      udRows.reverse();
    }

    const rawTruncBtc = btcRows.length >= maxRaw;
    const rawTruncUd = udRows.length >= maxRaw;

    let coerceFailBtc = 0;
    let coerceFailUd = 0;

    const btcSeries = toSortedSeries(btcRows, (r) => {
      try {
        const ts = coerceTsMs(r[btcTsField]);
        return { ts, raw: r };
      } catch {
        coerceFailBtc += 1;
        return null;
      }
    });

    const udSeries = toSortedSeries(udRows, (r) => {
      try {
        const ts = coerceTsMs(r[udTsField]);
        return { ts, raw: r };
      } catch {
        coerceFailUd += 1;
        return null;
      }
    });

    /** @type {Record<string, unknown>} */
    const diagnostics = {
      db: ownDb,
      btc_collection: btcCollection,
      up_down_collection: upDownCollection,
      btc_ts_field: btcTsField,
      ud_ts_field: udTsField,
      raw_btc_docs: btcRows.length,
      raw_ud_docs: udRows.length,
      parsed_btc_points: btcSeries.length,
      parsed_ud_points: udSeries.length,
      coerce_failed_btc: coerceFailBtc,
      coerce_failed_ud: coerceFailUd,
      prefer_recent: !hasWindow && preferRecent,
      time_filter: hasWindow ? { start_ms: startMs, end_ms: endMs } : null,
      sample_btc_keys: sampleKeys(btcRows[0]),
      sample_ud_keys: sampleKeys(udRows[0]),
    };

    if (!udSeries.length) {
      diagnostics.hint =
        !udRows.length
          ? "No up_down documents matched the query (wrong collection, empty collection, or time filter excludes all data)."
          : coerceFailUd === udRows.length
            ? "up_down documents exist but timestamps could not be read — check ud_ts_field (default ts_ms)."
            : "up_down parsed to zero points after timestamp coercion.";
      return {
        ticks: [],
        truncated: false,
        limitUsed: maxOut,
        resample_step_ms: STEP,
        grid_points_emitted: 0,
        grid_points_total: 0,
        raw_truncated_btc: rawTruncBtc,
        raw_truncated_ud: rawTruncUd,
        diagnostics,
      };
    }

    const udLo = udSeries[0].ts;
    const udHi = udSeries[udSeries.length - 1].ts;
    /** When poly_btc has no rows in this window, still emit YES/NO from up_down (synthetic BTC price 0). */
    const udOnly = btcSeries.length === 0;
    if (udOnly) {
      diagnostics.btc_missing_in_window = true;
      diagnostics.hint =
        "No poly_btc rows in this time window — preview uses up_down only with placeholder BTC price 0 (chart BTC line is optional). Fix btc_ts_field / collection or widen the window if you need real spot.";
    }

    const btcLo = udOnly ? udLo : btcSeries[0].ts;
    const btcHi = udOnly ? udHi : btcSeries[btcSeries.length - 1].ts;
    /** Causal merge only where both streams have started (no lookahead). */
    let overlapLo = Math.max(btcLo, udLo);
    let overlapHi = Math.min(btcHi, udHi);
    if (startMs != null) overlapLo = Math.max(overlapLo, startMs);
    if (endMs != null) overlapHi = Math.min(overlapHi, endMs);
    diagnostics.overlap_ms = { lo: overlapLo, hi: overlapHi, btc_range: [btcLo, btcHi], ud_range: [udLo, udHi] };

    if (overlapLo > overlapHi) {
      diagnostics.hint =
        "Loaded BTC and up_down ranges do not overlap in time (or your start/end excludes overlap). Try a wider window, increase max_raw, or check collection clocks.";
      diagnostics.overlap_t_min = overlapLo;
      diagnostics.overlap_t_max = overlapHi;
      return {
        ticks: [],
        truncated: false,
        limitUsed: maxOut,
        resample_step_ms: STEP,
        grid_points_emitted: 0,
        grid_points_total: 0,
        raw_truncated_btc: rawTruncBtc,
        raw_truncated_ud: rawTruncUd,
        diagnostics,
      };
    }

    diagnostics.data_t_min = overlapLo;
    diagnostics.data_t_max = overlapHi;

    /** `step_ms === 0`: emit one row per distinct BTC or up_down timestamp in the overlap (LOCF merge), no fixed grid. */
    if (EVENT_MODE) {
      /** @type {Set<number>} */
      const timeSet = new Set();
      if (!udOnly) {
        for (const p of btcSeries) {
          if (p.ts >= overlapLo && p.ts <= overlapHi) timeSet.add(p.ts);
        }
      }
      for (const p of udSeries) {
        if (p.ts >= overlapLo && p.ts <= overlapHi) timeSet.add(p.ts);
      }
      const allTimes = [...timeSet].sort((a, b) => a - b);
      const totalEventSlots = allTimes.length;
      diagnostics.merge_mode = udOnly ? "event_timestamps_ud_only_synthetic_btc" : "event_timestamps_union";
      diagnostics.event_timestamps_total = totalEventSlots;

      if (totalEventSlots <= 0) {
        diagnostics.hint =
          "No event timestamps in overlap (empty BTC+up_down in range, or bounds exclude all rows).";
        return {
          ticks: [],
          truncated: false,
          limitUsed: maxOut,
          resample_step_ms: 0,
          grid_points_emitted: 0,
          grid_points_total: 0,
          raw_truncated_btc: rawTruncBtc,
          raw_truncated_ud: rawTruncUd,
          diagnostics,
        };
      }

      const truncatedEv = totalEventSlots > maxOut;
      const timesToEmit = truncatedEv ? allTimes.slice(0, maxOut) : allTimes;

      const evTicks = [];
      let skippedPrice = 0;
      let skippedBook = 0;
      let bi = 0;
      let ui = 0;

      for (const t of timesToEmit) {
        if (!udOnly) {
          while (bi + 1 < btcSeries.length && btcSeries[bi + 1].ts <= t) bi += 1;
        }
        while (ui + 1 < udSeries.length && udSeries[ui + 1].ts <= t) ui += 1;
        if (udSeries[ui].ts > t) continue;
        if (!udOnly && btcSeries[bi].ts > t) continue;
        const udR = udSeries[ui].raw;
        const px = udOnly ? 0 : pickPrice(btcSeries[bi].raw);
        if (!udOnly && px == null) {
          skippedPrice += 1;
          continue;
        }
        const book = legsToCents(udR, quoteScale);
        if (!book) {
          skippedBook += 1;
          continue;
        }
        evTicks.push({
          timestamp_ms: t,
          equity: 0,
          cash: 0,
          unrealized_pnl: 0,
          price: Math.round(px * 100) / 100,
          yes: book.yes,
          no: book.no,
          yes_bid: book.yes_bid,
          yes_ask: book.yes_ask,
          no_bid: book.no_bid,
          no_ask: book.no_ask,
        });
      }

      diagnostics.skipped_missing_price = skippedPrice;
      diagnostics.skipped_missing_book = skippedBook;
      if (evTicks.length === 0 && timesToEmit.length > 0) {
        diagnostics.hint =
          "Event merge skipped every timestamp: need BTC price fields and up_down quotes on the as-of rows.";
      }

      return {
        ticks: evTicks,
        truncated: truncatedEv,
        limitUsed: maxOut,
        resample_step_ms: 0,
        grid_points_emitted: evTicks.length,
        grid_points_total: totalEventSlots,
        raw_truncated_btc: rawTruncBtc,
        raw_truncated_ud: rawTruncUd,
        diagnostics,
      };
    }

    const gridStart = Math.ceil(overlapLo / STEP) * STEP;
    const gridEndAligned = Math.floor(overlapHi / STEP) * STEP;
    const totalSlots =
      gridStart <= gridEndAligned ? Math.floor((gridEndAligned - gridStart) / STEP) + 1 : 0;

    diagnostics.grid_start_ms = gridStart;
    diagnostics.grid_end_ms = gridEndAligned;
    diagnostics.merge_mode = udOnly ? "up_down_only_synthetic_btc" : "locf_ts_lte";

    if (totalSlots <= 0) {
      diagnostics.hint =
        "Overlap range too short for one grid step, or misaligned bounds. Check overlap_ms in diagnostics.";
      return {
        ticks: [],
        truncated: false,
        limitUsed: maxOut,
        resample_step_ms: STEP,
        grid_points_emitted: 0,
        grid_points_total: 0,
        raw_truncated_btc: rawTruncBtc,
        raw_truncated_ud: rawTruncUd,
        diagnostics,
      };
    }

    const truncated = totalSlots > maxOut;
    const emitCount = truncated ? maxOut : totalSlots;

    /** @type {Array<{ timestamp_ms: number; equity: number; cash: number; unrealized_pnl: number; price: number; yes: number; no: number; yes_bid: number; yes_ask: number; no_bid: number; no_ask: number }>} */
    const ticks = [];

    let skippedPrice = 0;
    let skippedBook = 0;

    let bi = 0;
    let ui = 0;

    for (let k = 0; k < emitCount; k++) {
      const t = gridStart + k * STEP;
      if (!udOnly) {
        while (bi + 1 < btcSeries.length && btcSeries[bi + 1].ts <= t) bi += 1;
      }
      while (ui + 1 < udSeries.length && udSeries[ui + 1].ts <= t) ui += 1;
      if (udSeries[ui].ts > t) continue;
      if (!udOnly && btcSeries[bi].ts > t) continue;
      const udR = udSeries[ui].raw;

      const px = udOnly ? 0 : pickPrice(btcSeries[bi].raw);
      if (!udOnly && px == null) {
        skippedPrice += 1;
        continue;
      }

      const book = legsToCents(udR, quoteScale);
      if (!book) {
        skippedBook += 1;
        continue;
      }

      ticks.push({
        timestamp_ms: t,
        equity: 0,
        cash: 0,
        unrealized_pnl: 0,
        price: Math.round(px * 100) / 100,
        yes: book.yes,
        no: book.no,
        yes_bid: book.yes_bid,
        yes_ask: book.yes_ask,
        no_bid: book.no_bid,
        no_ask: book.no_ask,
      });
    }

    diagnostics.skipped_missing_price = skippedPrice;
    diagnostics.skipped_missing_book = skippedBook;
    if (ticks.length === 0 && emitCount > 0) {
      diagnostics.hint =
        "Grid was built but every point was skipped: BTC rows need a numeric price (price, px, close, …) and up_down rows need quotes (full bid+ask or ask-only: e.g. up_best_ask + down_best_ask).";
    }

    return {
      ticks,
      truncated,
      limitUsed: maxOut,
      resample_step_ms: STEP,
      grid_points_emitted: ticks.length,
      grid_points_total: totalSlots,
      raw_truncated_btc: rawTruncBtc,
      raw_truncated_ud: rawTruncUd,
      diagnostics,
    };
  } finally {
    await client.close();
  }
}

/**
 * Return the earliest and latest timestamp (ms since epoch) from the up_down collection.
 *
 * This is used by the GUI to seed default start/end times so they are guaranteed to fall
 * inside the MongoDB YES/NO (up/down) data range, in UTC.
 *
 * @param {{
 *   uri: string;
 *   ownDb?: string;
 *   upDownCollection?: string;
 *   udTsField?: string;
 * }} opts
 */
export async function fetchUpDownTimeRange(opts) {
  const {
    uri,
    ownDb = process.env.MONGO_OWN_DB || "own",
    upDownCollection = process.env.MONGO_UP_DOWN_COLLECTION || "up_down",
    udTsField = "ts_ms",
  } = opts;

  assertSafeField(udTsField, "ud_ts_field");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const coll = client.db(ownDb).collection(upDownCollection);
    const proj = /** @type {Record<string, 0 | 1>} */ ({ [udTsField]: 1, _id: 0 });

    const [first] = await coll
      .find({}, { sort: /** @type {Record<string, 1 | -1>} */ ({ [udTsField]: 1 }), limit: 1, projection: proj })
      .toArray();
    const [last] = await coll
      .find({}, { sort: /** @type {Record<string, 1 | -1>} */ ({ [udTsField]: -1 }), limit: 1, projection: proj })
      .toArray();

    if (!first || !last) {
      return {
        hasData: false,
        t_min_ms: null,
        t_max_ms: null,
      };
    }

    const tMin = coerceTsMs(first[udTsField]);
    const tMax = coerceTsMs(last[udTsField]);

    return {
      hasData: true,
      t_min_ms: tMin,
      t_max_ms: tMax,
    };
  } finally {
    await client.close();
  }
}
