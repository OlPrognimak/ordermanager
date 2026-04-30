/** Simple per-step Sharpe on equity (not annualized; comparable across runs with similar spacing). */
export function sharpeFromEquity(equity: number[]): number | null {
  if (equity.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const a = equity[i - 1]!;
    const b = equity[i]!;
    if (Math.abs(a) < 1e-12) continue;
    rets.push((b - a) / a);
  }
  if (rets.length < 2) return null;
  const m = rets.reduce((s, x) => s + x, 0) / rets.length;
  const v =
    rets.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, rets.length - 1);
  const s = Math.sqrt(Math.max(v, 0));
  if (s < 1e-12) return null;
  return (m / s) * Math.sqrt(rets.length);
}
