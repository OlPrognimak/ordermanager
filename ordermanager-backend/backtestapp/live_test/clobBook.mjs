/**
 * Public CLOB REST order book (authoritative snapshot vs incremental WS deltas).
 * https://docs.polymarket.com/api-reference/market-data/get-order-book
 */

import { bestBidAskFromBook } from "./quoteParse.mjs";

const BOOK_URL = "https://clob.polymarket.com/book";

/**
 * @param {string} tokenId
 * @returns {Promise<{ bestBid: number | null, bestAsk: number | null } | null>}
 */
export async function fetchClobBookTop(tokenId) {
  const id = String(tokenId ?? "").trim();
  if (!id) return null;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(`${BOOK_URL}?token_id=${encodeURIComponent(id)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "live_test/1.0 (+https://github.com)",
      },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return bestBidAskFromBook(/** @type {Record<string, unknown>} */ (data));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
