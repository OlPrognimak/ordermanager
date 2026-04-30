#!/usr/bin/env node
/**
 * BTC spot price feed over a public exchange WebSocket (Binance by default).
 * Logs wall-clock receive time + exchange event time so you can compare cadence
 * and latency vs Polymarket up/down ticks (same machine recommended).
 *
 * Usage:
 *   node btcSpotWs.mjs
 *   node btcSpotWs.mjs --out results/btc_book.ndjson
 *   # Same folder as live_test session (dashboard overlays BTC on rounds):
 *   node btcSpotWs.mjs --quiet --out results/20260416_120446/btc_spot.ndjson
 *   node btcSpotWs.mjs --stream trade
 *
 * NDJSON fields (bookTicker):
 *   { type, symbol, recv_ms, exchange_ms, ingress_ms, bid, ask, recv_perf_ms }
 * ingress_ms = recv_ms - exchange_ms (can be negative if clock skew).
 *
 * By default a line is written only when bid or ask (bookTicker) or trade price
 * (trade stream) changes vs the previous stored row — fewer duplicate rows.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import WebSocket from "ws";

const BINANCE_WS = "wss://stream.binance.com:9443/ws";

function parseArgs(argv) {
  const out = { stream: "bookTicker", symbol: "btcusdt", out: null, quiet: false, everyTick: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--every-tick") {
      out.everyTick = true;
    } else if (a === "--out" && argv[i + 1]) {
      out.out = argv[++i];
    } else if (a === "--symbol" && argv[i + 1]) {
      out.symbol = String(argv[++i]).toLowerCase().replace("/", "");
    } else if (a === "--stream" && argv[i + 1]) {
      const s = String(argv[++i]).toLowerCase();
      if (s !== "bookticker" && s !== "trade") {
        console.error("Unknown --stream (use bookTicker or trade)");
        process.exit(1);
      }
      out.stream = s === "bookticker" ? "bookTicker" : "trade";
    } else if (a === "--quiet") {
      out.quiet = true;
    } else if (a === "-h" || a === "--help") {
      console.log(`btcSpotWs.mjs — Binance spot WebSocket BTC feed for latency analysis

Options:
  --symbol btcusdt     Stream symbol (default btcusdt)
  --stream bookTicker  bookTicker (best bid/ask, default) | trade (last trades)
  --out PATH           Append NDJSON lines to PATH (creates parent dirs)
  --quiet              Only write --out, minimal stderr
  --every-tick         Log every message (default: only when bid/ask or trade price changes)
`);
      process.exit(0);
    }
  }
  return out;
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const opts = parseArgs(process.argv);
  const sym = opts.symbol.toLowerCase();
  const streamPath = `${sym}@${opts.stream}`;
  const url = `${BINANCE_WS}/${streamPath}`;

  let outStream = null;
  if (opts.out) {
    ensureDirForFile(opts.out);
    outStream = fs.createWriteStream(opts.out, { flags: "a" });
  }

  const t0 = performance.now();

  const writeLine = (obj) => {
    const line = `${JSON.stringify(obj)}\n`;
    if (outStream) outStream.write(line);
    if (!opts.quiet) process.stdout.write(line);
  };

  if (!opts.quiet) {
    console.error(`[btc-spot] connecting ${url}`);
  }

  const ws = new WebSocket(url);
  /** @type {string | null} */
  let lastBookBidAskKey = null;
  /** @type {string | null} */
  let lastTradePriceKey = null;

  ws.on("open", () => {
    if (!opts.quiet) console.error("[btc-spot] open");
  });

  ws.on("message", (buf) => {
    const recvMs = Date.now();
    const recvPerf = performance.now() - t0;
    let raw;
    try {
      raw = JSON.parse(buf.toString("utf8"));
    } catch {
      return;
    }

    const exchangeMs =
      typeof raw.E === "number" && Number.isFinite(raw.E)
        ? raw.E
        : typeof raw.T === "number" && Number.isFinite(raw.T)
          ? raw.T
          : null;
    const ingressMs = exchangeMs != null ? recvMs - exchangeMs : null;

    if (opts.stream === "bookTicker") {
      const bidStr = raw.b != null ? String(raw.b) : "";
      const askStr = raw.a != null ? String(raw.a) : "";
      if (!bidStr && !askStr) return;
      const bookKey = `${bidStr}\t${askStr}`;
      if (!opts.everyTick && bookKey === lastBookBidAskKey) return;
      lastBookBidAskKey = bookKey;
      const bid = raw.b != null ? Number(raw.b) : null;
      const ask = raw.a != null ? Number(raw.a) : null;
      writeLine({
        type: "bookTicker",
        symbol: raw.s ?? sym.toUpperCase(),
        recv_ms: recvMs,
        exchange_ms: exchangeMs,
        ingress_ms: ingressMs,
        bid,
        ask,
        recv_perf_ms: Math.round(recvPerf * 1000) / 1000,
      });
    } else {
      const priceStr = raw.p != null ? String(raw.p) : "";
      if (!priceStr) return;
      if (!opts.everyTick && priceStr === lastTradePriceKey) return;
      lastTradePriceKey = priceStr;
      const price = raw.p != null ? Number(raw.p) : null;
      writeLine({
        type: "trade",
        symbol: raw.s ?? sym.toUpperCase(),
        recv_ms: recvMs,
        exchange_ms: exchangeMs,
        ingress_ms: ingressMs,
        price,
        qty: raw.q != null ? Number(raw.q) : null,
        buyer_maker: raw.m === true,
        recv_perf_ms: Math.round(recvPerf * 1000) / 1000,
      });
    }
  });

  ws.on("close", (code, reason) => {
    if (!opts.quiet) {
      console.error(`[btc-spot] close code=${code} reason=${reason?.toString?.() ?? ""}`);
    }
    outStream?.end();
    process.exit(code === 1000 ? 0 : 1);
  });

  ws.on("error", (err) => {
    console.error("[btc-spot] error", err?.message ?? err);
  });

  const shutdown = () => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
