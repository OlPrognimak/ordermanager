export type DiscreteTangentExtremaOptions = {
    /** Within this many sample indices, keep the sharpest turn only (0 = off). */
    dominantMinSeparationSamples?: number;
    /** Minimum |Δvalue| leg; combined with hysteresis as max(hysteresis, this) when > 0. */
    minLegSwingAbs?: number;
    /** Minimum milliseconds between consecutive signals (default 1000). */
    cooldownMs?: number;
    /**
     * Schmitt band in the same units as `values` (e.g. quote ¢, BTC USD). Default 0.5.
     */
    structuralHysteresis?: number;
    /** @deprecated Use `structuralHysteresis` (same field meaning). */
    hysteresisCents?: number;
    /** Wall-time window (ms) over which tangent sign must hold. Default 300. */
    sustainedTangentMs?: number;
    /**
     * After each valley, if no strict (hysteresis + sustained) peak fires within this many
     * milliseconds (wall time since the valley bar), emit a peak at the **first** bar after
     * the valley where the **maximum** price over (valley, …] is attained. Then search for
     * the next valley. Set to 0 to disable. Default 30_000.
     */
    goldenPeakFallbackWindowMs?: number;
    /**
     * If set with `valleyAskSeries`, only emit a valley when `valleyAskSeries[i] < maxValleyAskExclusive`
     * (e.g. raw yes ask in ¢ must be below 45). Same length as `values`; same indices.
     */
    maxValleyAskExclusive?: number;
    valleyAskSeries?: (number | null)[];
    /**
     * Optional raw bid series aligned with `values`. When provided, strict/fallback peaks are
     * anchored to the highest bid seen since the last accepted valley (causal, no lookahead).
     */
    peakBidSeries?: (number | null)[];
    /**
     * If true (default), valley/peak marker indices are anchored to best quote levels in-leg
     * when quote series are provided. If false, markers stay on the strict confirmation bar.
     */
    anchorToQuoteSeries?: boolean;
  };
  
  const DEFAULT_COOLDOWN_MS = 1000;
  const DEFAULT_HYSTERESIS = 0.5;
  const DEFAULT_SUSTAINED_MS = 300;
  const DEFAULT_GOLDEN_PEAK_FALLBACK_MS = 30_000;
  
  function finiteAt(values: (number | null)[], i: number): number | null {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) return null;
    return v;
  }
  
  /** Mean of last three one-step slopes ending at index i (matches “window=3” pseudocode). */
  function avgSlope3(values: (number | null)[], i: number): number | null {
    if (i < 3) return null;
    const v0 = finiteAt(values, i);
    const v1 = finiteAt(values, i - 1);
    const v2 = finiteAt(values, i - 2);
    const v3 = finiteAt(values, i - 3);
    if (v0 == null || v1 == null || v2 == null || v3 == null) return null;
    return (v0 - v1 + (v1 - v2) + (v2 - v3)) / 3;
  }
  
  const SLOPE_EPS = 1e-9;
  
  /**
   * True if every tick k in [tEnd - sustainedMs, tEnd] with k >= 3 has avgSlope3(k) on the right side of zero.
   */
  function sustainedTangent(
    values: (number | null)[],
    timesMs: number[],
    i: number,
    sustainedMs: number,
    wantNegative: boolean,
  ): boolean {
    const tEnd = timesMs[i]!;
    const tStart = tEnd - sustainedMs;
    let first = i;
    while (first > 0 && timesMs[first - 1]! >= tStart) first--;
    const k0 = Math.max(first, 3);
    if (tEnd - timesMs[k0]! < sustainedMs) return false;
    for (let k = k0; k <= i; k++) {
      const s = avgSlope3(values, k);
      if (s == null) return false;
      if (wantNegative) {
        if (s >= -SLOPE_EPS) return false;
      } else {
        if (s <= SLOPE_EPS) return false;
      }
    }
    return true;
  }
  
  function sharpnessScore(values: (number | null)[], idx: number): number {
    const s = avgSlope3(values, idx);
    if (s == null) return 0;
    return Math.abs(s);
  }
  
  function mergeByProximity(
    indices: number[],
    sep: number,
    values: (number | null)[],
    timesMs: number[],
  ): number[] {
    if (sep <= 0 || indices.length === 0) return [...indices].sort((a, b) => a - b);
    const sorted = [...indices].sort((a, b) => a - b);
    const out: number[] = [];
    let cluster: number[] = [sorted[0]!];
    for (let k = 1; k < sorted.length; k++) {
      const p = sorted[k]!;
      if (p - cluster[cluster.length - 1]! <= sep) cluster.push(p);
      else {
        out.push(pickSharpest(cluster, values, timesMs));
        cluster = [p];
      }
    }
    out.push(pickSharpest(cluster, values, timesMs));
    return out;
  }
  
  function pickSharpest(cluster: number[], values: (number | null)[], _timesMs: number[]): number {
    let best = cluster[0]!;
    let bestS = sharpnessScore(values, best);
    for (let j = 1; j < cluster.length; j++) {
      const p = cluster[j]!;
      const s = sharpnessScore(values, p);
      if (s > bestS) {
        bestS = s;
        best = p;
      }
    }
    return best;
  }
  
  type SearchMode = "SEARCH_PEAK" | "SEARCH_VALLEY";

type NormalizedExtremaConfig = {
  sep: number;
  cooldownMs: number;
  sustainedMs: number;
  h: number;
  fallbackMs: number;
  maxValleyAskEx: number | null;
  quoteAnchoring: boolean;
};

function normalizeConfig(opts?: DiscreteTangentExtremaOptions): NormalizedExtremaConfig {
  const minLeg = opts?.minLegSwingAbs ?? 0;
  const hBase = opts?.structuralHysteresis ?? opts?.hysteresisCents ?? DEFAULT_HYSTERESIS;
  return {
    sep: opts?.dominantMinSeparationSamples ?? 0,
    cooldownMs: opts?.cooldownMs ?? DEFAULT_COOLDOWN_MS,
    sustainedMs: opts?.sustainedTangentMs ?? DEFAULT_SUSTAINED_MS,
    h: minLeg > 0 ? Math.max(hBase, minLeg) : hBase,
    fallbackMs: opts?.goldenPeakFallbackWindowMs ?? DEFAULT_GOLDEN_PEAK_FALLBACK_MS,
    maxValleyAskEx:
      opts?.maxValleyAskExclusive != null && Number.isFinite(opts.maxValleyAskExclusive)
        ? opts.maxValleyAskExclusive
        : null,
    quoteAnchoring: opts?.anchorToQuoteSeries ?? true,
  };
}

export class IncrementalDiscreteTangentExtrema {
  private readonly cfg: NormalizedExtremaConfig;
  private readonly values: (number | null)[] = [];
  private readonly timesMs: number[] = [];
  private readonly valleyAskSeries: (number | null)[] = [];
  private readonly peakBidSeries: (number | null)[] = [];
  private readonly peaks: number[] = [];
  private readonly valleys: number[] = [];
  private mode: SearchMode = "SEARCH_VALLEY";
  private localExtrema = Number.POSITIVE_INFINITY;
  private lastSignalMs = Number.NEGATIVE_INFINITY;
  private postValleyBarIdx: number | null = null;
  private postValleyDeadlineMs: number | null = null;
  private fallbackPeakBestIdx: number | null = null;
  private fallbackPeakBestPrice: number | null = null;
  private valleyBestIdx: number | null = null;
  private valleyBestAsk: number | null = null;

  constructor(opts?: DiscreteTangentExtremaOptions) {
    this.cfg = normalizeConfig(opts);
  }

  push(input: {
    value: number | null;
    timestampMs: number;
    valleyAsk?: number | null;
    peakBid?: number | null;
  }): { peak: number | null; valley: number | null } {
    const value = input.value != null && Number.isFinite(input.value) ? input.value : null;
    const t = Number.isFinite(input.timestampMs) ? input.timestampMs : Number.NaN;
    const valleyAsk = input.valleyAsk != null && Number.isFinite(input.valleyAsk) ? input.valleyAsk : null;
    const peakBid = input.peakBid != null && Number.isFinite(input.peakBid) ? input.peakBid : null;

    this.values.push(value);
    this.timesMs.push(t);
    this.valleyAskSeries.push(valleyAsk);
    this.peakBidSeries.push(peakBid);

    const i = this.values.length - 1;
    if (value == null || !Number.isFinite(t)) return { peak: null, valley: null };

    if (this.mode === "SEARCH_VALLEY") {
      if (value < this.localExtrema) this.localExtrema = value;

      const askForAnchor = this.cfg.quoteAnchoring ? (valleyAsk ?? value) : value;
      const askEligible =
        askForAnchor != null && (this.cfg.maxValleyAskEx == null || askForAnchor < this.cfg.maxValleyAskEx);
      if (askEligible && (this.valleyBestAsk == null || askForAnchor < this.valleyBestAsk)) {
        this.valleyBestAsk = askForAnchor;
        this.valleyBestIdx = i;
      }

      const cooldownOk = t - this.lastSignalMs >= this.cfg.cooldownMs;
      const tangentOk = sustainedTangent(this.values, this.timesMs, i, this.cfg.sustainedMs, false);
      const hysteresisOk = this.localExtrema !== Number.POSITIVE_INFINITY && value > this.localExtrema + this.cfg.h;

      const valleyAskOk =
        this.cfg.maxValleyAskEx == null || (valleyAsk != null && valleyAsk < this.cfg.maxValleyAskEx);

      if (cooldownOk && tangentOk && hysteresisOk && valleyAskOk) {
        const chosenValleyIdx = this.valleyBestIdx ?? i;
        this.valleys.push(chosenValleyIdx);
        this.mode = "SEARCH_PEAK";
        this.localExtrema = value;
        this.lastSignalMs = t;
        this.valleyBestIdx = null;
        this.valleyBestAsk = null;
        if (this.cfg.fallbackMs > 0) {
          this.postValleyBarIdx = chosenValleyIdx;
          this.postValleyDeadlineMs = t + this.cfg.fallbackMs;
          this.fallbackPeakBestIdx = null;
          this.fallbackPeakBestPrice = null;
        } else {
          this.clearPostValleyFallback();
        }
        return { peak: null, valley: chosenValleyIdx };
      }
      return { peak: null, valley: null };
    }

    // SEARCH_PEAK
    if (value > this.localExtrema) this.localExtrema = value;

    if (this.postValleyBarIdx !== null && i > this.postValleyBarIdx) {
      const peakScore = this.cfg.quoteAnchoring ? (peakBid ?? value) : value;
      if (peakScore != null && (this.fallbackPeakBestPrice == null || peakScore > this.fallbackPeakBestPrice)) {
        this.fallbackPeakBestPrice = peakScore;
        this.fallbackPeakBestIdx = i;
      }
    }

    const cooldownOk = t - this.lastSignalMs >= this.cfg.cooldownMs;
    const tangentOk = sustainedTangent(this.values, this.timesMs, i, this.cfg.sustainedMs, true);
    const hysteresisOk = value < this.localExtrema - this.cfg.h;

    if (cooldownOk && tangentOk && hysteresisOk) {
      const chosenPeakIdx = this.fallbackPeakBestIdx ?? i;
      this.peaks.push(chosenPeakIdx);
      this.mode = "SEARCH_VALLEY";
      this.localExtrema = value;
      this.lastSignalMs = t;
      this.clearPostValleyFallback();
      return { peak: chosenPeakIdx, valley: null };
    }

    if (
      this.cfg.fallbackMs > 0 &&
      this.postValleyDeadlineMs !== null &&
      t >= this.postValleyDeadlineMs &&
      this.fallbackPeakBestIdx !== null &&
      cooldownOk
    ) {
      const chosenPeakIdx = this.fallbackPeakBestIdx;
      this.peaks.push(chosenPeakIdx);
      const pBest = finiteAt(this.values, chosenPeakIdx);
      this.mode = "SEARCH_VALLEY";
      this.localExtrema = pBest ?? value;
      this.lastSignalMs = t;
      this.clearPostValleyFallback();
      return { peak: chosenPeakIdx, valley: null };
    }

    return { peak: null, valley: null };
  }

  getRawIndices(): { peaks: number[]; valleys: number[] } {
    return { peaks: [...this.peaks], valleys: [...this.valleys] };
  }

  getIndices(): { peaks: number[]; valleys: number[] } {
    if (this.cfg.sep > 0) {
      return {
        peaks: mergeByProximity(this.peaks, this.cfg.sep, this.values, this.timesMs),
        valleys: mergeByProximity(this.valleys, this.cfg.sep, this.values, this.timesMs),
      };
    }
    return this.getRawIndices();
  }

  private clearPostValleyFallback(): void {
    this.postValleyBarIdx = null;
    this.postValleyDeadlineMs = null;
    this.fallbackPeakBestIdx = null;
    this.fallbackPeakBestPrice = null;
  }
}
  
  /**
   * Structural hysteresis (Schmitt-style) extrema on `values` (fully causal).
   *
   * Two alternating states (starts in **SEARCH_VALLEY** so the first signal is a valley):
   * - **SEARCH_VALLEY** → **valley** when sustained positive tangent and price rises above
   *   the running minimum by at least hysteresis.
   * - **SEARCH_PEAK** → **peak** when sustained negative tangent and price drops below
   *   the running maximum by at least hysteresis.
   *
   * Hysteresis and sustained-tangent window are fixed for the whole series (override via opts).
   *
   * **Golden peak fallback:** after each valley, if no strict peak appears within
   * `goldenPeakFallbackWindowMs` (default 30s), the peak is taken as the first index after
   * that valley where the running maximum price is achieved (earliest occurrence of the max).
   *
   * **Valley ask cap:** optional `maxValleyAskExclusive` + `valleyAskSeries` require raw ask at
   * the valley bar to be strictly below that threshold (e.g. 45¢).
   *
   * **Spread-aware anchoring:** with `valleyAskSeries` and/or `peakBidSeries`, accepted turns are
   * anchored to best tradable levels seen causally in the active leg:
   * - Valley anchors to the minimum raw ask since last peak-search started.
   * - Peak anchors to the maximum raw bid since last valley-search started.
   */
  export function discreteTangentExtremaIndices(
    values: (number | null)[],
    timesMs: number[],
    opts?: DiscreteTangentExtremaOptions,
  ): { peaks: number[]; valleys: number[] } {
  const engine = new IncrementalDiscreteTangentExtrema(opts);
  for (let i = 0; i < values.length; i++) {
    engine.push({
      value: values[i] ?? null,
      timestampMs: timesMs[i] ?? Number.NaN,
      valleyAsk: opts?.valleyAskSeries?.[i] ?? null,
      peakBid: opts?.peakBidSeries?.[i] ?? null,
    });
  }
  return engine.getIndices();
  }
  