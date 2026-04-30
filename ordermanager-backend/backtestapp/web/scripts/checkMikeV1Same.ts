#!/usr/bin/env -S npx tsx

import fs from "node:fs";
import path from "node:path";

import { filterAlternatingAskSwingCents } from "../src/utils/alternatingAskExtremaFilter";
import { discreteTangentExtremaIndices } from "../src/utils/discreteTangentExtrema";
import { applyNoiseFilter } from "../src/utils/noiseFilters";

type AnyObj = Record<string, unknown>;

type EventRow = {
  ts_ms: number;
  side: "yes" | "no";
  kind: "valley" | "peak";
};

const WINDOW_MS = 5 * 60 * 1000;

function fnum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseArgs(argv: string[]): { jsonPath: string; roundStartMs: number | null; rounds: number } {
  if (argv.length < 3) {
    throw new Error(
      "Usage: npm run check:mike-v1-same -- <result.json> [--round-start-ms <ms>] [--rounds <n>]",
    );
  }
  const out = { jsonPath: argv[2]!, roundStartMs: null as number | null, rounds: 1 };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--round-start-ms") {
      const v = Number(argv[++i] ?? "");
      if (!Number.isFinite(v)) throw new Error("--round-start-ms requires a finite number");
      out.roundStartMs = Math.trunc(v);
      continue;
    }
    if (a === "--rounds") {
      const v = Number(argv[++i] ?? "");
      if (!Number.isFinite(v) || v < 1) throw new Error("--rounds requires integer >= 1");
      out.rounds = Math.trunc(v);
      continue;
    }
    throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function pnum(params: AnyObj, keys: string[], fallback: number): number {
  for (const k of keys) {
    const v = fnum(params[k]);
    if (v != null) return v;
  }
  return fallback;
}

function pstr(params: AnyObj, keys: string[], fallback: string): string {
  for (const k of keys) {
    const v = params[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return fallback;
}

function extractSavedEvents(rows: unknown[]): EventRow[] {
  const out: EventRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as AnyObj;
    if (r.phase !== "accepted_extrema") continue;
    const side = r.side;
    const kind = r.kind;
    if ((side !== "yes" && side !== "no") || (kind !== "valley" && kind !== "peak")) continue;
    const ts = fnum(r.emitted_ts_ms) ?? fnum(r.ts_ms);
    if (ts == null) continue;
    out.push({ ts_ms: Math.trunc(ts), side, kind });
  }
  out.sort((a, b) => a.ts_ms - b.ts_ms || a.side.localeCompare(b.side) || a.kind.localeCompare(b.kind));
  return out;
}

function roundStart(tsMs: number): number {
  return tsMs - (tsMs % WINDOW_MS);
}

function byWindow(events: EventRow[], startMs: number | null, rounds: number): EventRow[] {
  if (startMs == null) return events;
  const endMs = startMs + rounds * WINDOW_MS;
  return events.filter((x) => x.ts_ms >= startMs && x.ts_ms < endMs);
}

function sideEventsForRound(
  points: AnyObj[],
  side: "yes" | "no",
  params: AnyObj,
): EventRow[] {
  const askKey = side === "yes" ? "yes_ask" : "no_ask";
  const bidKey = side === "yes" ? "yes_bid" : "no_bid";
  const midKey = side;

  const times: number[] = [];
  const askRaw: Array<number | null> = [];
  const bidRaw: Array<number | null> = [];
  for (const p of points) {
    const ts = fnum(p.timestamp_ms);
    if (ts == null) continue;
    const ask = fnum(p[askKey]) ?? fnum(p[midKey]);
    const bid = fnum(p[bidKey]) ?? ask;
    if (ask == null || bid == null) continue;
    times.push(Math.trunc(ts));
    askRaw.push(ask);
    bidRaw.push(bid);
  }
  if (times.length === 0) return [];

  const span = Math.trunc(pnum(params, ["span"], 20));
  const noiseFilter = pstr(params, ["noise_filter", "noiseFilter"], "gaussian") as
    | Parameters<typeof applyNoiseFilter>[2]
    | string;
  const quoteHyst = pnum(
    params,
    ["quote_structural_hysteresis_cents", "quoteStructuralHysteresisCents"],
    0.1,
  );
  const sustainedMs = Math.trunc(pnum(params, ["sustained_tangent_ms", "sustainedTangentMs"], 1000));
  const valleyAskMax = pnum(params, ["valley_max_raw_ask_cents", "valleyMaxRawAskCents"], 45);
  const v2pMin = pnum(
    params,
    ["valley_to_peak_raw_spread_min_cents", "valleyToPeakRawSpreadMinCents"],
    10,
  );
  const locationMode = pstr(params, ["extrema_location_mode", "extremaLocationMode"], "spread_anchored")
    .trim()
    .toLowerCase();

  const smooth = applyNoiseFilter(askRaw, span, noiseFilter as Parameters<typeof applyNoiseFilter>[2]);
  const raw = discreteTangentExtremaIndices(smooth, times, {
    structuralHysteresis: quoteHyst,
    sustainedTangentMs: sustainedMs,
    cooldownMs: 1000,
    goldenPeakFallbackWindowMs: 30_000,
    maxValleyAskExclusive: valleyAskMax,
    valleyAskSeries: askRaw,
    peakBidSeries: bidRaw,
    anchorToQuoteSeries: locationMode === "spread_anchored",
  });
  const accepted = filterAlternatingAskSwingCents(
    raw.peaks,
    raw.valleys,
    askRaw,
    bidRaw,
    v2pMin,
    0,
    times,
    1000,
  );
  const evs: EventRow[] = [];
  for (const i of accepted.valleys) evs.push({ ts_ms: times[i]!, side, kind: "valley" });
  for (const i of accepted.peaks) evs.push({ ts_ms: times[i]!, side, kind: "peak" });
  evs.sort((a, b) => a.ts_ms - b.ts_ms || a.side.localeCompare(b.side) || a.kind.localeCompare(b.kind));
  return evs;
}

function recomputeTsEvents(result: AnyObj): EventRow[] {
  const meta = (result.meta as AnyObj | undefined) ?? {};
  const params = (meta.strategy_params as AnyObj | undefined) ?? {};
  const equityRaw = result.equity;
  if (!Array.isArray(equityRaw)) throw new Error("Result JSON has no `equity` array");
  const points = equityRaw.filter((x): x is AnyObj => !!x && typeof x === "object");
  points.sort((a, b) => (fnum(a.timestamp_ms) ?? -1) - (fnum(b.timestamp_ms) ?? -1));

  const rounds = new Map<number, AnyObj[]>();
  for (const p of points) {
    const ts = fnum(p.timestamp_ms);
    if (ts == null) continue;
    const rs = roundStart(Math.trunc(ts));
    const arr = rounds.get(rs) ?? [];
    arr.push(p);
    rounds.set(rs, arr);
  }

  const all: EventRow[] = [];
  for (const [, roundPts] of [...rounds.entries()].sort((a, b) => a[0] - b[0])) {
    all.push(...sideEventsForRound(roundPts, "yes", params));
    all.push(...sideEventsForRound(roundPts, "no", params));
  }
  all.sort((a, b) => a.ts_ms - b.ts_ms || a.side.localeCompare(b.side) || a.kind.localeCompare(b.kind));
  return all;
}

function compare(saved: EventRow[], recomputed: EventRow[]): number {
  const n = Math.min(saved.length, recomputed.length);
  for (let i = 0; i < n; i++) {
    const a = saved[i]!;
    const b = recomputed[i]!;
    if (a.ts_ms !== b.ts_ms || a.side !== b.side || a.kind !== b.kind) {
      console.log("Mismatch at index", i);
      console.log(" saved     ", a);
      console.log(" ts-side   ", b);
      return 1;
    }
  }
  if (saved.length !== recomputed.length) {
    console.log("Length mismatch", { saved: saved.length, ts_side: recomputed.length });
    if (saved.length > n) console.log(" next saved   ", saved[n]);
    if (recomputed.length > n) console.log(" next ts-side ", recomputed[n]);
    return 1;
  }
  console.log("OK: saved debug events and TS recompute match exactly.");
  console.log("event_count =", saved.length);
  return 0;
}

function main(): number {
  const { jsonPath, roundStartMs, rounds } = parseArgs(process.argv);
  const full = path.resolve(process.cwd(), jsonPath);
  const obj = JSON.parse(fs.readFileSync(full, "utf-8")) as AnyObj;
  const debugEvents = obj.strategy_debug_events;
  if (!Array.isArray(debugEvents)) {
    throw new Error("No `strategy_debug_events` in result JSON. Re-run mike_v1 with `debug_trace=true`.");
  }
  const saved = byWindow(extractSavedEvents(debugEvents), roundStartMs, rounds);
  const recomputed = byWindow(recomputeTsEvents(obj), roundStartMs, rounds);
  return compare(saved, recomputed);
}

process.exitCode = main();
