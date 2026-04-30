import fs from "node:fs";
import path from "node:path";
import { SideDetector } from "./strategyMikeV1.mjs";
import { nowMs } from "./quoteParse.mjs";

const WINDOW_MS = 5 * 60 * 1000;
const NDJSON_FLUSH_MS = 120;
const SUMMARY_FLUSH_MS = 400;
const ROUND_SNAPSHOT_MS = 5000;

function pushCap(arr, row, maxLen) {
  arr.push(row);
  if (arr.length > maxLen) arr.splice(0, arr.length - maxLen);
}

function toEpochMs(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function pxStr(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(6) : "null";
}

class RollingGaussian {
  constructor(span) {
    const s = Math.max(2, Number(span) || 20);
    this.window = Math.max(3, s | 1);
    const sigma = Math.max(1, s / 3);
    this.kernel = [];
    for (let lag = 0; lag < this.window; lag++) {
      this.kernel.push(Math.exp(-(lag * lag) / (2 * sigma * sigma)));
    }
    this.buf = [];
  }

  push(v) {
    const x = Number(v);
    if (!Number.isFinite(x)) return null;
    this.buf.push(x);
    if (this.buf.length > this.window) this.buf.shift();
    let acc = 0;
    let ws = 0;
    const n = this.buf.length;
    for (let lag = 0; lag < n; lag++) {
      const kw = this.kernel[lag];
      acc += this.buf[n - 1 - lag] * kw;
      ws += kw;
    }
    return ws > 0 ? acc / ws : x;
  }
}

export class LiveMikeV1 {
  /**
   * @param {object} p
   * @param {string} p.yesAssetId
   * @param {string} p.noAssetId
   * @param {string} p.outputDir
   * @param {string} [p.marketLabel]
   * @param {number} [p.orderQty]
   * @param {number} [p.span]
   * @param {string} [p.noiseFilter]
   * @param {number} [p.quoteStructuralHysteresisCents]
   * @param {number} [p.sustainedTangentMs]
   * @param {number} [p.valleyMaxRawAskCents]
   * @param {number} [p.valleyToPeakRawSpreadMinCents]
   * @param {string} [p.extremaLocationMode]
   * @param {number} [p.winddownLastMs]
   * @param {boolean} [p.lowLatencyMode]
   */
  constructor(p) {
    this.yesAssetId = p.yesAssetId ?? "";
    this.noAssetId = p.noAssetId ?? "";
    this.marketLabel = p.marketLabel ?? "";
    this.currentMarketSlug = "";
    this.orderQty = Number(p.orderQty ?? 20);
    this.winddownLastMs = p.winddownLastMs ?? 10_000;
    this.lowLatencyMode = p.lowLatencyMode === true;
    this.outputDir = p.outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });

    this._detectorKwargs = null;
    this.yesDet = null;
    this.noDet = null;
    this.strategyMode = "btc_delta_pair";
    this.strategyOrderQty = 10;
    this.strategyTriggerPct = 10;
    this.strategyFirstBuyMaxCents = 90;

    this.roundStartMs = null;
    this.winddownDoneYes = false;
    this.winddownDoneNo = false;
    this.lastTickMs = null;
    this._lastStoredPointKey = null;
    this.btcMid = null;
    this.btcTsMs = null;
    this._btcPrevMid = null;
    this._btcRoundRefMid = null;
    this._btcLegState = null;
    this._roundBtcOpenMid = null;
    this._roundBtcCloseMid = null;
    this._prevRoundBtcCloseMid = null;

    this.quoteByAsset = {
      [this.yesAssetId]: { bid: null, ask: null, tsMs: null },
      [this.noAssetId]: { bid: null, ask: null, tsMs: null },
    };
    /** @type {Record<string, Array<{ side: string, quantity: number, entry_price: number, opened_ts_ms: number, open_reason: string }>>} */
    this.positions = { yes: [], no: [] };
    /** @type {any[]} */
    this.closedTrades = [];
    this.totalRealizedPnl = 0;

    this.recentTicks = [];
    this.recentSignals = [];
    this.recentTrades = [];
    this.allSignals = [];
    this.roundPoints = [];
    // Keep market data capture active even in low-latency mode; low-latency now only
    // disables in-progress round snapshots (heavy full JSON rewrites).
    this.persistTickPoints = true;

    this.startedAtMs = nowMs();
    this.ticksPath = path.join(this.outputDir, "ticks.ndjson");
    this.signalsPath = path.join(this.outputDir, "signals.ndjson");
    this.tradesPath = path.join(this.outputDir, "trades.ndjson");
    this.summaryPath = path.join(this.outputDir, "summary.json");
    this.roundsDir = path.join(this.outputDir, "rounds");
    fs.mkdirSync(this.roundsDir, { recursive: true });
    this._roundClosedTradeStartIdx = 0;
    this._roundSignalStartIdx = 0;
    this._roundPointStartIdx = 0;
    this._roundRealizedPnlStart = 0;
    this._lastRoundSnapshotMs = 0;
    this._initRoundGaussians();
    this._ndjsonBuffers = {
      ticks: "",
      signals: "",
      trades: "",
    };
    this._ndjsonStreams = {
      ticks: fs.createWriteStream(this.ticksPath, { flags: "a" }),
      signals: fs.createWriteStream(this.signalsPath, { flags: "a" }),
      trades: fs.createWriteStream(this.tradesPath, { flags: "a" }),
    };
    this._ndjsonFlushTimer = setInterval(() => this._flushNdjson(), NDJSON_FLUSH_MS);
    this._summaryDirty = false;
    this._summaryWriteInFlight = false;
    this._summaryFlushTimer = null;
    this._lastSummaryPayload = {};
  }

  _newDetector() {
    if (!this._detectorKwargs) return null;
    return new SideDetector(this._detectorKwargs);
  }

  _appendNdjson(filePath, row) {
    const line = JSON.stringify(row) + "\n";
    if (filePath === this.ticksPath) this._ndjsonBuffers.ticks += line;
    else if (filePath === this.signalsPath) this._ndjsonBuffers.signals += line;
    else if (filePath === this.tradesPath) this._ndjsonBuffers.trades += line;
  }

  _flushNdjson() {
    const b = this._ndjsonBuffers;
    if (b.ticks) {
      this._ndjsonStreams.ticks.write(b.ticks);
      b.ticks = "";
    }
    if (b.signals) {
      this._ndjsonStreams.signals.write(b.signals);
      b.signals = "";
    }
    if (b.trades) {
      this._ndjsonStreams.trades.write(b.trades);
      b.trades = "";
    }
  }

  _buildSummaryPayload() {
    const quotes = {};
    for (const [k, v] of Object.entries(this.quoteByAsset)) {
      quotes[k] = { bid: v.bid, ask: v.ask, ts_ms: v.ts_ms };
    }
    const openPositions = Object.fromEntries(
      Object.entries(this.positions).map(([side, rows]) => {
        const arr = Array.isArray(rows) ? rows : [];
        const qty = arr.reduce((a, p) => a + (Number(p.quantity) || 0), 0);
        const cost = arr.reduce((a, p) => a + (Number(p.quantity) || 0) * (Number(p.entry_price) || 0), 0);
        return [
          side,
          {
            count: arr.length,
            quantity: qty,
            avg_entry_price: qty > 0 ? cost / qty : null,
          },
        ];
      })
    );
    return {
      started_at_ms: this.startedAtMs,
      updated_at_ms: nowMs(),
      last_tick_ms: this.lastTickMs,
      yes_asset_id: this.yesAssetId,
      no_asset_id: this.noAssetId,
      market_label: this.marketLabel,
      current_market_slug: this.currentMarketSlug,
      quotes,
      open_positions: openPositions,
      closed_trade_count: this.closedTrades.length,
      total_realized_pnl: this.totalRealizedPnl,
      recent_ticks: this.recentTicks,
      recent_signals: this.recentSignals,
      recent_trades: this.recentTrades,
    };
  }

  _flushSummaryNow() {
    if (!this._summaryDirty || this._summaryWriteInFlight) return;
    this._summaryDirty = false;
    this._summaryWriteInFlight = true;
    const payload = this._buildSummaryPayload();
    this._lastSummaryPayload = payload;
    fs.promises
      .writeFile(this.summaryPath, JSON.stringify(payload, null, 2), "utf8")
      .catch(() => {
        // Keep processing hot; next flush attempt retries naturally.
      })
      .finally(() => {
        this._summaryWriteInFlight = false;
      });
  }

  _scheduleSummaryWrite() {
    this._summaryDirty = true;
    if (this._summaryFlushTimer != null) return;
    this._summaryFlushTimer = setTimeout(() => {
      this._summaryFlushTimer = null;
      this._flushSummaryNow();
    }, SUMMARY_FLUSH_MS);
  }

  _initRoundGaussians() {
    const span = Number(this._detectorKwargs?.span ?? 20);
    this._gauss = {
      yesAsk: new RollingGaussian(span),
      yesBid: new RollingGaussian(span),
      noAsk: new RollingGaussian(span),
      noBid: new RollingGaussian(span),
    };
  }

  /**
   * @param {object} p
   * @param {string} p.yesAssetId
   * @param {string} p.noAssetId
   * @param {string} [p.marketLabel]
   * @param {string} [p.marketSlug]
   */
  switchMarket(p) {
    this.yesAssetId = p.yesAssetId;
    this.noAssetId = p.noAssetId;
    this.marketLabel = p.marketLabel ?? "";
    this.currentMarketSlug = p.marketSlug ?? "";
    this.quoteByAsset = {
      [this.yesAssetId]: { bid: null, ask: null, tsMs: null },
      [this.noAssetId]: { bid: null, ask: null, tsMs: null },
    };
    this.yesDet = this._newDetector();
    this.noDet = this._newDetector();
    this._initRoundGaussians();
    this.roundStartMs = null;
    this.winddownDoneYes = false;
    this.winddownDoneNo = false;
    this._resetBtcRoundState();
    this.lastTickMs = null;
    this._appendNdjson(this.signalsPath, {
      ts_ms: nowMs(),
      phase: "market_switch",
      yes_asset_id: this.yesAssetId,
      no_asset_id: this.noAssetId,
      market_label: this.marketLabel,
      market_slug: this.currentMarketSlug,
    });
    this._writeSummary();
  }

  _rollRoundIfNeeded(tsMs) {
    const roundStart = tsMs - (tsMs % WINDOW_MS);
    if (this.roundStartMs !== roundStart) {
      if (this.roundStartMs != null) {
        if (Number.isFinite(this._roundBtcCloseMid)) this._prevRoundBtcCloseMid = this._roundBtcCloseMid;
        else if (Number.isFinite(this.btcMid)) this._prevRoundBtcCloseMid = this.btcMid;
        this._persistRoundResult(this.roundStartMs, roundStart);
        this.yesDet = this._newDetector();
        this.noDet = this._newDetector();
        this._initRoundGaussians();
      }
      this.roundStartMs = roundStart;
      this.winddownDoneYes = false;
      this.winddownDoneNo = false;
      this._resetBtcRoundState();
    }
    return tsMs - roundStart;
  }

  _resetBtcRoundState() {
    this._roundBtcOpenMid = Number.isFinite(this._prevRoundBtcCloseMid)
      ? this._prevRoundBtcCloseMid
      : Number.isFinite(this.btcMid)
        ? this.btcMid
        : null;
    this._roundBtcCloseMid = Number.isFinite(this.btcMid) ? this.btcMid : null;
    this._btcRoundRefMid = this._roundBtcOpenMid;
    this._btcPrevMid = this._roundBtcOpenMid;
    this._btcLegState = null;
  }

  _signalRow(tsMs, side, kind, detector) {
    const idx = detector.lastEmittedIdx;
    const anchorTs =
      idx != null && idx < detector.times.length
        ? detector.times[idx]
        : tsMs;
    const anchorAsk = idx != null && idx < detector.askHist.length ? detector.askHist[idx] : null;
    const anchorBid = idx != null && idx < detector.bidHist.length ? detector.bidHist[idx] : null;
    const anchorSmooth = idx != null && idx < detector.smooth.length ? detector.smooth[idx] : null;
    const signalPrice = kind === "peak" ? anchorBid : anchorAsk;
    return {
      ts_ms: toEpochMs(tsMs),
      phase: "accepted_extrema",
      side,
      kind,
      emitted_ts_ms: toEpochMs(anchorTs),
      emitted_idx: idx,
      signal_price: signalPrice,
      anchor_ask: anchorAsk,
      anchor_bid: anchorBid,
      anchor_smooth: anchorSmooth,
    };
  }

  _open(side, tsMs, ask, reason) {
    const cents = this._quoteToCents(ask);
    if (cents == null) return;
    const qty =
      reason != null && String(reason).startsWith("btc_")
        ? this.strategyOrderQty
        : this.orderQty;
    const pos = {
      side,
      quantity: qty,
      entry_price: cents / 100,
      opened_ts_ms: tsMs,
      open_reason: reason,
    };
    if (!Array.isArray(this.positions[side])) this.positions[side] = [];
    this.positions[side].push(pos);
    const row = { type: "open", ...pos };
    pushCap(this.recentTrades, row, 500);
    this._appendNdjson(this.tradesPath, row);
  }

  _close(side, tsMs, bid, reason) {
    const arr = Array.isArray(this.positions[side]) ? this.positions[side] : [];
    if (!arr.length) return;
    const bidCents = this._quoteToCents(bid);
    if (bidCents == null) return;
    const exitPrice = bidCents / 100;
    for (const p of arr) {
      const pnl = p.quantity * (exitPrice - p.entry_price);
      const ct = {
        side,
        quantity: p.quantity,
        entry_price: p.entry_price,
        exit_price: exitPrice,
        opened_ts_ms: p.opened_ts_ms,
        closed_ts_ms: tsMs,
        open_reason: p.open_reason,
        close_reason: reason,
        realized_pnl: pnl,
      };
      this.closedTrades.push(ct);
      this.totalRealizedPnl += pnl;
      const row = { type: "close", ...ct };
      pushCap(this.recentTrades, row, 500);
      this._appendNdjson(this.tradesPath, row);
    }
    this.positions[side] = [];
  }

  _closeAtBinarySettlement(tsMs, y, n, reason) {
    const scoreFromQuote = (q) => {
      const bidC = this._quoteToCents(q?.bid);
      if (bidC != null) return bidC;
      return this._quoteToCents(q?.ask);
    };
    const yScore = scoreFromQuote(y);
    const nScore = scoreFromQuote(n);
    if (yScore == null && nScore == null) return;
    let yesWins = false;
    if (yScore != null && nScore != null) yesWins = yScore >= nScore;
    else yesWins = (yScore ?? -Infinity) >= (nScore ?? -Infinity);
    const yesExit = yesWins ? 1 : 0;
    const noExit = yesWins ? 0 : 1;

    const closeSide = (sideName, exitPrice) => {
      const arr = Array.isArray(this.positions[sideName]) ? this.positions[sideName] : [];
      if (!arr.length) return;
      for (const p of arr) {
        const pnl = p.quantity * (exitPrice - p.entry_price);
        const ct = {
          side: sideName,
          quantity: p.quantity,
          entry_price: p.entry_price,
          exit_price: exitPrice,
          opened_ts_ms: p.opened_ts_ms,
          closed_ts_ms: tsMs,
          open_reason: p.open_reason,
          close_reason: reason,
          realized_pnl: pnl,
        };
        this.closedTrades.push(ct);
        this.totalRealizedPnl += pnl;
        const row = { type: "close", ...ct };
        pushCap(this.recentTrades, row, 500);
        this._appendNdjson(this.tradesPath, row);
      }
      this.positions[sideName] = [];
    };

    closeSide("yes", yesExit);
    closeSide("no", noExit);
  }

  _quoteToCents(v) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    if (v < 0) return null;
    // Stream quotes are usually [0,1] dollars (e.g. 0.42 => 42 cents).
    // If already in cents-like scale, keep as-is.
    return v <= 1.5 ? v * 100 : v;
  }

  _processSide(side, detector, tsMs, ask, bid) {
    // Strategy disabled for live_test: no valley/peak detection, no trades.

  }

  /**
   * BTC-driven two-leg simulation:
   * - First leg triggers on +/-10% move using:
   *     pct = abs(current - previous) / abs(previous - open) * 100
   *     direction = current > previous (up if true, down if false)
   * - If first-buy ask > 90 cents, skip that first-buy trigger.
   * - Hedge rule: A + opposite_ask < 95.
   * - No opens in the last `winddownLastMs` of the window.
   */
  _processBtcDeltaPair(tsMs, elapsed, y, n) {
    if (elapsed >= WINDOW_MS - this.winddownLastMs) return;
    const asFiniteNum = (v) =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const yAsk = asFiniteNum(y?.ask);
    const nAsk = asFiniteNum(n?.ask);
    if (yAsk == null || nAsk == null) return;
    const mid = Number(this.btcMid);
    if (!Number.isFinite(mid)) return;
    if (!Number.isFinite(this._btcRoundRefMid)) {
      this._btcRoundRefMid = mid;
      return;
    }

    const yAskCents = this._quoteToCents(yAsk);
    const nAskCents = this._quoteToCents(nAsk);
    if (yAskCents == null || nAskCents == null) return;
    if (this._btcLegState == null) {
      const open = Number(this._btcRoundRefMid);
      const prev = Number(this._btcPrevMid);
      if (!Number.isFinite(open) || !Number.isFinite(prev)) return;
      const denom = Math.abs(prev - open);
      if (denom < 1e-9) return;
      const pct = (Math.abs(mid - prev) / denom) * 100;
      if (pct < this.strategyTriggerPct) return;
      const dirUp = mid > prev;
      if (dirUp && yAskCents <= this.strategyFirstBuyMaxCents) {
        this._open("yes", tsMs, yAsk, "btc_up_first");
        this._btcLegState = { dir: "up", firstAskCents: yAskCents };
      } else if (!dirUp && nAskCents <= this.strategyFirstBuyMaxCents) {
        this._open("no", tsMs, nAsk, "btc_down_first");
        this._btcLegState = { dir: "down", firstAskCents: nAskCents };
      }
      return;
    }

    if (this._btcLegState.dir === "up") {
      if (this._btcLegState.firstAskCents + nAskCents < 95) {
        this._open("no", tsMs, nAsk, "btc_hedge_down_sum_lt_95");
        this._btcLegState = null;
        this._btcRoundRefMid = mid;
      }
      return;
    }
    if (this._btcLegState.firstAskCents + yAskCents < 95) {
      this._open("yes", tsMs, yAsk, "btc_hedge_up_sum_lt_95");
      this._btcLegState = null;
      this._btcRoundRefMid = mid;
    }
  }

  /**
   * After `quoteByAsset` was updated (WS merge or REST snapshot), run tick log, winddown, detectors.
   * @param {number} tsMs
   */
  _afterQuoteStore(tsMs) {
    const y = this.quoteByAsset[this.yesAssetId];
    const n = this.quoteByAsset[this.noAssetId];
    const wallMs = nowMs();

    this.lastTickMs = toEpochMs(tsMs);
    const elapsed = this._rollRoundIfNeeded(wallMs);
    if (Number.isFinite(this.btcMid)) {
      this._roundBtcCloseMid = this.btcMid;
      if (!Number.isFinite(this._roundBtcOpenMid)) {
        this._roundBtcOpenMid = this.btcMid;
        this._btcRoundRefMid = this._roundBtcOpenMid;
      }
    }
    const anyNeg =
      [y?.ask, y?.bid, n?.ask, n?.bid].some((v) => typeof v === "number" && Number.isFinite(v) && v < 0);
    const allZero =
      [y?.ask, y?.bid, n?.ask, n?.bid].every((v) => typeof v === "number" && Number.isFinite(v) && v === 0);
    const isZero = (v) => typeof v === "number" && Number.isFinite(v) && v === 0;
    const isOneCent = (v) =>
      typeof v === "number" && Number.isFinite(v) && Math.abs(v - 0.01) < 1e-6;
    const oneCentOppZero =
      (isOneCent(y?.ask) && isZero(n?.ask)) ||
      (isOneCent(n?.ask) && isZero(y?.ask)) ||
      (isOneCent(y?.bid) && isZero(n?.bid)) ||
      (isOneCent(n?.bid) && isZero(y?.bid));
    const tickRow = {
      ts_ms: toEpochMs(tsMs),
      yes_bid: y.bid,
      yes_ask: y.ask,
      no_bid: n.bid,
      no_ask: n.ask,
    };
    const pointRow = {
      ts_ms: toEpochMs(tsMs),
      yes_bid: y.bid,
      yes_ask: y.ask,
      no_bid: n.bid,
      no_ask: n.ask,
      yes_bid_g: this._gauss.yesBid.push(y.bid),
      yes_ask_g: this._gauss.yesAsk.push(y.ask),
      no_bid_g: this._gauss.noBid.push(n.bid),
      no_ask_g: this._gauss.noAsk.push(n.ask),
    };
    const pointKey = [pxStr(pointRow.yes_ask), pxStr(pointRow.no_ask)].join("|");
    if (this.persistTickPoints) {
      if (!anyNeg && !allZero && !oneCentOppZero && pointKey !== this._lastStoredPointKey) {
        this._lastStoredPointKey = pointKey;
        this.roundPoints.push(pointRow);
        pushCap(this.recentTicks, tickRow, 500);
        this._appendNdjson(this.ticksPath, tickRow);
      }
    }
    this._maybePersistLiveRound(wallMs);

    if (elapsed >= WINDOW_MS - this.winddownLastMs) {
      if (!this.winddownDoneYes) {
        this._closeAtBinarySettlement(tsMs, y, n, "btc_pair_winddown_binary");
        this.winddownDoneYes = true;
      }
      if (!this.winddownDoneNo) {
        // Closed together in _closeAtBinarySettlement.
        this.winddownDoneNo = true;
      }
      this._writeSummary();
      return;
    }

    this._processBtcDeltaPair(tsMs, elapsed, y, n);
    this._writeSummary();
  }

  /**
   * @param {number} mid
   * @param {number} tsMs
   */
  onBtcMidUpdate(mid, tsMs) {
    const m = Number(mid);
    if (!Number.isFinite(m)) return;
    if (Number.isFinite(this.btcMid)) this._btcPrevMid = this.btcMid;
    this.btcMid = m;
    this.btcTsMs = toEpochMs(tsMs);
    if (this.roundStartMs != null) {
      this._roundBtcCloseMid = m;
      if (!Number.isFinite(this._roundBtcOpenMid)) {
        this._roundBtcOpenMid = Number.isFinite(this._prevRoundBtcCloseMid) ? this._prevRoundBtcCloseMid : m;
        this._btcRoundRefMid = this._roundBtcOpenMid;
      }
    }
  }

  _maybePersistLiveRound(tsMs) {
    if (this.lowLatencyMode) return;
    if (this.roundStartMs == null) return;
    const t = toEpochMs(tsMs);
    if (t == null) return;
    if (t - this._lastRoundSnapshotMs < ROUND_SNAPSHOT_MS) return;
    this._lastRoundSnapshotMs = t;
    this._persistRoundResult(this.roundStartMs, t, true);
  }

  /**
   * Merge-only quote update from WebSocket deltas (null fields mean "leave previous value").
   * @param {string} assetId @param {number | null} bid @param {number | null} ask @param {number} tsMs
   */
  onQuoteUpdate(assetId, bid, ask, tsMs) {
    const q = this.quoteByAsset[assetId];
    if (!q) return;
    if (bid != null) q.bid = Number(bid);
    if (ask != null) q.ask = Number(ask);
    q.ts_ms = toEpochMs(tsMs);
    this._afterQuoteStore(tsMs);
  }

  /**
   * Replace top-of-book for one outcome from a REST `/book` snapshot. Missing fetch (null snap)
   * leaves that leg unchanged. Null bid/ask inside snap clears that side (empty book level).
   * @param {{ bestBid: number | null, bestAsk: number | null } | null} yesSnap
   * @param {{ bestBid: number | null, bestAsk: number | null } | null} noSnap
   * @param {number} tsMs
   */
  applyRestBookSnapshot(yesSnap, noSnap, tsMs) {
    if (yesSnap == null && noSnap == null) return;
    const y = this.quoteByAsset[this.yesAssetId];
    const n = this.quoteByAsset[this.noAssetId];
    if (!y || !n) return;
    const set = (q, snap) => {
      if (snap == null) return;
      const bb = snap.bestBid;
      const ba = snap.bestAsk;
      q.bid = bb != null && Number.isFinite(Number(bb)) ? Number(bb) : null;
      q.ask = ba != null && Number.isFinite(Number(ba)) ? Number(ba) : null;
      q.ts_ms = toEpochMs(tsMs);
    };
    set(y, yesSnap);
    set(n, noSnap);
    this._afterQuoteStore(tsMs);
  }

  _writeSummary() {
    this._scheduleSummaryWrite();
  }

  _persistRoundResult(roundStartMs, roundEndMs, inProgress = false) {
    const endMs = Number(roundEndMs);
    const startMs = Number(roundStartMs);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
    const closed = this.closedTrades.slice(this._roundClosedTradeStartIdx);
    const signals = this.allSignals.slice(this._roundSignalStartIdx);
    const points = this.roundPoints.slice(this._roundPointStartIdx);
    const roundPnl = this.totalRealizedPnl - this._roundRealizedPnlStart;
    const payload = {
      round_start_ms: startMs,
      round_end_ms: endMs,
      btc_open_price: Number.isFinite(this._roundBtcOpenMid) ? this._roundBtcOpenMid : null,
      btc_close_price: Number.isFinite(this._roundBtcCloseMid) ? this._roundBtcCloseMid : null,
      market_label: this.marketLabel,
      market_slug: this.currentMarketSlug,
      yes_asset_id: this.yesAssetId,
      no_asset_id: this.noAssetId,
      closed_trade_count: closed.length,
      signal_count: signals.length,
      point_count: points.length,
      realized_pnl: roundPnl,
      in_progress: Boolean(inProgress),
      points,
      signals,
      closed_trades: closed,
    };
    const filePath = path.join(this.roundsDir, `${Math.trunc(startMs / 1000)}.json`);
    fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8").catch(() => {
      /* ignore */
    });
    if (!inProgress) {
      this._roundClosedTradeStartIdx = this.closedTrades.length;
      this._roundSignalStartIdx = this.allSignals.length;
      this._roundPointStartIdx = this.roundPoints.length;
      this._roundRealizedPnlStart = this.totalRealizedPnl;
    }
  }

  readRoundResults(limit = 40) {
    try {
      const files = fs
        .readdirSync(this.roundsDir)
        .filter((x) => x.endsWith(".json"))
        .sort()
        .slice(-Math.max(1, limit | 0));
      const out = [];
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(this.roundsDir, f), "utf8");
          const obj = JSON.parse(raw);
          if (obj && typeof obj === "object") out.push(obj);
        } catch {
          /* ignore */
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  snapshot() {
    return this._lastSummaryPayload;
  }

  async close() {
    if (this.roundStartMs != null) {
      this._persistRoundResult(this.roundStartMs, nowMs());
    }
    if (this._ndjsonFlushTimer != null) clearInterval(this._ndjsonFlushTimer);
    if (this._summaryFlushTimer != null) {
      clearTimeout(this._summaryFlushTimer);
      this._summaryFlushTimer = null;
    }
    this._flushNdjson();
    this._summaryDirty = true;
    this._flushSummaryNow();
    const endStream = (s) =>
      new Promise((resolve) => {
        try {
          s.end(resolve);
        } catch {
          resolve();
        }
      });
    await Promise.all([
      endStream(this._ndjsonStreams.ticks),
      endStream(this._ndjsonStreams.signals),
      endStream(this._ndjsonStreams.trades),
    ]);
  }
}

export const INDEX_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Round Results Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1220;
      --panel: #121b2d;
      --panel-2: #0f1728;
      --border: #2a3550;
      --text: #d7e3ff;
      --muted: #9db0d8;
      --green: #3ddc97;
      --red: #ff6b6b;
      --amber: #f0b429;
      --blue: #57a0ff;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, Arial, sans-serif;
      margin: 0;
      padding: 18px;
      background: var(--bg);
      color: var(--text);
    }
    h1, h2, h3 { margin: 0; }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .muted { color: var(--muted); font-size: 13px; }
    .btn {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
    }
    .kpi .lab { color: var(--muted); font-size: 12px; }
    .kpi .val { font-size: 20px; font-weight: 700; margin-top: 6px; }
    .layout {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 12px;
      align-items: start;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }
    .card > .hd {
      background: var(--panel-2);
      border-bottom: 1px solid var(--border);
      padding: 10px 12px;
      font-weight: 700;
    }
    .body { padding: 10px 12px; }
    .round-list { max-height: 72vh; overflow: auto; }
    .round-item {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 10px;
      margin-bottom: 8px;
      cursor: pointer;
      background: #0f182a;
    }
    .round-item.active {
      border-color: var(--blue);
      box-shadow: 0 0 0 1px var(--blue) inset;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 13px;
    }
    .pill {
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .chart {
      width: 100%;
      height: 360px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #0d1626;
      margin-bottom: 10px;
    }
    .chart-wrap {
      position: relative;
      margin-bottom: 10px;
    }
    .chart-tooltip {
      position: absolute;
      pointer-events: none;
      display: none;
      background: rgba(6, 10, 18, 0.95);
      border: 1px solid #2b3a5a;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.4;
      color: #e6efff;
      min-width: 170px;
      z-index: 5;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .mini {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      background: #0d1626;
    }
    .mini .lab { font-size: 11px; color: var(--muted); }
    .mini .val { margin-top: 4px; font-size: 15px; font-weight: 700; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      padding: 6px 5px;
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 600; }
    .t-scroll { max-height: 280px; overflow: auto; }
    .g { color: var(--green); }
    .r { color: var(--red); }
    .a { color: var(--amber); }
    .chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 6px 0;
    }
    .legend {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      user-select: none;
    }
    .legend-item.off {
      opacity: 0.35;
      text-decoration: line-through;
    }
    .legend-dot {
      width: 11px;
      height: 11px;
      border-radius: 2px;
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .legend-line {
      width: 14px;
      height: 0;
      border-top: 2px solid currentColor;
      display: inline-block;
    }
    .legend-line.dash {
      border-top-style: dashed;
    }
    .chart-tools {
      display: inline-flex;
      gap: 6px;
      margin-left: 8px;
    }
    .mini-btn {
      border: 1px solid var(--border);
      background: #0d1626;
      color: var(--text);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 12px;
      cursor: pointer;
      line-height: 1.2;
    }
    #priceChart {
      cursor: grab;
    }
    #priceChart.dragging {
      cursor: grabbing;
    }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>Stored Rounds Dashboard</h1>
      <div id="meta" class="muted">Loading round files...</div>
    </div>
    <button id="reload" class="btn">Reload Stored Results</button>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="lab">Rounds</div><div class="val" id="kRounds">-</div></div>
    <div class="kpi"><div class="lab">Total Realized PnL</div><div class="val" id="kPnl">-</div></div>
    <div class="kpi"><div class="lab">Closed Trades</div><div class="val" id="kTrades">-</div></div>
    <div class="kpi"><div class="lab">Win Rate</div><div class="val" id="kWinRate">-</div></div>
    <div class="kpi"><div class="lab">Avg PnL / Round</div><div class="val" id="kAvg">-</div></div>
  </div>

  <div class="layout">
    <div class="card">
      <div class="hd">Rounds (latest first)</div>
      <div class="body round-list" id="roundList"></div>
    </div>
    <div class="card">
      <div class="hd">Round Detail</div>
      <div class="body">
        <div class="detail-grid">
          <div class="mini"><div class="lab">Round Window</div><div class="val" id="dWindow">-</div></div>
          <div class="mini"><div class="lab">Market Slug</div><div class="val" id="dSlug">-</div></div>
          <div class="mini"><div class="lab">Round PnL</div><div class="val" id="dPnl">-</div></div>
          <div class="mini"><div class="lab">Closed Trades</div><div class="val" id="dTrades">-</div></div>
          <div class="mini"><div class="lab">Detected Extrema</div><div class="val" id="dSignals">-</div></div>
          <div class="mini"><div class="lab">Price Points</div><div class="val" id="dPoints">-</div></div>
          <div class="mini"><div class="lab">BTC Open (round)</div><div class="val" id="dBtcOpen">-</div></div>
          <div class="mini"><div class="lab">BTC Close (round)</div><div class="val" id="dBtcClose">-</div></div>
        </div>

        <div class="chart-head">
          <h3>Trade Price Graph</h3>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap">
          <div class="legend">
            <span class="legend-item" data-line="yesAsk" style="color:#2dd784"><span class="legend-line"></span>Up ask (c)</span>
            <span class="legend-item" data-line="yesAskG" style="color:#2dd784"><span class="legend-line dash"></span>Up ask Gaussian (20)</span>
            <span class="legend-item" data-line="yesBid" style="color:#7ff0b4"><span class="legend-line"></span>Up bid (c)</span>
            <span class="legend-item" data-line="yesBidG" style="color:#7ff0b4"><span class="legend-line dash"></span>Up bid Gaussian (20)</span>
            <span class="legend-item" data-line="noAsk" style="color:#ff6b7d"><span class="legend-line"></span>Down ask (c)</span>
            <span class="legend-item" data-line="noAskG" style="color:#ff6b7d"><span class="legend-line dash"></span>Down ask Gaussian (20)</span>
            <span class="legend-item" data-line="noBid" style="color:#ff9aa6"><span class="legend-line"></span>Down bid (c)</span>
            <span class="legend-item" data-line="noBidG" style="color:#ff9aa6"><span class="legend-line dash"></span>Down bid Gaussian (20)</span>
            <span class="legend-item" data-line="btcMid" style="color:#f5b84a"><span class="legend-line"></span>BTC (USDT, right axis)</span>
          </div>
          <div class="chart-tools">
            <button id="zoomOut" class="mini-btn" title="Zoom out time axis">-</button>
            <button id="zoomIn" class="mini-btn" title="Zoom in time axis">+</button>
            <button id="zoomReset" class="mini-btn" title="Reset zoom">Reset</button>
          </div>
          </div>
        </div>
        <div class="chart-wrap">
        <svg id="priceChart" class="chart" viewBox="0 0 1000 360" preserveAspectRatio="none"></svg>
          <div id="priceTip" class="chart-tooltip"></div>
        </div>

        <h3 style="margin: 0 0 6px 0;">Trade PnL (bars) + Cumulative PnL (line)</h3>
        <svg id="pnlChart" class="chart" viewBox="0 0 1000 360" preserveAspectRatio="none"></svg>

        <h3 style="margin: 0 0 6px 0;">Trade Log</h3>
        <div class="t-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Side</th>
                <th>Open/Close</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th>PnL</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody id="tradeRows"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    const numOrNull = (x) => {
      if (x == null || x === "") return null;
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };
    const fmtTs = (x) => {
      if (!Number.isFinite(Number(x))) return "-";
      return new Date(Number(x)).toISOString().replace("T", " ").slice(0, 19) + "Z";
    };
    const fmt = (x, d = 4) => {
      const n = numOrNull(x);
      return n == null ? "-" : n.toFixed(d);
    };
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

    /** @type {any[]} */
    let rounds = [];
    let activeIdx = 0;
    let priceChartState = null;
    const lineEnabled = {
      yesAsk: true,
      yesAskG: true,
      yesBid: true,
      yesBidG: true,
      noAsk: true,
      noAskG: true,
      noBid: true,
      noBidG: true,
      btcMid: true,
    };
    let dashboardSession = "";
    /** @type {any[]} */
    let lastBtcSeries = [];
    let priceZoom = { startMs: null, endMs: null };

    function setKpis() {
      const rCnt = rounds.length;
      const trades = rounds.flatMap((r) => Array.isArray(r.closed_trades) ? r.closed_trades : []);
      const pnl = rounds.reduce((a, r) => a + (Number(r.realized_pnl) || 0), 0);
      const wins = trades.filter((t) => (Number(t.realized_pnl) || 0) > 0).length;
      document.getElementById("kRounds").textContent = String(rCnt);
      document.getElementById("kPnl").innerHTML = pnl >= 0 ? '<span class="g">' + fmt(pnl) + "</span>" : '<span class="r">' + fmt(pnl) + "</span>";
      document.getElementById("kTrades").textContent = String(trades.length);
      document.getElementById("kWinRate").textContent = trades.length ? fmt((wins * 100) / trades.length, 1) + "%" : "-";
      document.getElementById("kAvg").textContent = rCnt ? fmt(pnl / rCnt) : "-";
    }

    function renderRoundList() {
      const root = document.getElementById("roundList");
      root.innerHTML = rounds.map((r, i) => {
        const pnl = Number(r.realized_pnl) || 0;
        const cls = i === activeIdx ? "round-item active" : "round-item";
        const inProg = r.in_progress === true ? ' <span class="a">(live)</span>' : "";
        return '<div class="' + cls + '" data-i="' + i + '">' +
          '<div class="row"><strong>' + esc(r.market_slug || "unknown") + inProg + '</strong>' +
          '<span class="pill">' + fmtTs(r.round_start_ms).slice(11, 16) + " -> " + fmtTs(r.round_end_ms).slice(11, 16) + "</span></div>" +
          '<div class="row" style="margin-top:5px"><span>closed=' + String(r.closed_trade_count ?? 0) + '</span>' +
          (pnl >= 0 ? '<span class="g">pnl ' + fmt(pnl) + '</span>' : '<span class="r">pnl ' + fmt(pnl) + '</span>') +
          "</div></div>";
      }).join("");
      root.querySelectorAll(".round-item").forEach((el) => {
        el.addEventListener("click", () => {
          const i = Number(el.getAttribute("data-i"));
          if (Number.isFinite(i)) {
            activeIdx = i;
            renderRoundList();
            void renderDetail();
          }
        });
      });
    }

    function polyline(points, color, width = 2, dash = "") {
      if (!points.length) return "";
      const p = points.map((x) => x[0].toFixed(2) + "," + x[1].toFixed(2)).join(" ");
      const d = dash ? ' stroke-dasharray="' + dash + '"' : "";
      return (
        '<polyline fill="none" stroke="' +
        color +
        '" stroke-width="' +
        width +
        '" stroke-linejoin="round" stroke-linecap="round"' +
        d +
        ' points="' +
        p +
        '"/>'
      );
    }
    function circles(points, color, r = 4) {
      return points.map((p) => '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="' + r + '" fill="' + color + '"/>').join("");
    }
    function triangles(points, color, size = 5, up = true) {
      return points
        .map((p) => {
          const x = p[0];
          const y = p[1];
          const a = up
            ? [[x, y - size], [x - size, y + size], [x + size, y + size]]
            : [[x, y + size], [x - size, y - size], [x + size, y - size]];
          const s = a.map((q) => q[0].toFixed(2) + "," + q[1].toFixed(2)).join(" ");
          return '<polygon points="' + s + '" fill="' + color + '" stroke="rgba(0,0,0,0.35)" stroke-width="0.8"/>';
        })
        .join("");
    }
    function verticalLine(x, color = "#2c3a58") {
      return '<line x1="' + x.toFixed(2) + '" y1="12" x2="' + x.toFixed(2) + '" y2="336" stroke="' + color + '" stroke-width="1"/>';
    }
    function horizontalLine(y, color = "#22314d") {
      return '<line x1="40" y1="' + y.toFixed(2) + '" x2="985" y2="' + y.toFixed(2) + '" stroke="' + color + '" stroke-width="1"/>';
    }
    function buildGrid(left, right, top, bottom, xTicks = 8, yTicks = 6) {
      const xs = [];
      const ys = [];
      for (let i = 0; i <= xTicks; i++) xs.push(left + ((right - left) * i) / xTicks);
      for (let i = 0; i <= yTicks; i++) ys.push(top + ((bottom - top) * i) / yTicks);
      return (
        ys
          .map((yv, i) => horizontalLine(yv, i % 2 === 0 ? "#23314d" : "#1a2740"))
          .join("") +
        xs
          .map((xv, i) => verticalLine(xv, i % 2 === 0 ? "#2a3a58" : "#1e2b44"))
          .join("")
      );
    }

    function renderPriceChart(points, trades, signals, roundStartMs, roundEndMs, btcSeries) {
      const svg = document.getElementById("priceChart");
      const tip = document.getElementById("priceTip");
      const rawPts = Array.isArray(points) ? points : [];
      const pricePts = rawPts.length > 20 ? rawPts.slice(20) : [];
      const sigs = Array.isArray(signals) ? signals : [];
      const btcPts = Array.isArray(btcSeries) ? btcSeries : [];
      const showBtc = btcPts.length > 0 && lineEnabled.btcMid;
      if (!trades.length && !sigs.length && !pricePts.length && !btcPts.length) {
        svg.innerHTML = "";
        tip.style.display = "none";
        priceChartState = null;
        return;
      }
      let minP = Infinity;
      let maxP = -Infinity;
      const pushPrice = (x) => {
        const v = numOrNull(x);
        if (v == null) return;
        if (v < minP) minP = v;
        if (v > maxP) maxP = v;
      };
      for (const p of pricePts) {
        for (const k of ["yes_bid", "yes_ask", "no_bid", "no_ask", "yes_bid_g", "yes_ask_g", "no_bid_g", "no_ask_g"]) {
          pushPrice(p?.[k]);
        }
      }
      for (const t of trades) {
        pushPrice(t.entry_price);
        pushPrice(t.exit_price);
      }
      for (const s of sigs) {
        pushPrice(s.signal_price);
      }
      if (!Number.isFinite(minP) || !Number.isFinite(maxP)) {
        minP = 0;
        maxP = 1;
      }
      const pad = Math.max(0.002, (maxP - minP) * 0.1);
      const lo = minP - pad;
      const hi = maxP + pad;
      const w = 1000;
      const h = 360;
      const left = 40;
      const rightPad = showBtc ? 58 : 15;
      const top = 12;
      const bot = 24;
      const fullT0 = Number(roundStartMs);
      const fullT1 = Math.max(fullT0 + 1, Number(roundEndMs));
      let t0 = fullT0;
      let t1 = fullT1;
      if (priceZoom.startMs != null && priceZoom.endMs != null) {
        const zs = Number(priceZoom.startMs);
        const ze = Number(priceZoom.endMs);
        if (Number.isFinite(zs) && Number.isFinite(ze) && ze > zs) {
          t0 = Math.max(fullT0, zs);
          t1 = Math.min(fullT1, ze);
          if (t1 <= t0) {
            t0 = fullT0;
            t1 = fullT1;
          }
        }
      }
      const xByTs = (ts) => {
        const t = Number(ts);
        const frac = Math.max(0, Math.min(1, (t - t0) / Math.max(1, t1 - t0)));
        return left + frac * (w - left - rightPad);
      };
      const y = (v) => top + ((hi - v) / Math.max(1e-9, hi - lo)) * (h - top - bot);
      const inWindow = (ts) => {
        const t = Number(ts);
        return Number.isFinite(t) && t >= t0 && t <= t1;
      };
      const pricePtsW = pricePts.filter((p) => inWindow(p?.ts_ms));
      const btcPtsW = btcPts.filter((p) => inWindow(p?.ts_ms));
      const sigsW = sigs.filter((s) => inWindow(s?.emitted_ts_ms));
      const tradesW = trades.filter((t) => inWindow(t?.opened_ts_ms));
      let minB = Infinity;
      let maxB = -Infinity;
      if (showBtc) {
        for (const b of btcPtsW) {
          const m = Number(b?.mid);
          if (Number.isFinite(m)) {
            if (m < minB) minB = m;
            if (m > maxB) maxB = m;
          }
        }
      }
      let loB = 0;
      let hiB = 1;
      let yBtc = () => top;
      let btcLinePts = [];
      if (showBtc && Number.isFinite(minB) && Number.isFinite(maxB)) {
        let loBr = minB;
        let hiBr = maxB;
        if (hiBr <= loBr) {
          const d = Math.max(Math.abs(loBr) * 0.0005, 5);
          loBr -= d;
          hiBr += d;
        }
        const bPad = Math.max(1, (hiBr - loBr) * 0.02);
        loB = loBr - bPad;
        hiB = hiBr + bPad;
        yBtc = (v) => top + ((hiB - v) / Math.max(1e-9, hiB - loB)) * (h - top - bot);
        btcLinePts = btcPtsW
          .map((b) => {
            const t = Number(b?.ts_ms);
            const v = Number(b?.mid);
            return Number.isFinite(t) && Number.isFinite(v) ? [xByTs(t), yBtc(v)] : null;
          })
          .filter(Boolean);
      }
      const lineFrom = (arr, key) =>
        arr
          .map((p) => {
            const t = numOrNull(p?.ts_ms);
            const v = numOrNull(p?.[key]);
            return t != null && v != null ? [xByTs(t), y(v)] : null;
          })
          .filter(Boolean);
      const buyEntryYesTri = [];
      const buyEntryNoTri = [];
      for (const t of tradesW) {
        const tx = numOrNull(t?.opened_ts_ms);
        const tv = numOrNull(t?.entry_price);
        if (tx == null || tv == null) continue;
        const p = [xByTs(tx), y(tv)];
        if (String(t?.side) === "yes") buyEntryYesTri.push(p);
        else if (String(t?.side) === "no") buyEntryNoTri.push(p);
      }
      const yesAsk = lineFrom(pricePtsW, "yes_ask");
      const yesBid = lineFrom(pricePtsW, "yes_bid");
      const noAsk = lineFrom(pricePtsW, "no_ask");
      const noBid = lineFrom(pricePtsW, "no_bid");
      const yesAskG = lineFrom(pricePtsW, "yes_ask_g");
      const yesBidG = lineFrom(pricePtsW, "yes_bid_g");
      const noAskG = lineFrom(pricePtsW, "no_ask_g");
      const noBidG = lineFrom(pricePtsW, "no_bid_g");
      const valleyPts = sigsW
        .filter((s) => String(s.kind) === "valley" && Number.isFinite(Number(s.signal_price)))
        .map((s) => [xByTs(s.emitted_ts_ms), y(Number(s.signal_price))]);
      const peakPts = sigsW
        .filter((s) => String(s.kind) === "peak" && Number.isFinite(Number(s.signal_price)))
        .map((s) => [xByTs(s.emitted_ts_ms), y(Number(s.signal_price))]);
      const pDec = pricePtsW;
      const axisBtc =
        showBtc && btcLinePts.length
          ? '<text x="' +
            (w - 6) +
            '" y="' +
            yBtc(hiB).toFixed(1) +
            '" fill="#f5b84a" font-size="11" text-anchor="end">' +
            esc(fmt(hiB, 0)) +
            "</text>" +
            '<text x="' +
            (w - 6) +
            '" y="' +
            yBtc((hiB + loB) / 2).toFixed(1) +
            '" fill="#e0a040" font-size="11" text-anchor="end">' +
            esc(fmt((hiB + loB) / 2, 0)) +
            "</text>" +
            '<text x="' +
            (w - 6) +
            '" y="' +
            yBtc(loB).toFixed(1) +
            '" fill="#f5b84a" font-size="11" text-anchor="end">' +
            esc(fmt(loB, 0)) +
            "</text>"
          : "";
      svg.innerHTML =
        '<rect x="0" y="0" width="1000" height="360" fill="#0d1626"/>' +
        buildGrid(left, w - rightPad, top, h - bot, 8, 6) +
        (lineEnabled.yesAsk ? polyline(yesAsk, "#2dd784", 1.4) : "") +
        (lineEnabled.yesAskG ? polyline(yesAskG, "#2dd784", 1.3, "6 4") : "") +
        (lineEnabled.yesBid ? polyline(yesBid, "#7ff0b4", 1.1) : "") +
        (lineEnabled.yesBidG ? polyline(yesBidG, "#7ff0b4", 1.1, "6 4") : "") +
        (lineEnabled.noAsk ? polyline(noAsk, "#ff6b7d", 1.4) : "") +
        (lineEnabled.noAskG ? polyline(noAskG, "#ff6b7d", 1.3, "6 4") : "") +
        (lineEnabled.noBid ? polyline(noBid, "#ff9aa6", 1.1) : "") +
        (lineEnabled.noBidG ? polyline(noBidG, "#ff9aa6", 1.1, "6 4") : "") +
        (showBtc && btcLinePts.length ? polyline(btcLinePts, "#f5b84a", 2) : "") +
        triangles(buyEntryYesTri, "#2dd784", 4.8, true) +
        triangles(buyEntryNoTri, "#ff6b7d", 4.8, true) +
        circles(valleyPts, "#c9a0ff", 4) +
        circles(peakPts, "#ffc857", 4) +
        axisBtc;

      priceChartState = { pDec, btcPts: btcPtsW, xByTs, y, yBtc, lo, hi, loB, hiB, t0, t1, fullT0, fullT1 };
      const onMove = (ev) => {
        if (!priceChartState) return;
        if (!priceChartState.pDec.length && !(priceChartState.btcPts && priceChartState.btcPts.length)) return;
        const rect = svg.getBoundingClientRect();
        const xLocal = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 1000;
        let bestPm = null;
        let bestPmDx = Infinity;
        for (const p of priceChartState.pDec) {
          const px = priceChartState.xByTs(p.ts_ms);
          const dx = Math.abs(px - xLocal);
          if (dx < bestPmDx) {
            bestPmDx = dx;
            bestPm = p;
          }
        }
        let bestBtc = null;
        let bestBtcDx = Infinity;
        const bArr = priceChartState.btcPts || [];
        for (const b of bArr) {
          const px = priceChartState.xByTs(b.ts_ms);
          const dx = Math.abs(px - xLocal);
          if (dx < bestBtcDx) {
            bestBtcDx = dx;
            bestBtc = b;
          }
        }
        if (!bestPm && !bestBtc) return;
        const tsMs = bestPm ? bestPm.ts_ms : bestBtc.ts_ms;
        const ts = fmtTs(tsMs);
        let html = '<div style="font-weight:700;margin-bottom:4px">' + esc(ts) + "</div>";
        if (bestPm) {
          html +=
            '<div><span style="color:#6aaefc">Up ask:</span> ' +
            fmt(bestPm.yes_ask) +
            "</div>" +
            '<div><span style="color:#d5e8ff">Up ask G(20):</span> ' +
            fmt(bestPm.yes_ask_g) +
            "</div>" +
            '<div><span style="color:#3f86e0">Up bid:</span> ' +
            fmt(bestPm.yes_bid) +
            "</div>" +
            '<div><span style="color:#c0dcff">Up bid G(20):</span> ' +
            fmt(bestPm.yes_bid_g) +
            "</div>" +
            '<div><span style="color:#eec266">Down ask:</span> ' +
            fmt(bestPm.no_ask) +
            "</div>" +
            '<div><span style="color:#fff3c8">Down ask G(20):</span> ' +
            fmt(bestPm.no_ask_g) +
            "</div>" +
            '<div><span style="color:#c9982e">Down bid:</span> ' +
            fmt(bestPm.no_bid) +
            "</div>" +
            '<div><span style="color:#ffe7a7">Down bid G(20):</span> ' +
            fmt(bestPm.no_bid_g) +
            "</div>";
        }
        if (bestBtc && lineEnabled.btcMid) {
          html +=
            '<div style="margin-top:6px;border-top:1px solid #2b3a5a;padding-top:4px"><span style="color:#f5b84a">BTC mid (USDT):</span> ' +
            fmt(bestBtc.mid, 2) +
            "</div>";
        }
        tip.innerHTML = html;
        tip.style.display = "block";
        tip.style.left = Math.min(rect.width - 190, Math.max(8, ev.clientX - rect.left + 10)) + "px";
        tip.style.top = Math.min(rect.height - 140, Math.max(8, ev.clientY - rect.top + 10)) + "px";
      };
      svg.onmousemove = onMove;
      svg.onmouseleave = () => {
        tip.style.display = "none";
      };
    }

    function renderPnlChart(trades) {
      const svg = document.getElementById("pnlChart");
      if (!trades.length) {
        svg.innerHTML = "";
        return;
      }
      const rows = trades
        .map((t) => ({
          ts: numOrNull(t?.closed_ts_ms),
          pnl: numOrNull(t?.realized_pnl),
        }))
        .filter((r) => r.ts != null && r.pnl != null)
        .sort((a, b) => a.ts - b.ts);
      if (!rows.length) {
        svg.innerHTML = "";
        return;
      }
      let run = 0;
      const ptsRows = rows.map((r) => {
        run += r.pnl;
        return { ts: r.ts, pnl: r.pnl, cum: run };
      });
      const vals = ptsRows.flatMap((x) => [x.pnl, x.cum, 0]);
      let lo = Math.min(...vals);
      let hi = Math.max(...vals);
      if (Math.abs(hi - lo) < 1e-9) {
        hi += 1;
        lo -= 1;
      }
      const w = 1000;
      const h = 360;
      const left = 40, right = 15, top = 12, bot = 24;
      const t0 = ptsRows[0].ts;
      const t1 = Math.max(t0 + 1, ptsRows[ptsRows.length - 1].ts);
      const x = (ts) => {
        const frac = Math.max(0, Math.min(1, (ts - t0) / Math.max(1, t1 - t0)));
        return left + frac * (w - left - right);
      };
      const y = (v) => top + ((hi - v) / Math.max(1e-9, hi - lo)) * (h - top - bot);
      const cumPts = ptsRows.map((p) => [x(p.ts), y(p.cum)]);
      let bars = "";
      const barHalf = Math.max(1.5, ((w - left - right) / Math.max(20, ptsRows.length)) * 0.25);
      for (const p of ptsRows) {
        const xb = x(p.ts);
        const y0b = y(0);
        const ypb = y(p.pnl);
        const topY = Math.min(y0b, ypb);
        const hb = Math.abs(ypb - y0b);
        const c = p.pnl >= 0 ? "#2dd78488" : "#ff6b7d88";
        bars +=
          '<rect x="' +
          (xb - barHalf).toFixed(2) +
          '" y="' +
          topY.toFixed(2) +
          '" width="' +
          (barHalf * 2).toFixed(2) +
          '" height="' +
          Math.max(1, hb).toFixed(2) +
          '" fill="' +
          c +
          '"/>';
      }
      const y0 = y(0);
      svg.innerHTML =
        '<rect x="0" y="0" width="1000" height="360" fill="#0d1626"/>' +
        buildGrid(left, w - right, top, h - bot, 8, 6) +
        '<line x1="40" y1="' + y0.toFixed(2) + '" x2="985" y2="' + y0.toFixed(2) + '" stroke="#2a3550" stroke-width="1"/>' +
        bars +
        polyline(cumPts, "#3ddc97", 2.2) +
        circles(cumPts, "#3ddc97", 2.8);
    }

    function wireLegendToggles() {
      const items = document.querySelectorAll(".legend-item[data-line]");
      items.forEach((it) => {
        const key = it.getAttribute("data-line");
        if (!key) return;
        const apply = () => {
          if (lineEnabled[key]) it.classList.remove("off");
          else it.classList.add("off");
        };
        apply();
        it.addEventListener("click", () => {
          lineEnabled[key] = !lineEnabled[key];
          apply();
          void renderDetail();
        });
      });
    }

    function wireZoomControls() {
      let rafPending = false;
      const scheduleRender = () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          void renderDetail();
        });
      };
      const zoom = (factor) => {
        const r = rounds[activeIdx];
        if (!r) return;
        const fullT0 = Number(r.round_start_ms);
        const fullT1 = Math.max(fullT0 + 1, Number(r.round_end_ms));
        const curStart = priceZoom.startMs != null ? Number(priceZoom.startMs) : fullT0;
        const curEnd = priceZoom.endMs != null ? Number(priceZoom.endMs) : fullT1;
        const curSpan = Math.max(1000, curEnd - curStart);
        const center = curStart + curSpan / 2;
        const nextSpan = Math.max(5000, Math.min(fullT1 - fullT0, curSpan * factor));
        const ns = Math.max(fullT0, center - nextSpan / 2);
        const ne = Math.min(fullT1, center + nextSpan / 2);
        priceZoom.startMs = ns;
        priceZoom.endMs = ne;
        void renderDetail();
      };
      const zoomAtX = (factor, xFrac) => {
        const r = rounds[activeIdx];
        if (!r) return;
        const fullT0 = Number(r.round_start_ms);
        const fullT1 = Math.max(fullT0 + 1, Number(r.round_end_ms));
        const curStart = priceZoom.startMs != null ? Number(priceZoom.startMs) : fullT0;
        const curEnd = priceZoom.endMs != null ? Number(priceZoom.endMs) : fullT1;
        const curSpan = Math.max(1000, curEnd - curStart);
        const f = Math.max(0, Math.min(1, Number(xFrac)));
        const anchor = curStart + curSpan * f;
        const nextSpan = Math.max(5000, Math.min(fullT1 - fullT0, curSpan * factor));
        let ns = anchor - nextSpan * f;
        let ne = ns + nextSpan;
        if (ns < fullT0) {
          ns = fullT0;
          ne = ns + nextSpan;
        }
        if (ne > fullT1) {
          ne = fullT1;
          ns = ne - nextSpan;
        }
        priceZoom.startMs = ns;
        priceZoom.endMs = ne;
        scheduleRender();
      };
      const zin = document.getElementById("zoomIn");
      const zout = document.getElementById("zoomOut");
      const zreset = document.getElementById("zoomReset");
      if (zin) zin.addEventListener("click", () => zoom(0.6));
      if (zout) zout.addEventListener("click", () => zoom(1.7));
      if (zreset)
        zreset.addEventListener("click", () => {
          priceZoom.startMs = null;
          priceZoom.endMs = null;
          scheduleRender();
        });
      const psvg = document.getElementById("priceChart");
      if (psvg) {
        psvg.addEventListener(
          "wheel",
          (ev) => {
            if (!rounds.length) return;
            ev.preventDefault();
            const rect = psvg.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            const frac = rect.width > 0 ? x / rect.width : 0.5;
            const factor = ev.deltaY < 0 ? 0.92 : 1.09;
            zoomAtX(factor, frac);
          },
          { passive: false }
        );
        let dragging = false;
        let dragStartX = 0;
        let dragStartMs = 0;
        psvg.addEventListener("mousedown", (ev) => {
          if (ev.button !== 0) return;
          const r = rounds[activeIdx];
          if (!r) return;
          const s = Number(priceZoom.startMs);
          const e = Number(priceZoom.endMs);
          if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
          dragging = true;
          dragStartX = ev.clientX;
          dragStartMs = s;
          psvg.classList.add("dragging");
          ev.preventDefault();
        });
        window.addEventListener("mousemove", (ev) => {
          if (!dragging) return;
          const r = rounds[activeIdx];
          if (!r) return;
          const fullT0 = Number(r.round_start_ms);
          const fullT1 = Math.max(fullT0 + 1, Number(r.round_end_ms));
          const curStart = Number(dragStartMs);
          const curEnd = Number(priceZoom.endMs);
          if (!Number.isFinite(curStart) || !Number.isFinite(curEnd) || curEnd <= curStart) return;
          const rect = psvg.getBoundingClientRect();
          if (rect.width <= 1) return;
          const dx = ev.clientX - dragStartX;
          const span = curEnd - curStart;
          const msPerPx = span / rect.width;
          let ns = curStart - dx * msPerPx;
          let ne = ns + span;
          if (ns < fullT0) {
            ns = fullT0;
            ne = ns + span;
          }
          if (ne > fullT1) {
            ne = fullT1;
            ns = ne - span;
          }
          priceZoom.startMs = ns;
          priceZoom.endMs = ne;
          scheduleRender();
        });
        window.addEventListener("mouseup", () => {
          if (!dragging) return;
          dragging = false;
          psvg.classList.remove("dragging");
        });
      }
    }

    async function renderDetail() {
      const r = rounds[activeIdx];
      if (!r) return;
      const trades = Array.isArray(r.closed_trades) ? r.closed_trades : [];
      const signals = Array.isArray(r.signals) ? r.signals : [];
      const points = Array.isArray(r.points) ? r.points : [];
      if (priceZoom.startMs == null || priceZoom.endMs == null) {
        priceZoom.startMs = Number(r.round_start_ms);
        priceZoom.endMs = Number(r.round_end_ms);
      } else {
        const rs = Number(r.round_start_ms);
        const re = Number(r.round_end_ms);
        if (priceZoom.startMs < rs || priceZoom.endMs > re) {
          priceZoom.startMs = rs;
          priceZoom.endMs = re;
        }
      }
      lastBtcSeries = [];
      if (dashboardSession && r.round_start_ms != null && r.round_end_ms != null) {
        try {
          const u =
            "/api/btc?session=" +
            encodeURIComponent(dashboardSession) +
            "&from_ms=" +
            encodeURIComponent(String(r.round_start_ms)) +
            "&to_ms=" +
            encodeURIComponent(String(r.round_end_ms));
          const br = await fetch(u);
          if (br.ok) {
            const j = await br.json();
            if (Array.isArray(j.points)) lastBtcSeries = j.points;
          }
        } catch (e) {
          console.error("btc fetch:", e);
        }
      }
      document.getElementById("dWindow").textContent = fmtTs(r.round_start_ms) + " -> " + fmtTs(r.round_end_ms);
      document.getElementById("dSlug").textContent = r.market_slug || "-";
      const pnl = Number(r.realized_pnl) || 0;
      document.getElementById("dPnl").innerHTML = pnl >= 0 ? '<span class="g">' + fmt(pnl) + '</span>' : '<span class="r">' + fmt(pnl) + '</span>';
      document.getElementById("dTrades").textContent = String(trades.length);
      document.getElementById("dSignals").textContent = String(signals.length);
      document.getElementById("dPoints").textContent = String(points.length);
      document.getElementById("dBtcOpen").textContent =
        r.btc_open_price == null ? "-" : String(r.btc_open_price);
      document.getElementById("dBtcClose").textContent =
        r.btc_close_price == null ? "-" : String(r.btc_close_price);
      try {
        renderPriceChart(points, trades, signals, r.round_start_ms, r.round_end_ms, lastBtcSeries);
      } catch (e) {
        console.error("renderPriceChart error:", e);
        document.getElementById("priceChart").innerHTML = "";
      }
      try {
        renderPnlChart(trades);
      } catch (e) {
        console.error("renderPnlChart error:", e);
        document.getElementById("pnlChart").innerHTML = "";
      }
      document.getElementById("tradeRows").innerHTML = trades.map((t, idx) => {
        const p = Number(t.realized_pnl) || 0;
        const cls = p >= 0 ? "g" : "r";
        return "<tr>" +
          "<td>" + String(idx + 1) + "</td>" +
          "<td>" + esc(t.side) + "</td>" +
          "<td>" + fmtTs(t.opened_ts_ms) + "<br/>" + fmtTs(t.closed_ts_ms) + "</td>" +
          "<td>" + fmt(t.entry_price) + "</td>" +
          "<td>" + fmt(t.exit_price) + "</td>" +
          "<td>" + fmt(t.quantity, 0) + "</td>" +
          '<td class="' + cls + '">' + fmt(p) + "</td>" +
          "<td>" + esc(t.open_reason) + " -> " + esc(t.close_reason) + "</td>" +
          "</tr>";
      }).join("");
    }

    async function loadRounds() {
      const r = await fetch('/api/rounds');
      dashboardSession = r.headers.get('X-Rounds-Session') || '';
      const rows = await r.json();
      rounds = Array.isArray(rows) ? rows.slice().reverse() : [];
      document.getElementById("meta").textContent = rounds.length
        ? "Loaded " + rounds.length + " stored rounds from disk."
        : "No stored rounds yet.";
      activeIdx = 0;
      setKpis();
      renderRoundList();
      await renderDetail();
    }
    document.getElementById("reload").addEventListener("click", () => {
      void loadRounds();
    });
    wireLegendToggles();
    wireZoomControls();
    void loadRounds();
  </script>
</body>
</html>
`;
