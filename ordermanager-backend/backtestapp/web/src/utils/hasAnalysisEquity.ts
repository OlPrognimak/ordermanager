import type { BacktestResult } from "@/api/types";

/** True if equity ticks include BTC and/or YES/NO fields usable on the data analysis charts. */
export function hasAnalysisEquity(result: BacktestResult): boolean {
  if (result.meta?.data_source === "mongodb_lazy") return true;
  return result.equity.some(
    (p) =>
      (p.price != null && Number.isFinite(p.price)) ||
      (p.yes != null && Number.isFinite(p.yes)) ||
      (p.no != null && Number.isFinite(p.no)),
  );
}
