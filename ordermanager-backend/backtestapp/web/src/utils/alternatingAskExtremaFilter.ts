export type EmaExtremaIndexSets = { peaks: Set<number>; valleys: Set<number> };

function finiteQuoteAt(picked: (number | null)[], i: number): number | null {
  const v = picked[i];
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Filters EMA-derived peaks/valleys to strict alternation starting at the first **valley**
 * (valley → peak → valley → …). Raw quote thresholds are **independent**:
 *
 * - **Valley → peak:** if `valleyToPeakCents > 0`, require
 *   `raw_bid(peak) − raw_ask(valley) ≥ valleyToPeakCents`.
 * - **Peak → valley:** if `peakToValleyCents > 0`, require `raw_ask(peak) − raw_ask(valley) ≥ peakToValleyCents`.
 *
 * A threshold of 0 means that leg has no minimum move. `minSeparationMs` applies between consecutive
 * accepted markers when > 0.
 */
export function filterAlternatingAskSwingCents(
  peaks: Iterable<number>,
  valleys: Iterable<number>,
  askPicked: (number | null)[],
  bidPicked: (number | null)[],
  valleyToPeakCents: number,
  peakToValleyCents: number,
  timesMs: number[],
  minSeparationMs: number,
): EmaExtremaIndexSets {
  if (valleyToPeakCents <= 0 && peakToValleyCents <= 0 && minSeparationMs <= 0) {
    return { peaks: new Set(peaks), valleys: new Set(valleys) };
  }

  type Kind = "peak" | "valley";
  type Ev = { kind: Kind; idx: number };
  const events: Ev[] = [
    ...[...peaks].map((idx) => ({ kind: "peak" as const, idx })),
    ...[...valleys].map((idx) => ({ kind: "valley" as const, idx })),
  ].sort((a, b) => a.idx - b.idx);

  const outPeaks = new Set<number>();
  const outValleys = new Set<number>();

  type Last = { kind: "valley"; idx: number; ask: number } | { kind: "peak"; idx: number; ask: number };
  let last: Last | null = null;

  const timeOk = (i: number, lastIdx: number): boolean => {
    if (minSeparationMs <= 0) return true;
    const t = timesMs[i];
    const t0 = timesMs[lastIdx];
    if (t == null || t0 == null || !Number.isFinite(t) || !Number.isFinite(t0)) return false;
    return t - t0 >= minSeparationMs;
  };

  for (const e of events) {
    const ask = finiteQuoteAt(askPicked, e.idx);
    if (ask == null) continue;

    if (last === null) {
      if (e.kind !== "valley") continue;
      last = { kind: "valley", idx: e.idx, ask };
      outValleys.add(e.idx);
      continue;
    }

    if (e.kind === last.kind) continue;

    if (!timeOk(e.idx, last.idx)) continue;

    if (e.kind === "peak" && last.kind === "valley") {
      const peakBid = finiteQuoteAt(bidPicked, e.idx);
      const pass =
        valleyToPeakCents <= 0 ||
        (peakBid != null && peakBid - last.ask >= valleyToPeakCents);
      if (pass) {
        outPeaks.add(e.idx);
        last = { kind: "peak", idx: e.idx, ask };
      }
    } else if (e.kind === "valley" && last.kind === "peak") {
      if (peakToValleyCents <= 0 || last.ask - ask >= peakToValleyCents) {
        outValleys.add(e.idx);
        last = { kind: "valley", idx: e.idx, ask };
      }
    }
  }

  return { peaks: outPeaks, valleys: outValleys };
}
