/**
 * SideDetector + noise stack for mike_v1-style signals (aligned with pmbacktest/strategies/mike_v1.py).
 */

const SLOPE_EPS = 1e-9;

function isFiniteNum(x) {
  return Number.isFinite(x);
}

function ema(vals, span) {
  const n = Math.max(2, span | 0);
  const a = 2 / (n + 1);
  const out = [];
  let y = vals[0];
  for (const x of vals) {
    y = y + a * (x - y);
    out.push(y);
  }
  return out;
}

function wmaFinite(vals, period) {
  const n = Math.max(1, period | 0);
  const out = Array(vals.length).fill(NaN);
  const den = (n * (n + 1)) / 2;
  for (let i = 0; i < vals.length; i++) {
    if (i < n - 1) continue;
    let acc = 0;
    for (let k = 0; k < n; k++) acc += vals[i - k] * (n - k);
    out[i] = acc / den;
  }
  return out;
}

function superSmootherFinite(vals, period) {
  const p = Math.max(3, period | 0);
  const out = Array(vals.length).fill(NaN);
  const a1 = Math.exp((-1.414 * Math.PI) / p);
  const b1 = 2 * a1 * Math.cos((1.414 * Math.PI) / p);
  const c2 = b1;
  const c3 = -(a1 * a1);
  const c1 = 1 - c2 - c3;
  for (let i = 0; i < vals.length; i++) {
    if (i < 2) {
      out[i] = vals[i];
      continue;
    }
    out[i] = c1 * (vals[i] + vals[i - 1]) * 0.5 + c2 * out[i - 1] + c3 * out[i - 2];
  }
  return out;
}

function applyNoise(vals, span, filt) {
  const n = Math.max(2, span | 0);
  const f = String(filt).toLowerCase();
  if (f === "ema") return ema(vals, n);
  if (f === "zlema") {
    const lag = Math.max(1, ((n - 1) / 2) | 0);
    const z = vals.map((v, i) => v + (v - vals[Math.max(0, i - lag)]));
    return ema(z, n);
  }
  if (f === "dema") {
    const e1 = ema(vals, n);
    const e2 = ema(e1, n);
    return e1.map((v, i) => 2 * v - e2[i]);
  }
  if (f === "tema") {
    const e1 = ema(vals, n);
    const e2 = ema(e1, n);
    const e3 = ema(e2, n);
    return e1.map((v, i) => 3 * v - 3 * e2[i] + e3[i]);
  }
  if (f === "hma") {
    const n2 = Math.max(1, (n / 2) | 0);
    const ns = Math.max(1, Math.sqrt(n) | 0);
    const w1 = wmaFinite(vals, n2);
    const w2 = wmaFinite(vals, n);
    const diff = vals.map((_, i) =>
      isFiniteNum(w1[i]) && isFiniteNum(w2[i]) ? 2 * w1[i] - w2[i] : NaN
    );
    const seed = diff.map((d, i) => (isFiniteNum(d) ? d : vals[Math.max(0, i - 1)]));
    return wmaFinite(seed, ns);
  }
  if (f === "kalman") {
    const q = 0.01 / n;
    const r = 0.1;
    const out = [];
    let x = vals[0];
    let p = 1;
    for (const z of vals) {
      p += q;
      const k = p / (p + r);
      x = x + k * (z - x);
      p = (1 - k) * p;
      out.push(x);
    }
    return out;
  }
  if (f === "laguerre") {
    const g = Math.max(0.1, Math.min(0.9, 1 - 2 / (n + 1)));
    let l0 = vals[0];
    let l1 = vals[0];
    let l2 = vals[0];
    let l3 = vals[0];
    const out = [];
    for (const x of vals) {
      const l0n = (1 - g) * x + g * l0;
      const l1n = -g * l0n + l0 + g * l1;
      const l2n = -g * l1n + l1 + g * l2;
      const l3n = -g * l2n + l2 + g * l3;
      l0 = l0n;
      l1 = l1n;
      l2 = l2n;
      l3 = l3n;
      out.push((l0 + 2 * l1 + 2 * l2 + l3) / 6);
    }
    return out;
  }
  if (f === "gaussian") {
    const w = Math.max(3, n | 1);
    const sigma = n / 3;
    const k = [];
    for (let lag = 0; lag < w; lag++) k.push(Math.exp(-(lag * lag) / (2 * sigma * sigma)));
    const s = k.reduce((a, b) => a + b, 0);
    const kernel = k.map((x) => x / s);
    const out = [];
    for (let i = 0; i < vals.length; i++) {
      let acc = 0;
      let ws = 0;
      for (let lag = 0; lag < w; lag++) {
        const idx = i - lag;
        if (idx < 0) break;
        const kw = kernel[lag];
        acc += vals[idx] * kw;
        ws += kw;
      }
      out.push(ws > 0 ? acc / ws : vals[i]);
    }
    return out;
  }
  if (f === "butterworth") return superSmootherFinite(vals, n);
  if (f === "ultimate_smoother")
    return superSmootherFinite(superSmootherFinite(vals, Math.max(3, (n * 0.8) | 0)), n);
  if (f === "jurik_approx") {
    const out = [];
    let y = vals[0];
    out.push(y);
    const base = 2 / (n + 1);
    for (let i = 1; i < vals.length; i++) {
      const x = vals[i];
      const d = Math.abs(x - vals[i - 1]);
      const adapt = Math.min(1, Math.max(0.05, base * (1 + (5 * d) / Math.max(1e-9, Math.abs(y)))));
      y = y + adapt * (x - y);
      out.push(y);
    }
    return out;
  }
  return ema(vals, n);
}

class NoiseSmoother {
  constructor({ span, noiseFilter }) {
    this.span = span | 0;
    this.noiseFilter = String(noiseFilter).toLowerCase();
    this.raw = [];
    this._fast = new Set([
      "ema",
      "zlema",
      "dema",
      "tema",
      "kalman",
      "laguerre",
      "butterworth",
      "ultimate_smoother",
      "jurik_approx",
    ]).has(this.noiseFilter);
    this._emaA = 2 / (Math.max(2, this.span) + 1);
    this._ema1 = null;
    this._ema2 = null;
    this._ema3 = null;
    this._kalmanX = null;
    this._kalmanP = 1;
    this._lagL0 = null;
    this._lagL1 = null;
    this._lagL2 = null;
    this._lagL3 = null;
    this._jmaY = null;
    this._gaussWindow = Math.max(3, this.span | 1);
    this._gaussKernel = null;
    this._gaussKernelSum = 0;
    this._gaussRawBuf = [];
    if (this.noiseFilter === "gaussian") {
      const sigma = Math.max(1, this.span / 3);
      const k = [];
      for (let lag = 0; lag < this._gaussWindow; lag++) k.push(Math.exp(-(lag * lag) / (2 * sigma * sigma)));
      this._gaussKernelSum = k.reduce((a, b) => a + b, 0);
      this._gaussKernel = k;
    }
  }

  push(x) {
    const xv = Number(x);
    this.raw.push(xv);
    const f = this.noiseFilter;
    if (!this._fast && f !== "gaussian") {
      const y = applyNoise(this.raw, this.span, this.noiseFilter).at(-1);
      return isFiniteNum(y) ? y : this.raw.at(-1);
    }
    if (f === "ema") {
      if (this._ema1 == null) this._ema1 = xv;
      else this._ema1 = this._ema1 + this._emaA * (xv - this._ema1);
      return this._ema1;
    }
    if (f === "gaussian") {
      this._gaussRawBuf.push(xv);
      if (this._gaussRawBuf.length > this._gaussWindow) this._gaussRawBuf.shift();
      let acc = 0;
      let ws = 0;
      const n = this._gaussRawBuf.length;
      for (let lag = 0; lag < n; lag++) {
        const kw = this._gaussKernel[lag];
        acc += this._gaussRawBuf[n - 1 - lag] * kw;
        ws += kw;
      }
      return ws > 0 ? acc / ws : xv;
    }
    const y = applyNoise(this.raw, this.span, this.noiseFilter).at(-1);
    return isFiniteNum(y) ? y : this.raw.at(-1);
  }
}

function avgSlope3(values, i) {
  if (i < 3) return null;
  return (
    (values[i] - values[i - 1] + (values[i - 1] - values[i - 2]) + (values[i - 2] - values[i - 3])) / 3
  );
}

function sustainedTangent(values, timesMs, sustainedMs, wantNegative) {
  if (!values.length || !timesMs.length) return false;
  const i = values.length - 1;
  const tEnd = timesMs[i];
  const tStart = tEnd - sustainedMs;
  let first = i;
  while (first > 0 && timesMs[first - 1] >= tStart) first--;
  const k0 = Math.max(first, 3);
  if (k0 < timesMs.length && tEnd - timesMs[k0] < sustainedMs) return false;
  for (let k = k0; k <= i; k++) {
    const s = avgSlope3(values, k);
    if (s == null) return false;
    if (wantNegative) {
      if (s >= -SLOPE_EPS) return false;
    } else if (s <= SLOPE_EPS) return false;
  }
  return true;
}

export class SideDetector {
  constructor({
    span,
    noiseFilter,
    structuralHysteresis,
    sustainedTangentMs,
    maxValleyAskExclusive,
    cooldownMs = 1000,
    goldenPeakFallbackMs = 30_000,
    valleyToPeakMinCents = 10,
    alternatingMinGapMs = 1000,
    anchorToQuoteSeries = true,
    debug = false,
  }) {
    this.smoother = new NoiseSmoother({ span, noiseFilter });
    this.h = Number(structuralHysteresis);
    this.sustained = sustainedTangentMs | 0;
    this.maxValleyAskExclusive = Number(maxValleyAskExclusive);
    this.cooldown = cooldownMs | 0;
    this.fallbackMs = goldenPeakFallbackMs | 0;
    this.v2pMin = Number(valleyToPeakMinCents);
    this.altGapMs = alternatingMinGapMs | 0;
    this.anchorToQuoteSeries = Boolean(anchorToQuoteSeries);
    this.p2vMin = 0;
    this.times = [];
    this.smooth = [];
    this.askHist = [];
    this.bidHist = [];
    this.mode = "SEARCH_VALLEY";
    this.localExtrema = Infinity;
    this.lastSignalMs = -1e18;
    this.postValleyBarIdx = null;
    this.postValleyDeadlineMs = null;
    this.fallbackPeakBestIdx = null;
    this.fallbackPeakBestPrice = null;
    this.valleyBestIdx = null;
    this.valleyBestAsk = null;
    this.accKind = null;
    this.accIdx = null;
    this.accAsk = null;
    this.lastEmittedIdx = null;
    this.debug = Boolean(debug);
    this.lastDbg = null;
  }

  update({ tsMs, ask, bid }) {
    this.lastEmittedIdx = null;
    const sm = this.smoother.push(ask);
    this.times.push(tsMs | 0);
    this.smooth.push(Number(sm));
    this.askHist.push(Number(ask));
    this.bidHist.push(Number(bid));
    const i = this.smooth.length - 1;
    const price = this.smooth[i];
    const t = this.times[i];
    let kind = null;
    let idx = null;

    if (this.mode === "SEARCH_VALLEY") {
      if (price < this.localExtrema) this.localExtrema = price;
      if (ask < this.maxValleyAskExclusive && (this.valleyBestAsk == null || ask < this.valleyBestAsk)) {
        this.valleyBestAsk = ask;
        this.valleyBestIdx = i;
      }
      const cooldownOk = t - this.lastSignalMs >= this.cooldown;
      const tanOk =
        this.sustained <= 0 ? true : sustainedTangent(this.smooth, this.times, this.sustained, false);
      const capOk = ask < this.maxValleyAskExclusive;
      const hystOk = this.localExtrema !== Infinity && price > this.localExtrema + this.h;
      if (this.debug) {
        this.lastDbg = {
          mode: this.mode,
          phase: "valley_check",
          cooldownOk,
          tanOk,
          hystOk,
          capOk,
          v2pOk: true,
          price,
          ask,
          bid,
          local: this.localExtrema,
          t,
        };
      }
      if (cooldownOk && tanOk && hystOk && capOk) {
        kind = "valley";
        idx = this.anchorToQuoteSeries
          ? (this.valleyBestIdx != null ? this.valleyBestIdx : i)
          : i;
        this.mode = "SEARCH_PEAK";
        this.localExtrema = price;
        this.lastSignalMs = t;
        this.valleyBestIdx = null;
        this.valleyBestAsk = null;
        if (this.fallbackMs > 0) {
          this.postValleyBarIdx = idx;
          this.postValleyDeadlineMs = t + this.fallbackMs;
          this.fallbackPeakBestIdx = null;
          this.fallbackPeakBestPrice = null;
        }
      }
    } else {
      if (price > this.localExtrema) this.localExtrema = price;
      if (this.postValleyBarIdx != null && i > this.postValleyBarIdx) {
        if (this.fallbackPeakBestPrice == null || bid > this.fallbackPeakBestPrice) {
          this.fallbackPeakBestPrice = bid;
          this.fallbackPeakBestIdx = i;
        }
      }
      const cooldownOk = t - this.lastSignalMs >= this.cooldown;
      const tanOk =
        this.sustained <= 0 ? true : sustainedTangent(this.smooth, this.times, this.sustained, true);
      const hystOk = price < this.localExtrema - this.h;
      const capOk = true;
      if (this.debug) {
        this.lastDbg = {
          mode: this.mode,
          phase: "peak_check",
          cooldownOk,
          tanOk,
          hystOk,
          capOk,
          v2pOk: true,
          price,
          ask,
          bid,
          local: this.localExtrema,
          t,
        };
      }
      if (cooldownOk && tanOk && hystOk) {
        kind = "peak";
        idx = this.anchorToQuoteSeries
          ? (this.fallbackPeakBestIdx != null ? this.fallbackPeakBestIdx : i)
          : i;
        this.mode = "SEARCH_VALLEY";
        this.localExtrema = price;
        this.lastSignalMs = t;
        this.postValleyBarIdx = null;
        this.postValleyDeadlineMs = null;
        this.fallbackPeakBestIdx = null;
        this.fallbackPeakBestPrice = null;
      } else if (
        this.fallbackMs > 0 &&
        this.postValleyDeadlineMs != null &&
        t >= this.postValleyDeadlineMs &&
        this.fallbackPeakBestIdx != null &&
        cooldownOk
      ) {
        kind = "peak";
        idx = this.anchorToQuoteSeries ? this.fallbackPeakBestIdx : i;
        this.mode = "SEARCH_VALLEY";
        this.localExtrema = this.smooth[this.fallbackPeakBestIdx];
        this.lastSignalMs = t;
        this.postValleyBarIdx = null;
        this.postValleyDeadlineMs = null;
        this.fallbackPeakBestIdx = null;
        this.fallbackPeakBestPrice = null;
      }
    }
    return this._accept(kind, idx);
  }

  _accept(kind, idx) {
    if (kind == null || idx == null) return null;
    const ask = this.askHist[idx];
    const t = this.times[idx];
    if (this.accKind == null) {
      if (kind !== "valley") return null;
      this.accKind = "valley";
      this.accIdx = idx;
      this.accAsk = ask;
      this.lastEmittedIdx = idx;
      return "valley";
    }
    if (kind === this.accKind) return null;
    if (this.altGapMs > 0 && this.accIdx != null && t - this.times[this.accIdx] < this.altGapMs) return null;
    if (kind === "peak" && this.accKind === "valley") {
      const peakBid = this.bidHist[idx];
      const v2pOk =
        this.v2pMin <= 0 || (this.accAsk != null && peakBid - this.accAsk >= this.v2pMin);
      if (!v2pOk) {
        if (this.debug && this.lastDbg) this.lastDbg.v2pOk = false;
        return null;
      }
      this.accKind = "peak";
      this.accIdx = idx;
      this.accAsk = ask;
      this.lastEmittedIdx = idx;
      return "peak";
    }
    if (kind === "valley" && this.accKind === "peak") {
      if (this.p2vMin > 0 && (this.accAsk == null || this.accAsk - ask < this.p2vMin)) return null;
      this.accKind = "valley";
      this.accIdx = idx;
      this.accAsk = ask;
      this.lastEmittedIdx = idx;
      return "valley";
    }
    return null;
  }
}
