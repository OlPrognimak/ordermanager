import type { EquityPoint } from "@/api/types";

export interface DrawdownPoint {
  timestamp_ms: number;
  drawdown_abs: number;
  drawdown_pct: number;
}

export function equityToDrawdownSeries(points: EquityPoint[]): DrawdownPoint[] {
  let peak = -Infinity;
  return points.map((p) => {
    peak = Math.max(peak, p.equity);
    const drawdown_abs = peak - p.equity;
    const drawdown_pct = peak > 0 ? drawdown_abs / peak : 0;
    return {
      timestamp_ms: p.timestamp_ms,
      drawdown_abs,
      drawdown_pct,
    };
  });
}
