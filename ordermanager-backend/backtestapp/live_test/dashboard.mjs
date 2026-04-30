#!/usr/bin/env node
import http from "node:http";
import fs, { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { INDEX_HTML } from "./liveMikeV1.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = {
    host: "0.0.0.0",
    port: 8787,
    resultsRoot: process.env.RESULTS_ROOT || path.join(__dirname, "results"),
    session: process.env.RESULTS_SESSION || "",
    limit: Math.max(1, Number(process.env.ROUND_LIMIT ?? 200)),
    btcFile: process.env.BTC_NDJSON || "btc_spot.ndjson",
    btcMaxPoints: Math.max(500, Number(process.env.BTC_MAX_POINTS ?? 12_000)),
  };
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (x === "--host") out.host = a[++i] ?? out.host;
    else if (x === "--port") out.port = Number(a[++i]) || out.port;
    else if (x === "--results-root") out.resultsRoot = a[++i] ?? out.resultsRoot;
    else if (x === "--session") out.session = a[++i] ?? "";
    else if (x === "--limit") out.limit = Math.max(1, Number(a[++i]) || out.limit);
    else if (x === "--btc-file") out.btcFile = a[++i] ?? out.btcFile;
    else if (x === "--btc-max-points") out.btcMaxPoints = Math.max(500, Number(a[++i]) || out.btcMaxPoints);
  }
  return out;
}

function latestSession(resultsRoot) {
  try {
    const dirs = fs
      .readdirSync(resultsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    return dirs.at(-1) ?? "";
  } catch {
    return "";
  }
}

function readRounds(resultsRoot, wantedSession, limit) {
  const session = String(wantedSession || "").trim() || latestSession(resultsRoot);
  if (!session) return { session: "", rounds: [] };
  const roundsDir = path.join(resultsRoot, session, "rounds");
  try {
    const files = fs
      .readdirSync(roundsDir)
      .filter((x) => x.endsWith(".json"))
      .sort()
      .slice(-Math.max(1, limit | 0));
    const rounds = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(roundsDir, f), "utf8");
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object") {
          rounds.push(obj);
        }
      } catch {
        /* ignore unreadable round file */
      }
    }
    return { session, rounds };
  } catch {
    return { session, rounds: [] };
  }
}

function decimateUniform(arr, maxN) {
  if (arr.length <= maxN) return arr;
  const step = arr.length / maxN;
  const next = [];
  for (let i = 0; i < maxN; i++) {
    next.push(arr[Math.min(arr.length - 1, Math.floor((i + 0.5) * step))]);
  }
  return next;
}

/**
 * Load BTC NDJSON lines (from btcSpotWs.mjs) whose recv_ms falls in [fromMs, toMs].
 * Assumes lines are roughly time-ordered (append-only log); stops once past toMs.
 */
async function readBtcNdjsonSession(resultsRoot, session, fromMs, toMs, btcFile, maxPoints) {
  const sess = String(session || "").trim();
  if (!sess) return [];
  let a = Number(fromMs);
  let b = Number(toMs);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
  if (a > b) [a, b] = [b, a];
  const fp = path.join(resultsRoot, sess, String(btcFile || "btc_spot.ndjson"));
  if (!fs.existsSync(fp)) return [];
  const buf = [];
  const rl = readline.createInterface({
    input: createReadStream(fp, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = Number(o.recv_ms);
    if (!Number.isFinite(ts)) continue;
    if (ts < a) continue;
    if (ts > b) break;
    let mid = null;
    if (o.type === "bookTicker") {
      const bid = Number(o.bid);
      const ask = Number(o.ask);
      if (Number.isFinite(bid) && Number.isFinite(ask)) mid = (bid + ask) / 2;
      else if (Number.isFinite(bid)) mid = bid;
      else if (Number.isFinite(ask)) mid = ask;
    } else if (o.type === "trade") {
      mid = Number(o.price);
    }
    if (!Number.isFinite(mid)) continue;
    buf.push({ ts_ms: ts, mid, bid: o.bid, ask: o.ask, price: o.price });
  }
  return decimateUniform(buf, maxPoints);
}

function startServer(opts) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || "/", `http://${opts.host}:${opts.port}`);
    if (u.pathname === "/" || u.pathname === "") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(INDEX_HTML);
      return;
    }
    if (u.pathname === "/api/rounds") {
      const qSession = u.searchParams.get("session") || opts.session;
      const qLimit = Math.max(1, Number(u.searchParams.get("limit") || opts.limit));
      const payload = readRounds(opts.resultsRoot, qSession, qLimit);
      const body = JSON.stringify(payload.rounds);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "X-Rounds-Session": payload.session,
      });
      res.end(body);
      return;
    }
    if (u.pathname === "/api/sessions") {
      let sessions = [];
      try {
        sessions = fs
          .readdirSync(opts.resultsRoot, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
          .reverse();
      } catch {
        sessions = [];
      }
      const body = JSON.stringify(sessions);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
      return;
    }
    if (u.pathname === "/api/btc") {
      const qSession = u.searchParams.get("session") || opts.session;
      const fromMs = Number(u.searchParams.get("from_ms"));
      const toMs = Number(u.searchParams.get("to_ms"));
      const sess = String(qSession || "").trim() || latestSession(opts.resultsRoot);
      void readBtcNdjsonSession(
        opts.resultsRoot,
        sess,
        fromMs,
        toMs,
        opts.btcFile,
        opts.btcMaxPoints
      )
        .then((points) => {
          const body = JSON.stringify({ session: sess, points });
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(body),
          });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("btc read failed");
        });
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
  server.listen(opts.port, opts.host);
  return server;
}

function main() {
  const opts = parseArgs(process.argv);
  const srv = startServer(opts);
  console.log(`[dashboard] http://${opts.host}:${opts.port}`);
  console.log(`[dashboard] results_root=${opts.resultsRoot}`);
  if (opts.session) console.log(`[dashboard] fixed_session=${opts.session}`);
  console.log(`[dashboard] btc_ndjson=<session>/${opts.btcFile}`);
  const shutdown = () => {
    try {
      srv.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
