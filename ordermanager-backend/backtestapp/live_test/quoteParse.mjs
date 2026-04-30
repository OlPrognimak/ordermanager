/** Polymarket CLOB market-channel message parsing (book, price_change, best_bid_ask). */

/**
 * Parse a CLOB market WS text frame. Long token ids MUST be JSON strings; if the server
 * sends them as JSON numbers, JavaScript rounds past Number.MAX_SAFE_INTEGER and updates
 * no longer match our Gamma-derived string ids — so we pre-quote those fields.
 */
export function parsePolymarketMarketWsJson(text) {
  const s = String(text);
  const fixed = s.replace(
    /"(asset_id|winning_asset_id)"\s*:\s*(\d{17,})(?=\s*[,\]}])/g,
    '"$1":"$2"'
  );
  return JSON.parse(fixed);
}

/** Normalize token id for map lookup; never trust unsafe JSON number ids. */
export function normalizeClobAssetId(v) {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t || null;
  }
  if (typeof v === "bigint") return String(v);
  if (typeof v === "number" && Number.isInteger(v) && Number.isSafeInteger(v)) return String(v);
  return null;
}

export function nowMs() {
  return Date.now();
}

/** @param {unknown} v */
export function intOrNone(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return parseInt(v, 10);
  return null;
}

/** @param {unknown} v */
export function coerceFloat(v) {
  if (v == null || typeof v === "boolean") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** @param {Record<string, unknown>} bookObj */
export function bestBidAskFromBook(bookObj) {
  const bids = /** @type {unknown[]} */ (bookObj.bids ?? []);
  const asks = /** @type {unknown[]} */ (bookObj.asks ?? []);
  let bestBid = null;
  let bestAsk = null;
  for (const row of bids) {
    let p = null;
    if (row && typeof row === "object" && "price" in row) p = /** @type {any} */ (row).price;
    else if (Array.isArray(row) && row.length) p = row[0];
    const pf = coerceFloat(p);
    if (pf != null) bestBid = bestBid == null ? pf : Math.max(bestBid, pf);
  }
  for (const row of asks) {
    let p = null;
    if (row && typeof row === "object" && "price" in row) p = /** @type {any} */ (row).price;
    else if (Array.isArray(row) && row.length) p = row[0];
    const pf = coerceFloat(p);
    if (pf != null) bestAsk = bestAsk == null ? pf : Math.min(bestAsk, pf);
  }
  return { bestBid, bestAsk };
}

/** @param {unknown} msgObj @returns {Record<string, unknown>[]} */
export function extractEvents(msgObj) {
  if (msgObj && typeof msgObj === "object" && !Array.isArray(msgObj)) return [/** @type {Record<string, unknown>} */ (msgObj)];
  if (Array.isArray(msgObj)) return msgObj.filter((x) => x && typeof x === "object");
  return [];
}

/**
 * @param {Record<string, unknown>} ev
 * @returns {Array<{ assetId: string, bid: number | null, ask: number | null, tsMs: number }>}
 */
export function parseQuoteUpdates(ev) {
  /** @type {Array<{ assetId: string, bid: number | null, ask: number | null, tsMs: number }>} */
  const out = [];
  function normalizeEpochMs(n) {
    if (n == null) return null;
    // Polymarket fields can show seconds; charts/store expect ms.
    if (n < 1e11) return n * 1000;
    // Guard for microseconds if they appear.
    if (n > 1e14) return Math.trunc(n / 1000);
    return n;
  }
  const tsMs = normalizeEpochMs(intOrNone(ev.timestamp) ?? intOrNone(ev.ts)) ?? nowMs();

  function push(assetId, bid, ask, ts) {
    const aid = normalizeClobAssetId(assetId);
    if (!aid) return;
    const bb = coerceFloat(bid);
    const ba = coerceFloat(ask);
    if (bb == null && ba == null) return;
    out.push({ assetId: aid, bid: bb, ask: ba, tsMs: ts ?? tsMs });
  }

  const pcs = ev.price_changes;
  const hasPcs = Array.isArray(pcs) && pcs.length > 0;
  if (hasPcs) {
    /** @type {Map<string, { bid: number | null, ask: number | null, tsMs: number }>} */
    const merged = new Map();
    for (const row of pcs) {
      if (!row || typeof row !== "object") continue;
      const aidRaw = /** @type {any} */ (row).asset_id;
      const aid = normalizeClobAssetId(aidRaw);
      if (!aid) continue;
      const rowTs = normalizeEpochMs(intOrNone(/** @type {any} */ (row).timestamp)) ?? tsMs;
      const bbr = coerceFloat(/** @type {any} */ (row).best_bid);
      const bar = coerceFloat(/** @type {any} */ (row).best_ask);
      let cur = merged.get(aid);
      if (!cur) cur = { bid: null, ask: null, tsMs: rowTs };
      if (bbr != null) cur.bid = bbr;
      if (bar != null) cur.ask = bar;
      cur.tsMs = rowTs;
      merged.set(aid, cur);
    }
    for (const [aid, cur] of merged) {
      push(aid, cur.bid, cur.ask, cur.tsMs);
    }
  }

  if ("asset_id" in ev && ("bids" in ev || "asks" in ev)) {
    const { bestBid, bestAsk } = bestBidAskFromBook(ev);
    if (bestBid != null || bestAsk != null) {
      push(ev.asset_id, bestBid, bestAsk, tsMs);
    }
  }

  // Parent-level bid/ask often duplicates `price_changes` or carries only one side; applying
  // one-sided updates makes bid/ask drift away from the platform over time.
  if (!hasPcs) {
    const bb = coerceFloat(ev.best_bid);
    const ba = coerceFloat(ev.best_ask);
    if (bb != null && ba != null) push(ev.asset_id, bb, ba, tsMs);
    const b1 = coerceFloat(ev.bid);
    const a1 = coerceFloat(ev.ask);
    if (b1 != null && a1 != null) push(ev.asset_id, b1, a1, tsMs);
  }
  return out;
}
