import type { EquityPoint } from "@/api/types";

/** Row has usable Up (YES) price data (mid or bid or ask). */
function hasUpPrice(p: EquityPoint): boolean {
  return (
    (p.yes != null && Number.isFinite(p.yes)) ||
    (p.yes_bid != null && Number.isFinite(p.yes_bid)) ||
    (p.yes_ask != null && Number.isFinite(p.yes_ask))
  );
}

/** Row has usable Down (NO) price data (mid or bid or ask). */
function hasDownPrice(p: EquityPoint): boolean {
  return (
    (p.no != null && Number.isFinite(p.no)) ||
    (p.no_bid != null && Number.isFinite(p.no_bid)) ||
    (p.no_ask != null && Number.isFinite(p.no_ask))
  );
}

/** One market tick: both Up and Down quotes present (what the analysis charts plot). */
export function isUpDownQuoteTick(p: EquityPoint): boolean {
  return hasUpPrice(p) && hasDownPrice(p);
}

export function countUpDownQuoteTicks(points: EquityPoint[]): number {
  let n = 0;
  for (const p of points) {
    if (isUpDownQuoteTick(p)) n += 1;
  }
  return n;
}
