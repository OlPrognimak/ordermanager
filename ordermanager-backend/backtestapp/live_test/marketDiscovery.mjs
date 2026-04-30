/**
 * CLOB time, Gamma slug/list, token ids for BTC up/down 5m markets.
 * https://docs.polymarket.com/market-data/websocket/market-channel (market ids from Gamma)
 */

const GAMMA_URL = "https://gamma-api.polymarket.com/markets";
const GAMMA_MARKET_BY_SLUG_URL = "https://gamma-api.polymarket.com/markets/slug";
const CLOB_TIME_URL = "https://clob.polymarket.com/time";

const gammaHeaders = {
  "User-Agent": "live_test/1.0 (+https://github.com)",
  Accept: "application/json",
};

/** @param {number} unixSeconds @returns {number} */
export function slugTime(unixSeconds) {
  return Math.floor(unixSeconds / 300) * 300;
}

export async function fetchClobTimeSeconds() {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(CLOB_TIME_URL, {
      headers: { Accept: "text/plain", "User-Agent": gammaHeaders["User-Agent"] },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const raw = (await res.text()).trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** @param {unknown} v @returns {string | null} */
function assetIdStr(v) {
  if (v == null || typeof v === "boolean") return null;
  if (typeof v === "number" && Number.isInteger(v)) return String(v);
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  return null;
}

/** @param {unknown} value */
function jsonListField(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** @param {Record<string, unknown>} market */
function extractAssetIds(market) {
  let yesId = null;
  let noId = null;
  const tokens = market.tokens;
  if (Array.isArray(tokens)) {
    for (const t of tokens) {
      if (!t || typeof t !== "object") continue;
      const outcome = String(t.outcome ?? "")
        .trim()
        .toLowerCase();
      const tid = assetIdStr(t.token_id ?? t.asset_id ?? t.clobTokenId);
      if (!tid) continue;
      if (outcome === "yes" || outcome === "up") yesId = tid;
      else if (outcome === "no" || outcome === "down") noId = tid;
    }
  }
  if (yesId && noId) return { yesId, noId };

  const rawIds = jsonListField(market.clobTokenIds);
  const strIds = rawIds.map((x) => assetIdStr(x)).filter(Boolean);
  if (strIds.length < 2) return { yesId, noId };

  const outs = jsonListField(market.outcomes).map((x) =>
    String(x ?? "")
      .trim()
      .toLowerCase()
  );
  if (outs.length >= 2 && strIds.length >= 2) {
    const [o0, o1] = outs;
    if ((o0 === "yes" || o0 === "up") && (o1 === "no" || o1 === "down")) return { yesId: strIds[0], noId: strIds[1] };
    if ((o0 === "no" || o0 === "down") && (o1 === "yes" || o1 === "up")) return { yesId: strIds[1], noId: strIds[0] };
  }
  return { yesId: strIds[0], noId: strIds[1] };
}

const slugPat = /^btc-updown-5m-\d+$/;

/**
 * @param {number} [limit]
 * @returns {Promise<Array<{ question: string, slug: string, yesAssetId: string, noAssetId: string }>>}
 */
export async function discoverBtcUpdown5mMarkets(limit = 500) {
  const q = new URLSearchParams({
    active: "true",
    closed: "false",
    limit: String(Math.max(1, limit | 0)),
  });
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 20_000);
  let data;
  try {
    const res = await fetch(`${GAMMA_URL}?${q}`, { headers: gammaHeaders, signal: ac.signal });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  } finally {
    clearTimeout(to);
  }
  const rows = Array.isArray(data) ? data : [];
  const out = [];
  for (const m of rows) {
    if (!m || typeof m !== "object") continue;
    const question = String(m.question ?? m.title ?? "").trim();
    const slug = String(m.slug ?? "").trim();
    const blob = question.toLowerCase();
    const slugMatch = slugPat.test(slug);
    const textMatch =
      blob.includes("bitcoin") &&
      (blob.includes("up or down") || blob.includes("up/down")) &&
      (blob.includes("5 minute") || blob.includes("5m"));
    if (!slugMatch && !textMatch) continue;
    const { yesId, noId } = extractAssetIds(/** @type {Record<string, unknown>} */ (m));
    if (!yesId || !noId) continue;
    out.push({ question: question || "?", slug, yesAssetId: yesId, noAssetId: noId });
  }
  return out;
}

/** @param {string} slug */
export async function fetchGammaMarketBySlug(slug) {
  const enc = encodeURIComponent(String(slug).trim());
  if (!enc) return null;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(`${GAMMA_MARKET_BY_SLUG_URL}/${enc}`, {
      headers: gammaHeaders,
      signal: ac.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === "object" ? /** @type {Record<string, unknown>} */ (data) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** @param {Record<string, unknown>} market */
export function marketDictToDiscovered(market) {
  const { yesId, noId } = extractAssetIds(market);
  if (!yesId || !noId) return null;
  const slug = String(market.slug ?? "").trim();
  const question = String(market.question ?? market.title ?? "").trim();
  return {
    question: question || "?",
    slug: slug || "?",
    yesAssetId: yesId,
    noAssetId: noId,
  };
}

/**
 * @param {object} opts
 * @param {number} [opts.limit]
 * @param {string} [opts.slugPrefix]
 * @param {string | null} [opts.exactSlug]
 */
export async function discoverBestBtcUpdown5mMarket(opts = {}) {
  const limit = opts.limit ?? 500;
  const slugPrefix = opts.slugPrefix ?? "btc-updown-5m-";
  const exactSlug = opts.exactSlug?.trim() || null;

  /** @param {string} s */
  async function trySlug(s) {
    const m = await fetchGammaMarketBySlug(s);
    if (!m || m.closed === true) return null;
    return marketDictToDiscovered(m);
  }

  const exact = exactSlug;
  if (exact) {
    const hit = await trySlug(exact);
    if (hit) return hit;
  }

  function slugFamily(centerSlotS) {
    const out = [];
    for (const delta of [0, -300, 300, -600, 600]) {
      const s = `${slugPrefix}${centerSlotS + delta}`;
      if (exact && s === exact) continue;
      if (!out.includes(s)) out.push(s);
    }
    return out;
  }

  const tried = new Set();

  /** @param {string[]} slugs */
  async function walk(slugs) {
    for (const s of slugs) {
      if (tried.has(s)) continue;
      tried.add(s);
      const hit = await trySlug(s);
      if (hit) return hit;
    }
    return null;
  }

  const localSlot = Math.floor(Date.now() / 1000 / 300) * 300;
  let hit = await walk(slugFamily(localSlot));
  if (hit) return hit;

  const clobTimeS = await fetchClobTimeSeconds();
  if (clobTimeS != null) {
    const clobSlot = Math.floor(clobTimeS / 300) * 300;
    const extra = slugFamily(clobSlot).filter((s) => !tried.has(s));
    hit = await walk(extra);
    if (hit) return hit;
  }

  const slotEpochS = clobTimeS != null ? Math.floor(clobTimeS / 300) * 300 : localSlot;

  const rows = await discoverBtcUpdown5mMarkets(limit);
  if (exact) {
    const r = rows.find((x) => x.slug === exact);
    if (r) return r;
  }
  const targetSlug = `${slugPrefix}${slotEpochS}`;
  const byTarget = rows.find((x) => x.slug === targetSlug);
  if (byTarget) return byTarget;
  for (const delta of [-300, 300]) {
    const alt = `${slugPrefix}${slotEpochS + delta}`;
    const r = rows.find((x) => x.slug === alt);
    if (r) return r;
  }
  const pref = rows.filter((r) => slugPrefix && r.slug.startsWith(slugPrefix));
  return pref[0] ?? rows[0] ?? null;
}
