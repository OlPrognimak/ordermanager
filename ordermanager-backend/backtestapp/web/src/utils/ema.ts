/** Standard EMA smoothing: α = 2 / (span + 1) (e.g. span 20 → “EMA₂₀”). */
export function emaAlpha(span: number): number {
  return 2 / (span + 1);
}

/**
 * Point-by-point exponential moving average. Null/undefined/non-finite inputs yield null in the output;
 * internal EMA state is preserved so the next finite sample continues the same smooth curve.
 */
export function computeEma(values: (number | null | undefined)[], span: number): (number | null)[] {
  const alpha = emaAlpha(span);
  const out: (number | null)[] = [];
  let ema: number | null = null;
  for (const v of values) {
    const x = v != null && Number.isFinite(v) ? v : null;
    if (x == null) {
      out.push(null);
      continue;
    }
    ema = ema == null ? x : alpha * x + (1 - alpha) * ema;
    out.push(ema);
  }
  return out;
}
