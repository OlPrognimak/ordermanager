import { computeEma } from "@/utils/ema";

export type NoiseFilterId =
  | "ema"
  | "zlema"
  | "dema"
  | "tema"
  | "hma"
  | "kalman"
  | "laguerre"
  | "gaussian"
  | "butterworth"
  | "ultimate_smoother"
  | "jurik_approx";

export const NOISE_FILTER_OPTIONS: Array<{ id: NoiseFilterId; label: string }> = [
  { id: "ema", label: "EMA" },
  { id: "zlema", label: "Zero-Lag EMA (ZLEMA)" },
  { id: "dema", label: "Double EMA (DEMA)" },
  { id: "tema", label: "Triple EMA (TEMA)" },
  { id: "hma", label: "Hull MA (HMA)" },
  { id: "kalman", label: "Kalman Filter" },
  { id: "laguerre", label: "Laguerre Filter" },
  { id: "gaussian", label: "Gaussian Filter" },
  { id: "butterworth", label: "Butterworth (2-pole)" },
  { id: "ultimate_smoother", label: "Ultimate Smoother" },
  { id: "jurik_approx", label: "Jurik MA (approx)" },
];

export function noiseFilterShortLabel(id: NoiseFilterId): string {
  switch (id) {
    case "ema":
      return "EMA";
    case "zlema":
      return "ZLEMA";
    case "dema":
      return "DEMA";
    case "tema":
      return "TEMA";
    case "hma":
      return "HMA";
    case "kalman":
      return "Kalman";
    case "laguerre":
      return "Laguerre";
    case "gaussian":
      return "Gaussian";
    case "butterworth":
      return "Butterworth";
    case "ultimate_smoother":
      return "Ultimate";
    case "jurik_approx":
      return "JMA~";
    default:
      return "Filter";
  }
}

function finite(v: number | null | undefined): number | null {
  return v != null && Number.isFinite(v) ? v : null;
}

function contiguousFiniteSegments(values: (number | null | undefined)[]): Array<[number, number]> {
  const segs: Array<[number, number]> = [];
  let s = -1;
  for (let i = 0; i < values.length; i++) {
    if (finite(values[i]) != null) {
      if (s < 0) s = i;
    } else if (s >= 0) {
      segs.push([s, i - 1]);
      s = -1;
    }
  }
  if (s >= 0) segs.push([s, values.length - 1]);
  return segs;
}

function wmaFinite(values: number[], period: number): number[] {
  const n = Math.max(1, Math.floor(period));
  const out: number[] = Array.from({ length: values.length }, () => Number.NaN);
  const den = (n * (n + 1)) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < n - 1) continue;
    let num = 0;
    for (let k = 0; k < n; k++) {
      num += values[i - k]! * (n - k);
    }
    out[i] = num / den;
  }
  return out;
}

function emaFinite(values: number[], span: number): number[] {
  return computeEma(values, span).map((v) => (v == null ? Number.NaN : v));
}

function superSmootherFinite(values: number[], period: number): number[] {
  const p = Math.max(3, period);
  const out: number[] = Array.from({ length: values.length }, () => Number.NaN);
  const a1 = Math.exp((-1.414 * Math.PI) / p);
  const b1 = 2 * a1 * Math.cos((1.414 * Math.PI) / p);
  const c2 = b1;
  const c3 = -a1 * a1;
  const c1 = 1 - c2 - c3;
  for (let i = 0; i < values.length; i++) {
    if (i < 2) {
      out[i] = values[i]!;
      continue;
    }
    out[i] = c1 * (values[i]! + values[i - 1]!) * 0.5 + c2 * out[i - 1]! + c3 * out[i - 2]!;
  }
  return out;
}

function applyFilterFinite(values: number[], span: number, filter: NoiseFilterId): number[] {
  const n = Math.max(2, Math.floor(span));
  switch (filter) {
    case "ema":
      return emaFinite(values, n);
    case "zlema": {
      const lag = Math.max(1, Math.floor((n - 1) / 2));
      const z: number[] = values.map((v, i) => {
        const xLag = i - lag >= 0 ? values[i - lag]! : values[0]!;
        return v + (v - xLag);
      });
      return emaFinite(z, n);
    }
    case "dema": {
      const e1 = emaFinite(values, n);
      const e2 = emaFinite(e1.map((v) => (Number.isFinite(v) ? v : values[0]!)), n);
      return e1.map((v, i) => (Number.isFinite(v) && Number.isFinite(e2[i]!) ? 2 * v - e2[i]! : Number.NaN));
    }
    case "tema": {
      const e1 = emaFinite(values, n);
      const e2 = emaFinite(e1.map((v) => (Number.isFinite(v) ? v : values[0]!)), n);
      const e3 = emaFinite(e2.map((v) => (Number.isFinite(v) ? v : values[0]!)), n);
      return e1.map((v, i) =>
        Number.isFinite(v) && Number.isFinite(e2[i]!) && Number.isFinite(e3[i]!)
          ? 3 * v - 3 * e2[i]! + e3[i]!
          : Number.NaN,
      );
    }
    case "hma": {
      const n2 = Math.max(1, Math.floor(n / 2));
      const ns = Math.max(1, Math.floor(Math.sqrt(n)));
      const w1 = wmaFinite(values, n2);
      const w2 = wmaFinite(values, n);
      const diff = values.map((_, i) =>
        Number.isFinite(w1[i]!) && Number.isFinite(w2[i]!) ? 2 * w1[i]! - w2[i]! : Number.NaN,
      );
      const seed = diff.map((v, i) => (Number.isFinite(v) ? v : values[Math.max(0, i - 1)]!));
      return wmaFinite(seed, ns);
    }
    case "kalman": {
      const q = 0.01 / n;
      const r = 0.1;
      const out: number[] = [];
      let x = values[0]!;
      let p = 1;
      for (const z of values) {
        p += q;
        const k = p / (p + r);
        x = x + k * (z - x);
        p = (1 - k) * p;
        out.push(x);
      }
      return out;
    }
    case "laguerre": {
      const gamma = Math.max(0.1, Math.min(0.9, 1 - 2 / (n + 1)));
      const out: number[] = [];
      let l0 = values[0]!;
      let l1 = values[0]!;
      let l2 = values[0]!;
      let l3 = values[0]!;
      for (const x of values) {
        const l0n = (1 - gamma) * x + gamma * l0;
        const l1n = -gamma * l0n + l0 + gamma * l1;
        const l2n = -gamma * l1n + l1 + gamma * l2;
        const l3n = -gamma * l2n + l2 + gamma * l3;
        l0 = l0n;
        l1 = l1n;
        l2 = l2n;
        l3 = l3n;
        out.push((l0 + 2 * l1 + 2 * l2 + l3) / 6);
      }
      return out;
    }
    case "gaussian": {
      // Trailing/causal Gaussian: only current + past samples (no future lookahead).
      const w = Math.max(3, n | 1);
      const sigma = n / 3;
      const kernel: number[] = [];
      let ks = 0;
      for (let lag = 0; lag < w; lag++) {
        const kv = Math.exp(-(lag * lag) / (2 * sigma * sigma));
        kernel.push(kv);
        ks += kv;
      }
      for (let i = 0; i < w; i++) kernel[i] = kernel[i]! / ks;
      const out: number[] = [];
      for (let i = 0; i < values.length; i++) {
        let acc = 0;
        let ws = 0;
        for (let lag = 0; lag < w; lag++) {
          const j = i - lag;
          if (j < 0) break;
          const kw = kernel[lag]!;
          acc += values[j]! * kw;
          ws += kw;
        }
        out.push(ws > 0 ? acc / ws : values[i]!);
      }
      return out;
    }
    case "butterworth":
      return superSmootherFinite(values, n);
    case "ultimate_smoother":
      return superSmootherFinite(superSmootherFinite(values, Math.max(3, Math.floor(n * 0.8))), n);
    case "jurik_approx": {
      // Open approximation: adaptive EMA by local volatility ratio.
      const out: number[] = [];
      let y = values[0]!;
      out.push(y);
      for (let i = 1; i < values.length; i++) {
        const x = values[i]!;
        const d = Math.abs(x - values[i - 1]!);
        const base = 2 / (n + 1);
        const adapt = Math.min(1, Math.max(0.05, base * (1 + 5 * d / Math.max(1e-9, Math.abs(y)))));
        y = y + adapt * (x - y);
        out.push(y);
      }
      return out;
    }
    default:
      return emaFinite(values, n);
  }
}

export function applyNoiseFilter(
  values: (number | null | undefined)[],
  span: number,
  filter: NoiseFilterId,
): (number | null)[] {
  const out: (number | null)[] = Array.from({ length: values.length }, () => null);
  const segs = contiguousFiniteSegments(values);
  for (const [s, e] of segs) {
    const raw: number[] = [];
    for (let i = s; i <= e; i++) raw.push(values[i] as number);
    const f = applyFilterFinite(raw, span, filter);
    for (let k = 0; k < f.length; k++) {
      out[s + k] = Number.isFinite(f[k]!) ? f[k]! : null;
    }
  }
  return out;
}
