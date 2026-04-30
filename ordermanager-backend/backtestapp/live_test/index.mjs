#!/usr/bin/env node
/**
 * Polymarket CLOB market WS + mike_v1-style detector + NDJSON (Node 18+).
 * Market channel: https://docs.polymarket.com/market-data/websocket/market-channel
 */

import { spawn } from "node:child_process";
import { on } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { fetchClobBookTop } from "./clobBook.mjs";
import { discoverBestBtcUpdown5mMarket } from "./marketDiscovery.mjs";
import { LiveMikeV1 } from "./liveMikeV1.mjs";
import { extractEvents, nowMs, parsePolymarketMarketWsJson, parseQuoteUpdates } from "./quoteParse.mjs";

const WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const BTC_WS_ROOT = "wss://stream.binance.com:9443/ws";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function marketLabel(m) {
  const bits = [m.question.trim()];
  if (m.slug) bits.push(`slug=${m.slug}`);
  return bits.filter(Boolean).join(" | ");
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = {
    yesAssetId: process.env.YES_ASSET_ID ?? "",
    noAssetId: process.env.NO_ASSET_ID ?? "",
    autoDiscover: true,
    assetRefreshSeconds: 60,
    marketSlugPrefix: "btc-updown-5m-",
    marketSlug: "",
    wsOpenTimeoutMs: Math.max(10_000, Number(process.env.WS_OPEN_TIMEOUT ?? 60) * 1000),
    orderQty: 20,
    span: 20,
    noiseFilter: "gaussian",
    quoteStructuralHysteresisCents: 1,
    sustainedTangentMs: 300,
    valleyMaxRawAskCents: 48,
    valleyToPeakRawSpreadMinCents: 5,
    extremaLocationMode: "spread_anchored",
    winddownLastMs: 10_000,
    /** 0 = off. Otherwise interval (seconds) for GET /book snapshot to correct WS merge drift. */
    bookReconcileSeconds: Math.max(0, Number(process.env.BOOK_RECONCILE_SECONDS ?? 45)),
    detectorDebug: process.env.DET_DEBUG === "1",
    /** Spawn btcSpotWs.mjs writing <session>/btc_spot.ndjson (same clock as live quotes). */
    withBtc: process.env.WITH_BTC === "1",
    /** Reduce hot-path load: no in-progress round snapshots, no per-tick tick/point persistence. */
    lowLatencyMode: process.env.LOW_LATENCY === "1",
  };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === "--with-btc") out.withBtc = true;
    else if (x === "--low-latency") out.lowLatencyMode = true;
    else if (x === "--no-auto-discover-assets") out.autoDiscover = false;
    else if (x === "--yes-asset-id") out.yesAssetId = a[++i] ?? "";
    else if (x === "--no-asset-id") out.noAssetId = a[++i] ?? "";
    else if (x === "--asset-refresh-seconds") out.assetRefreshSeconds = Math.max(10, Number(a[++i]) || 60);
    else if (x === "--market-slug-prefix") out.marketSlugPrefix = a[++i] ?? out.marketSlugPrefix;
    else if (x === "--market-slug") out.marketSlug = a[++i] ?? "";
    else if (x === "--ws-open-timeout") out.wsOpenTimeoutMs = Math.max(10_000, Number(a[++i]) * 1000) || out.wsOpenTimeoutMs;
    else if (x === "--order-qty") out.orderQty = Number(a[++i]) || out.orderQty;
    else if (x === "--span") out.span = Number(a[++i]) || out.span;
    else if (x === "--noise-filter") out.noiseFilter = a[++i] ?? out.noiseFilter;
    else if (x === "--quote-structural-hysteresis-cents")
      out.quoteStructuralHysteresisCents = Number(a[++i]) ?? out.quoteStructuralHysteresisCents;
    else if (x === "--sustained-tangent-ms") out.sustainedTangentMs = Number(a[++i]) || out.sustainedTangentMs;
    else if (x === "--tangent") out.sustainedTangentMs = Number(a[++i]) || out.sustainedTangentMs;
    else if (x === "--valley-max-raw-ask-cents") out.valleyMaxRawAskCents = Number(a[++i]) ?? out.valleyMaxRawAskCents;
    else if (x === "--valley-to-peak-raw-spread-min-cents")
      out.valleyToPeakRawSpreadMinCents = Number(a[++i]) ?? out.valleyToPeakRawSpreadMinCents;
    else if (x === "--det-debug") out.detectorDebug = true;
    else if (x === "--extrema-location-mode") out.extremaLocationMode = a[++i] ?? out.extremaLocationMode;
    else if (x === "--winddown-last-ms") out.winddownLastMs = Number(a[++i]) || out.winddownLastMs;
    else if (x === "--book-reconcile-seconds") out.bookReconcileSeconds = Math.max(0, Number(a[++i]) || 0);
  }
  return out;
}

/** Pull full top-of-book from REST so local state cannot drift from missed/stale WS deltas. */
async function reconcileBooksFromRest(app) {
  const yes = app.yesAssetId;
  const no = app.noAssetId;
  if (!yes || !no) return;
  try {
    const [yBook, nBook] = await Promise.all([fetchClobBookTop(yes), fetchClobBookTop(no)]);
    if (yBook == null && nBook == null) return;
    app.applyRestBookSnapshot(yBook, nBook, nowMs());
  } catch (e) {
    console.error(`[live] REST book reconcile: ${e}`);
  }
}

async function maybeDiscoverMarket(slugPrefix, exactSlug) {
  try {
    return await discoverBestBtcUpdown5mMarket({
      limit: 500,
      slugPrefix,
      exactSlug: exactSlug?.trim() || null,
    });
  } catch (e) {
    console.error(`[live] market discovery error: ${e}`);
    return null;
  }
}

function coerceStrIdList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s);
      return Array.isArray(p) ? p.map((x) => String(x).trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function slugSlotEpoch(slug, prefix) {
  const s = String(slug).trim();
  if (!s.startsWith(prefix)) return null;
  const tail = s.slice(prefix.length);
  return /^\d+$/.test(tail) ? parseInt(tail, 10) : null;
}

/** Current Polymarket-style 5m slot start (unix seconds), aligned to CLOB `floor(t/300)*300`. */
function wallSlotEpochSeconds() {
  return Math.floor(Date.now() / 1000 / 300) * 300;
}

/** True when local wall clock is already in a newer 5m slot than the slug we are still tracking. */
function slugBehindWallClock(slug, slugPrefix) {
  const ep = slugSlotEpoch(String(slug).trim(), slugPrefix);
  if (ep == null) return false;
  return wallSlotEpochSeconds() > ep;
}

/** Wall-clock time left in the 5m window implied by `slug` (slot start = slug epoch seconds). */
function streamRemainingMmSs(slug, slugPrefix, atMs) {
  const ep = slugSlotEpoch(String(slug).trim(), slugPrefix);
  if (ep == null) return "—";
  const windowMs = 5 * 60 * 1000;
  const endMs = ep * 1000 + windowMs;
  const rem = Math.max(0, endMs - atMs);
  const sec = Math.floor(rem / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * @param {Record<string, unknown>} ev
 * @param {LiveMikeV1} app
 */
function wsEventTriggersImmediateRediscover(ev, app, slugPrefix, exactSlug) {
  if (exactSlug) return false;
  const et = String(ev.event_type ?? ev.type ?? "")
    .trim()
    .toLowerCase();
  const curSlug = (app.currentMarketSlug || "").trim();
  const { yesAssetId: yesId, noAssetId: noId } = app;

  if (et === "market_resolved") {
    const evSlug = String(ev.slug ?? "").trim();
    if (evSlug && curSlug && evSlug === curSlug) return true;
    const ids = new Set([
      ...coerceStrIdList(ev.assets_ids),
      ...coerceStrIdList(ev.clob_token_ids),
      ...coerceStrIdList(ev.clobTokenIds),
    ]);
    if (ids.has(yesId) || ids.has(noId)) return true;
    const win = String(ev.winning_asset_id ?? "").trim();
    if (win && (win === yesId || win === noId)) return true;
    return false;
  }
  if (et === "new_market") {
    const evSlug = String(ev.slug ?? "").trim();
    if (!evSlug.startsWith(slugPrefix)) return false;
    const newEp = slugSlotEpoch(evSlug, slugPrefix);
    if (newEp == null) return false;
    const curEp = curSlug ? slugSlotEpoch(curSlug, slugPrefix) : null;
    if (curEp == null) return evSlug !== curSlug;
    return newEp > curEp;
  }
  return false;
}

async function openWsWithRetries(openTimeoutMs) {
  let lastErr;
  for (let hsTry = 0; hsTry < 3; hsTry++) {
    try {
      const ws = await new Promise((resolve, reject) => {
        const w = new WebSocket(WS_URL, {
          handshakeTimeout: openTimeoutMs,
          perMessageDeflate: false,
          headers: { "User-Agent": "live_test/1.0 (+https://github.com)" },
        });
        w.once("open", () => resolve(w));
        w.once("error", reject);
      });
      return ws;
    } catch (e) {
      lastErr = e;
      const msg = String(e).toLowerCase();
      const transient =
        msg.includes("handshake") || msg.includes("opening") || msg.includes("timed out") || msg.includes("timeout");
      if (transient && hsTry < 2) {
        const waitS = 1.5 * (hsTry + 1);
        console.log(`[live] ws connect failed (${String(e)}); retry in ${waitS.toFixed(1)}s`);
        await new Promise((r) => setTimeout(r, waitS * 1000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error("ws connect failed");
}

/**
 * Keep a lightweight BTC/USDT mid stream alive and feed app strategy state.
 * Returns a stop() function.
 * @param {LiveMikeV1} app
 */
function startBtcMidLoop(app) {
  let stopped = false;
  /** @type {WebSocket | null} */
  let ws = null;
  const url = `${BTC_WS_ROOT}/btcusdt@bookTicker`;
  const loop = async () => {
    while (!stopped) {
      try {
        ws = await new Promise((resolve, reject) => {
          const w = new WebSocket(url, {
            handshakeTimeout: 15_000,
            perMessageDeflate: false,
            headers: { "User-Agent": "live_test/1.0 (+https://github.com)" },
          });
          w.once("open", () => resolve(w));
          w.once("error", reject);
        });
        for await (const [data] of on(ws, "message")) {
          let o;
          try {
            o = JSON.parse(data.toString());
          } catch {
            continue;
          }
          const b = Number(o?.b);
          const a = Number(o?.a);
          if (!Number.isFinite(b) && !Number.isFinite(a)) continue;
          const mid = Number.isFinite(b) && Number.isFinite(a) ? (b + a) / 2 : Number.isFinite(b) ? b : a;
          const t =
            typeof o?.E === "number" && Number.isFinite(o.E)
              ? o.E
              : typeof o?.T === "number" && Number.isFinite(o.T)
                ? o.T
                : Date.now();
          app.onBtcMidUpdate(mid, t);
        }
      } catch (e) {
        if (!stopped) console.error(`[live] btc stream reconnecting: ${String(e)}`);
      } finally {
        try {
          ws?.terminate();
        } catch {
          /* ignore */
        }
        ws = null;
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 1000));
    }
  };
  void loop();
  return () => {
    stopped = true;
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
  };
}

/** @param {number | null | undefined} v */
function streamPxSlot(v) {
  if (v == null || typeof v !== "number" || !Number.isFinite(v)) return "";
  return Number(v).toFixed(4);
}

/**
 * Fingerprint of current up/down top-of-book.
 * Used only for console logging cadence.
 */
function streamQuoteStateKey(y, n) {
  return [streamPxSlot(y?.ask), streamPxSlot(y?.bid), streamPxSlot(n?.ask), streamPxSlot(n?.bid)].join(",");
}

function streamHasAnyQuote(y, n) {
  return [y?.ask, y?.bid, n?.ask, n?.bid].some((v) => v != null && typeof v === "number" && Number.isFinite(v));
}

/** @param {number | null | undefined} v */
function streamPxLog(v) {
  return v != null && typeof v === "number" && Number.isFinite(v) ? Number(v).toFixed(4) : "-";
}

async function runWsLoop(app, opts) {
  let nextRefresh = 0;
  /** @type {string | null} */
  let lastStreamQuotes = null;
  /** Throttle clock-based rollover discovery (ms since epoch). */
  let lastSlotRollAttemptMs = 0;
  const slugPrefix = opts.marketSlugPrefix;
  const exactSlug = opts.marketSlug.trim() || null;

  while (true) {
    try {
      const nowS = Date.now() / 1000;
      if (
        opts.autoDiscover &&
        (!app.yesAssetId || !app.noAssetId || nowS >= nextRefresh)
      ) {
        const found = await maybeDiscoverMarket(slugPrefix, exactSlug);
        nextRefresh = Date.now() / 1000 + Math.max(10, opts.assetRefreshSeconds);
        if (
          found &&
          (found.yesAssetId !== app.yesAssetId || found.noAssetId !== app.noAssetId)
        ) {
          app.switchMarket({
            yesAssetId: found.yesAssetId,
            noAssetId: found.noAssetId,
            marketLabel: marketLabel(found),
            marketSlug: found.slug,
          });
          lastStreamQuotes = null;
          console.log(
            `[live] switched market slug=${found.slug} -> YES=${found.yesAssetId} NO=${found.noAssetId}`
          );
        }
      }
      if (!app.yesAssetId || !app.noAssetId) {
        console.log("[live] waiting for discovered asset ids...");
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const sub = {
        type: "market",
        assets_ids: [app.yesAssetId, app.noAssetId],
        custom_feature_enabled: true,
      };

      const ws = await openWsWithRetries(opts.wsOpenTimeoutMs);
      /** @type {ReturnType<typeof setInterval> | null} */
      let clockTid = null;
      /** @type {ReturnType<typeof setInterval> | null} */
      let reconcileTid = null;
      try {
        ws.send(JSON.stringify(sub));
        console.log(`[live] connected to ${WS_URL} assets=${JSON.stringify(sub.assets_ids)}`);
        lastStreamQuotes = null;

        if (opts.bookReconcileSeconds > 0) {
          reconcileTid = setInterval(() => {
            void reconcileBooksFromRest(app);
          }, opts.bookReconcileSeconds * 1000);
          void reconcileBooksFromRest(app);
        }

        // When the book goes quiet at window end, WS lifecycle events can be late; wall clock
        // still advances every 300s — poll so we discover the next slug without waiting for refresh.
        clockTid = setInterval(() => {
          void (async () => {
            try {
              if (!opts.autoDiscover || exactSlug) return;
              const sl = (app.currentMarketSlug || "").trim();
              if (!sl || sl === "unknown") return;
              if (!slugBehindWallClock(sl, slugPrefix)) return;
              const t = Date.now();
              if (t - lastSlotRollAttemptMs < 650) return;
              lastSlotRollAttemptMs = t;
              console.log("[live] wall-clock past current slug window; discovering next market…");
              const found = await maybeDiscoverMarket(slugPrefix, exactSlug);
              nextRefresh = Date.now() / 1000 + Math.max(10, opts.assetRefreshSeconds);
              if (
                found &&
                (found.yesAssetId !== app.yesAssetId || found.noAssetId !== app.noAssetId)
              ) {
                app.switchMarket({
                  yesAssetId: found.yesAssetId,
                  noAssetId: found.noAssetId,
                  marketLabel: marketLabel(found),
                  marketSlug: found.slug,
                });
                lastStreamQuotes = null;
                console.log(
                  `[live] rolled forward (wall-clock) slug=${found.slug} -> YES=${found.yesAssetId} NO=${found.noAssetId}`
                );
                ws.close();
              }
            } catch (e) {
              console.error("[live] clock rollover error:", e);
            }
          })();
        }, 500);

        reconnect: for await (const [data] of on(ws, "message")) {
          let msgObj;
          try {
            msgObj = parsePolymarketMarketWsJson(data.toString());
          } catch {
            continue;
          }
          const tNow = nowMs();
          let reconnectWs = false;
          for (const ev of extractEvents(msgObj)) {
            if (
              opts.autoDiscover &&
              !exactSlug &&
              wsEventTriggersImmediateRediscover(ev, app, slugPrefix, exactSlug)
            ) {
              const et = String(ev.event_type ?? ev.type ?? "");
              console.log(`[live] ws ${et}: discovering next market…`);
              const found = await maybeDiscoverMarket(slugPrefix, exactSlug);
              nextRefresh = Date.now() / 1000 + Math.max(10, opts.assetRefreshSeconds);
              if (
                found &&
                (found.yesAssetId !== app.yesAssetId || found.noAssetId !== app.noAssetId)
              ) {
                app.switchMarket({
                  yesAssetId: found.yesAssetId,
                  noAssetId: found.noAssetId,
                  marketLabel: marketLabel(found),
                  marketSlug: found.slug,
                });
                lastStreamQuotes = null;
                console.log(
                  `[live] rolled forward slug=${found.slug} -> YES=${found.yesAssetId} NO=${found.noAssetId}`
                );
                reconnectWs = true;
                break;
              }
            }
            for (const { assetId, bid, ask, tsMs } of parseQuoteUpdates(ev)) {
              app.onQuoteUpdate(assetId, bid, ask, tsMs);
            }
          }
          if (reconnectWs) {
            ws.close();
            break;
          }
          const slug = (app.currentMarketSlug || "unknown").trim() || "unknown";
          const y = app.quoteByAsset[app.yesAssetId];
          const n = app.quoteByAsset[app.noAssetId];
          const yAsk = y?.ask;
          const yBid = y?.bid;
          const nAsk = n?.ask;
          const nBid = n?.bid;
          const anyNeg =
            [yAsk, yBid, nAsk, nBid].some((v) => typeof v === "number" && Number.isFinite(v) && v < 0);
          const allZero =
            [yAsk, yBid, nAsk, nBid].every((v) => typeof v === "number" && Number.isFinite(v) && v === 0);
          const isZero = (v) => typeof v === "number" && Number.isFinite(v) && v === 0;
          const isOneCent = (v) =>
            typeof v === "number" && Number.isFinite(v) && Math.abs(v - 0.01) < 1e-6;
          const oneCentOppZero =
            (isOneCent(yAsk) && isZero(nAsk)) ||
            (isOneCent(nAsk) && isZero(yAsk)) ||
            (isOneCent(yBid) && isZero(nBid)) ||
            (isOneCent(nBid) && isZero(yBid));
          const key = streamQuoteStateKey(y, n);
          if (!anyNeg && !allZero && !oneCentOppZero && streamHasAnyQuote(y, n) && key !== lastStreamQuotes) {
            lastStreamQuotes = key;
            const yTs = Number(y?.ts_ms);
            const nTs = Number(n?.ts_ms);
            const wsTs =
              Number.isFinite(yTs) && Number.isFinite(nTs) ? Math.max(yTs, nTs) : Number.isFinite(yTs) ? yTs : nTs;
            const remaining = streamRemainingMmSs(slug, slugPrefix, tNow);
            console.log(
              `[stream] slug:${slug}, ${streamPxLog(y?.ask)}, ${streamPxLog(y?.bid)}, ` +
                `${streamPxLog(n?.ask)}, ${streamPxLog(n?.bid)}, remaining=${remaining}, ws_ts_ms=${
                  Number.isFinite(wsTs) ? String(wsTs) : "-"
                }`
            );
          }
          if (
            opts.autoDiscover &&
            !exactSlug &&
            slug !== "unknown" &&
            slugBehindWallClock(slug, slugPrefix) &&
            tNow - lastSlotRollAttemptMs >= 650
          ) {
            lastSlotRollAttemptMs = tNow;
            console.log("[live] wall-clock past current slug window; discovering next market…");
            const found = await maybeDiscoverMarket(slugPrefix, exactSlug);
            nextRefresh = Date.now() / 1000 + Math.max(10, opts.assetRefreshSeconds);
            if (
              found &&
              (found.yesAssetId !== app.yesAssetId || found.noAssetId !== app.noAssetId)
            ) {
              app.switchMarket({
                yesAssetId: found.yesAssetId,
                noAssetId: found.noAssetId,
                marketLabel: marketLabel(found),
                marketSlug: found.slug,
              });
              lastStreamQuotes = null;
              console.log(
                `[live] rolled forward (wall-clock) slug=${found.slug} -> YES=${found.yesAssetId} NO=${found.noAssetId}`
              );
              ws.close();
              break;
            }
          }
          if (opts.autoDiscover && Date.now() / 1000 >= nextRefresh) {
            const found = await maybeDiscoverMarket(slugPrefix, exactSlug);
            nextRefresh = Date.now() / 1000 + Math.max(10, opts.assetRefreshSeconds);
            if (
              found &&
              (found.yesAssetId !== app.yesAssetId || found.noAssetId !== app.noAssetId)
            ) {
              app.switchMarket({
                yesAssetId: found.yesAssetId,
                noAssetId: found.noAssetId,
                marketLabel: marketLabel(found),
                marketSlug: found.slug,
              });
              lastStreamQuotes = null;
              console.log(`[live] discovered new market slug=${found.slug}; reconnecting websocket...`);
              ws.close();
              break;
            }
          }
        }
      } finally {
        if (clockTid != null) clearInterval(clockTid);
        if (reconcileTid != null) clearInterval(reconcileTid);
        try {
          ws.terminate();
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error(`[live] websocket error: ${e}; reconnecting in 2s`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function sessionDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}${pad(d.getUTCSeconds())}`;
  return path.join(__dirname, "results", stamp);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.autoDiscover && (!args.yesAssetId || !args.noAssetId)) {
    console.error("Missing asset ids. Provide --yes-asset-id and --no-asset-id or use auto-discover.");
    process.exit(1);
  }

  const outDir = sessionDir();
  fs.mkdirSync(outDir, { recursive: true });

  /** @type {import("node:child_process").ChildProcess | null} */
  let btcChild = null;
  let btcStopExpected = false;
  if (args.withBtc) {
    const btcScript = path.join(__dirname, "btcSpotWs.mjs");
    const btcOut = path.join(outDir, "btc_spot.ndjson");
    btcChild = spawn(process.execPath, [btcScript, "--quiet", "--out", btcOut], {
      cwd: __dirname,
      stdio: ["ignore", "inherit", "inherit"],
    });
    btcChild.on("error", (e) => {
      console.error(`[live] failed to start BTC spot child: ${e?.message ?? e}`);
    });
    btcChild.on("exit", (code, sig) => {
      if (btcStopExpected) return;
      if (typeof code === "number" && code !== 0) {
        console.error(`[live] btc spot process exited code=${code} signal=${sig == null ? "" : sig}`);
      }
    });
    console.log(`[live] with-btc: logging to ${btcOut}`);
  }

  const app = new LiveMikeV1({
    yesAssetId: args.yesAssetId,
    noAssetId: args.noAssetId,
    outputDir: outDir,
    marketLabel: "manual",
    orderQty: args.orderQty,
    span: args.span,
    noiseFilter: args.noiseFilter,
    quoteStructuralHysteresisCents: args.quoteStructuralHysteresisCents,
    sustainedTangentMs: args.sustainedTangentMs,
    valleyMaxRawAskCents: args.valleyMaxRawAskCents,
    valleyToPeakRawSpreadMinCents: args.valleyToPeakRawSpreadMinCents,
    extremaLocationMode: args.extremaLocationMode,
    winddownLastMs: args.winddownLastMs,
    lowLatencyMode: args.lowLatencyMode,
    detectorDebug: false,
  });
  const stopBtcLoop = startBtcMidLoop(app);

  console.log(`[live] results dir: ${outDir}`);
  console.log(`[live] auto_discover_assets=${args.autoDiscover} refresh=${args.assetRefreshSeconds}s`);
  if (args.marketSlug) console.log(`[live] target market slug=${args.marketSlug}`);
  else console.log(`[live] preferred market slug prefix=${args.marketSlugPrefix}`);
  console.log(`[live] ws handshakeTimeout=${args.wsOpenTimeoutMs}ms (per ws lib)`);
  if (args.lowLatencyMode) {
    console.log("[live] low-latency mode: in-progress round snapshots OFF");
  }
  if (args.bookReconcileSeconds > 0) {
    console.log(`[live] REST book reconcile every ${args.bookReconcileSeconds}s (GET /book)`);
  }

  const shutdown = () => {
    try {
      stopBtcLoop();
    } catch {
      /* ignore */
    }
    if (btcChild && !btcChild.killed) {
      btcStopExpected = true;
      try {
        btcChild.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      btcChild = null;
    }
    void app
      .close()
      .catch(() => {
        /* ignore */
      })
      .finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await runWsLoop(app, args);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
