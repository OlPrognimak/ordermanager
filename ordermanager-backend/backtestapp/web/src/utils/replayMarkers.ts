import type { EquityPoint, ReplayMarker, ReplayMarkerKind, TradeRow } from "@/api/types";

function nearestTick(equity: EquityPoint[], tsMs: number): EquityPoint | null {
  if (!equity.length) return null;
  let lo = 0;
  let hi = equity.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (equity[mid]!.timestamp_ms < tsMs) lo = mid + 1;
    else hi = mid;
  }
  let best = lo;
  if (lo > 0) {
    const dPrev = Math.abs(equity[lo - 1]!.timestamp_ms - tsMs);
    const dHere = Math.abs(equity[lo]!.timestamp_ms - tsMs);
    if (dPrev <= dHere) best = lo - 1;
  }
  return equity[best]!;
}

/**
 * Fallback when trade rows lack a finite ledger price: approximate from the book at the event time
 * (ask on open, bid on exit).
 */
export function quoteCentsForMarker(tk: EquityPoint, kind: ReplayMarkerKind): number {
  switch (kind) {
    case "buy_yes":
      return tk.yes_ask ?? tk.yes ?? 0;
    case "exit_yes":
      return tk.yes_bid ?? tk.yes ?? 0;
    case "buy_no":
      return tk.no_ask ?? tk.no ?? 0;
    case "exit_no":
      return tk.no_bid ?? tk.no ?? 0;
    default:
      return tk.yes ?? 0;
  }
}

function ledgerQuoteCents(t: TradeRow, kind: ReplayMarkerKind): number | null {
  const p =
    kind === "buy_yes" || kind === "buy_no" ? t.entry_price : t.exit_price;
  if (p == null || !Number.isFinite(p)) return null;
  return p * 100;
}

function resolveMarkerQuoteCents(
  t: TradeRow,
  kind: ReplayMarkerKind,
  equity: EquityPoint[],
  tsMs: number,
): number | null {
  if (!equity.length) return null;
  const tk = nearestTick(equity, tsMs);
  if (!tk || tk.yes == null || tk.no == null) return null;
  // For chart alignment, prefer quote-at-timestamp so markers sit on the displayed YES/NO line.
  // (Ledger fill can differ due to execution model and may render off-line.)
  if (kind === "buy_yes" || kind === "buy_no") {
    const q = quoteCentsForMarker(tk, kind);
    return Number.isFinite(q) ? q : null;
  }
  const fromLedger = ledgerQuoteCents(t, kind);
  if (fromLedger != null) return fromLedger;
  const q = quoteCentsForMarker(tk, kind);
  return Number.isFinite(q) ? q : null;
}

function buyMarkersFromDebugEvents(
  equity: EquityPoint[],
  events: Record<string, unknown>[] | null | undefined,
  windowStartMs?: number,
  windowEndMs?: number,
): ReplayMarker[] {
  if (!events?.length) return [];
  const out: ReplayMarker[] = [];
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const phase = String((ev as Record<string, unknown>).phase ?? "");
    if (phase !== "buy_trough" && phase !== "buy") continue;
    const ts = Number((ev as Record<string, unknown>).ts_ms);
    if (!Number.isFinite(ts)) continue;
    if (windowStartMs != null && ts < windowStartMs) continue;
    if (windowEndMs != null && ts >= windowEndMs) continue;
    const side = String((ev as Record<string, unknown>).side ?? "").toLowerCase();
    const kind: ReplayMarkerKind = side === "yes" ? "buy_yes" : side === "no" ? "buy_no" : "buy_yes";
    const tk = nearestTick(equity, ts);
    if (!tk || tk.yes == null || tk.no == null) continue;
    const q = quoteCentsForMarker(tk, kind);
    if (!Number.isFinite(q)) continue;
    const qty = Number((ev as Record<string, unknown>).quantity);
    const usd = Number((ev as Record<string, unknown>).bet_usd ?? (ev as Record<string, unknown>).bet_usd_amount);
    out.push({
      timestamp_ms: Math.trunc(ts),
      kind,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
      usd_amount: Number.isFinite(usd) && usd > 0 ? usd : undefined,
      quote_cents: q,
    });
  }
  return out;
}

/** Same semantics as mock API `buildReplayMarkers` — for completed runs in the browser. */
export function buildReplayMarkersFromTrades(
  trades: TradeRow[],
  equity: EquityPoint[],
  lastTsMs: number,
  strategyDebugEvents?: Record<string, unknown>[] | null,
): ReplayMarker[] {
  const out: ReplayMarker[] = [];
  const buyFromDebug = buyMarkersFromDebugEvents(equity, strategyDebugEvents);
  const hasDebugBuys = buyFromDebug.length > 0;
  if (hasDebugBuys) out.push(...buyFromDebug.filter((m) => m.timestamp_ms <= lastTsMs));
  for (const t of trades) {
    if (!hasDebugBuys && t.opened_ts_ms <= lastTsMs) {
      const kind: ReplayMarkerKind = t.side === "yes" ? "buy_yes" : "buy_no";
      const quote_cents = resolveMarkerQuoteCents(t, kind, equity, t.opened_ts_ms);
      if (quote_cents == null) continue;
      out.push({
        timestamp_ms: t.opened_ts_ms,
        kind,
        quantity: t.quantity,
        usd_amount: t.bet_usd_amount ?? t.quantity * t.entry_price,
        quote_cents,
      });
    }
    if (t.closed_ts_ms <= lastTsMs) {
      const kind: ReplayMarkerKind = t.side === "yes" ? "exit_yes" : "exit_no";
      const quote_cents = resolveMarkerQuoteCents(t, kind, equity, t.closed_ts_ms);
      if (quote_cents == null) continue;
      out.push({
        timestamp_ms: t.closed_ts_ms,
        kind,
        quantity: t.quantity,
        usd_amount: t.bet_usd_amount ?? t.quantity * t.entry_price,
        quote_cents,
      });
    }
  }
  return out;
}

/** Opens/closes whose event timestamp falls in [windowStartMs, windowEndMs) — one UTC 5m slot. */
export function buildReplayMarkersForRound(
  trades: TradeRow[],
  equity: EquityPoint[],
  windowStartMs: number,
  windowEndMs: number,
  strategyDebugEvents?: Record<string, unknown>[] | null,
): ReplayMarker[] {
  const out: ReplayMarker[] = [];
  const buyFromDebug = buyMarkersFromDebugEvents(equity, strategyDebugEvents, windowStartMs, windowEndMs);
  const hasDebugBuys = buyFromDebug.length > 0;
  if (hasDebugBuys) out.push(...buyFromDebug);
  for (const t of trades) {
    if (!hasDebugBuys && t.opened_ts_ms >= windowStartMs && t.opened_ts_ms < windowEndMs) {
      const kind: ReplayMarkerKind = t.side === "yes" ? "buy_yes" : "buy_no";
      const quote_cents = resolveMarkerQuoteCents(t, kind, equity, t.opened_ts_ms);
      if (quote_cents == null) continue;
      out.push({
        timestamp_ms: t.opened_ts_ms,
        kind,
        quantity: t.quantity,
        usd_amount: t.bet_usd_amount ?? t.quantity * t.entry_price,
        quote_cents,
      });
    }
    if (t.closed_ts_ms >= windowStartMs && t.closed_ts_ms < windowEndMs) {
      const kind: ReplayMarkerKind = t.side === "yes" ? "exit_yes" : "exit_no";
      const quote_cents = resolveMarkerQuoteCents(t, kind, equity, t.closed_ts_ms);
      if (quote_cents == null) continue;
      out.push({
        timestamp_ms: t.closed_ts_ms,
        kind,
        quantity: t.quantity,
        usd_amount: t.bet_usd_amount ?? t.quantity * t.entry_price,
        quote_cents,
      });
    }
  }
  return out;
}

export function buildReplayMarkersForResult(
  equity: EquityPoint[],
  trades: TradeRow[],
  strategyDebugEvents?: Record<string, unknown>[] | null,
): ReplayMarker[] {
  const last = equity.at(-1)?.timestamp_ms;
  if (last == null) return [];
  return buildReplayMarkersFromTrades(trades, equity, last, strategyDebugEvents);
}
