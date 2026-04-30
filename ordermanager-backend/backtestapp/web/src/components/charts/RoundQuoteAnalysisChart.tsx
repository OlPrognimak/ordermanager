import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { ChartDataset, ChartOptions, ScriptableContext } from "chart.js";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import type { EquityPoint, RunMeta, TradeRow } from "@/api/types";
import { filterAlternatingAskSwingCents } from "@/utils/alternatingAskExtremaFilter";
import { discreteTangentExtremaIndices } from "@/utils/discreteTangentExtrema";
import { formatMoney, formatTs } from "@/utils/format";
import { applyNoiseFilter, NOISE_FILTER_OPTIONS, noiseFilterShortLabel, type NoiseFilterId } from "@/utils/noiseFilters";
import { registerCharts } from "./chartRegister";
import {
  EXTREMA_MARKER_BUY_BG,
  EXTREMA_MARKER_BUY_BORDER,
  EXTREMA_MARKER_SELL_BG,
  EXTREMA_MARKER_SELL_BORDER,
} from "@/utils/extremaMarkerStyle";
import {
  DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS,
  mikeV1GraphSignalParamsFromRunMeta,
} from "@/utils/mikeV1GraphSignalParams";

registerCharts();

const DEFAULT_EMA_SPAN = 20;
/** Initial EMA span when analysis controls are visible (toolbar defaults). */
const ANALYSIS_DEFAULT_EMA_SPAN = 10;
const DEFAULT_MAX_RENDER_POINTS = 250_000;
const LARGE_UNCAPPED_HINT = 25_000;

/** Same default cap as the data-analysis round modal (Chart.js + extrema cost). */
export const ANALYSIS_MODAL_CHART_MAX_POINTS = 25_000;

export const ANALYSIS_EMA_SPAN_OPTIONS = [5, 8, 10, 13, 20, 34, 55, 89] as const;
/** Schmitt ΔP for Up/Down EMA extrema (same units as quote ¢). */
export const ANALYSIS_STRUCTURAL_HYSTERESIS_QUOTE_CENTS = [0.1, 0.25, 0.5, 1, 2, 5] as const;
/** Schmitt ΔP for BTC EMA extrema (USD, same units as `EquityPoint.price`). */
export const ANALYSIS_STRUCTURAL_HYSTERESIS_BTC_USD = [0.5, 1, 2, 5, 10, 20, 50, 100] as const;
/** Wall-time window where mean 3-tick slope must stay signed before a peak/valley fires. */
export const ANALYSIS_SUSTAINED_TANGENT_MS_OPTIONS = [100, 200, 300, 500, 750, 1000] as const;
export const ANALYSIS_EXTREMA_LOCATION_MODE_OPTIONS = [
  { id: "spread_anchored", label: "Spread-anchored (best quote in-leg)" },
  { id: "classic", label: "Classic (confirmation bar)" },
] as const;
export const ANALYSIS_EXTREMA_CLUSTER_MIN_SAMPLES_OPTIONS = [0, 5, 8, 12, 18, 25, 40] as const;
export const ANALYSIS_MIN_LEG_SWING_BTC_USD = [0, 1, 2, 5, 10, 20, 50, 100] as const;
export const ANALYSIS_MIN_LEG_SWING_QUOTE_CENTS = [0, 0.05, 0.1, 0.25, 0.5, 1, 2, 5] as const;
/** Options (¢) for valley→peak spread min: peak raw bid − valley raw ask (peak→valley has no distance filter). */
export const ANALYSIS_ALTERNATING_ASK_SWING_CENTS = [0, 5, 10, 15, 20, 30] as const;
export const ANALYSIS_ALTERNATING_MIN_GAP_MS = 1000;
/** Up/Down ask EMA valleys only when raw ask at that bar is below this (¢). */
export const ANALYSIS_VALLEY_MAX_RAW_ASK_CENTS = 45;

function downsampleIndices(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = n / max;
  const idx: number[] = [];
  for (let k = 0; k < max; k++) idx.push(Math.min(n - 1, Math.floor(k * step)));
  return idx;
}

/** `idx[j]` = full-series index for chart bucket `j`. Map full-series extrema index → nearest bucket. */
function mapFullIndexToChartBucket(fullIdx: number, idx: number[]): number {
  if (idx.length === 0) return 0;
  let bestJ = 0;
  let bestD = Infinity;
  for (let j = 0; j < idx.length; j++) {
    const d = Math.abs(idx[j]! - fullIdx);
    if (d < bestD) {
      bestD = d;
      bestJ = j;
    }
  }
  return bestJ;
}

function mapExtremaSetsToChartBuckets(sets: EmaExtremaSets, idx: number[]): EmaExtremaSets {
  const peaks = new Set<number>();
  const valleys = new Set<number>();
  for (const i of sets.peaks) peaks.add(mapFullIndexToChartBucket(i, idx));
  for (const i of sets.valleys) valleys.add(mapFullIndexToChartBucket(i, idx));
  return { peaks, valleys };
}

/** Nearest equity tick index to a wall-clock ms (sorted ascending by `timestamp_ms`). */
function nearestSortedIndexByTime(sorted: EquityPoint[], targetMs: number): number {
  if (sorted.length === 0) return 0;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]!.timestamp_ms < targetMs) lo = mid + 1;
    else hi = mid;
  }
  const i0 = Math.max(0, lo - 1);
  const i1 = Math.min(sorted.length - 1, lo);
  const d0 = Math.abs(sorted[i0]!.timestamp_ms - targetMs);
  const d1 = Math.abs(sorted[i1]!.timestamp_ms - targetMs);
  return d0 <= d1 ? i0 : i1;
}

function seriesAt(points: EquityPoint[], pick: (p: EquityPoint) => number | null): (number | null)[] {
  return points.map((p) => {
    const v = pick(p);
    return v != null && Number.isFinite(v) ? v : null;
  });
}

function anyFinite(arr: (number | null)[]): boolean {
  return arr.some((x) => x != null && Number.isFinite(x));
}

function smoothedDatasetLabel(prefix: string, filter: NoiseFilterId, span: number): string {
  return `${prefix} ${noiseFilterShortLabel(filter)} (${span})`;
}

type EmaExtremaSets = { peaks: Set<number>; valleys: Set<number> };
type ExtremaLocationMode = (typeof ANALYSIS_EXTREMA_LOCATION_MODE_OPTIONS)[number]["id"];

function extremaFromPicked(
  picked: (number | null)[],
  timesMs: number[],
  structuralHysteresis: number,
  sustainedTangentMs: number,
  dominantMinSeparationSamples: number,
  minLegSwingAbs: number,
  valleyAskGate?: { maxExclusive: number; askPicked: (number | null)[] },
  peakBidPicked?: (number | null)[],
  locationMode: ExtremaLocationMode = "spread_anchored",
): EmaExtremaSets {
  const { peaks, valleys } = discreteTangentExtremaIndices(picked, timesMs, {
    structuralHysteresis,
    sustainedTangentMs,
    dominantMinSeparationSamples:
      dominantMinSeparationSamples > 0 ? dominantMinSeparationSamples : undefined,
    minLegSwingAbs: minLegSwingAbs > 0 ? minLegSwingAbs : undefined,
    ...(valleyAskGate
      ? {
          maxValleyAskExclusive: valleyAskGate.maxExclusive,
          valleyAskSeries: valleyAskGate.askPicked,
        }
      : {}),
    ...(peakBidPicked ? { peakBidSeries: peakBidPicked } : {}),
    anchorToQuoteSeries: locationMode === "spread_anchored",
  });
  return { peaks: new Set(peaks), valleys: new Set(valleys) };
}

export default function RoundQuoteAnalysisChart({
  points,
  maxRenderPoints = DEFAULT_MAX_RENDER_POINTS,
  defaultEmaAskFocus = false,
  graphOnly = false,
  positionTrades,
  positionWindow,
  runMeta,
  strategyDebugEvents,
  showPossibleSignalPositions = false,
}: {
  points: EquityPoint[];
  maxRenderPoints?: number;
  defaultEmaAskFocus?: boolean;
  /** When true: no toolbar, captions, or downsampling hints — chart + legend only (run meta when mike_v1, else engine defaults). */
  graphOnly?: boolean;
  /** Closed / opened trades to plot as buy (open) and sell (close) markers on the quote axis (¢). */
  positionTrades?: TradeRow[];
  /** UTC window used to decide which opens/closes get markers. */
  positionWindow?: { start_ms: number; end_ms: number };
  /** Job meta: when `graphOnly` and strategy is `mike_v1`, extrema params match this run's `strategy_params`. */
  runMeta?: Pick<RunMeta, "strategy_name" | "strategy_params">;
  /** Optional strategy debug events from result payload (used for exact signal marker alignment in mike_v1). */
  strategyDebugEvents?: Record<string, unknown>[];
  /** Draw all possible valley/peak signals for current settings (analysis helper overlay). */
  showPossibleSignalPositions?: boolean;
}) {
  const [emaSpan, setEmaSpan] = useState(ANALYSIS_DEFAULT_EMA_SPAN);
  const [noiseFilter, setNoiseFilter] = useState<NoiseFilterId>("ema");
  const [structuralHysteresisQuote, setStructuralHysteresisQuote] = useState(0.1);
  const [structuralHysteresisBtc, setStructuralHysteresisBtc] = useState(5);
  const [sustainedTangentMs, setSustainedTangentMs] = useState(1000);
  const [extremaLocationMode, setExtremaLocationMode] = useState<ExtremaLocationMode>("spread_anchored");
  const [extremaClusterMinSamples, setExtremaClusterMinSamples] = useState(0);
  const [minLegSwingBtcUsd, setMinLegSwingBtcUsd] = useState(0);
  const [minLegSwingQuoteCents, setMinLegSwingQuoteCents] = useState(0);
  const [valleyToPeakAsk, setValleyToPeakAsk] = useState(10);

  const graphEmbed =
    graphOnly && runMeta
      ? (mikeV1GraphSignalParamsFromRunMeta(runMeta) ?? DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS)
      : graphOnly
        ? DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS
        : null;

  const emaSpanUsed = graphEmbed ? graphEmbed.emaSpan : emaSpan;
  const noiseFilterUsed = graphEmbed ? graphEmbed.noiseFilter : noiseFilter;
  const structuralHysteresisQuoteUsed = graphEmbed
    ? graphEmbed.structuralHysteresisQuote
    : structuralHysteresisQuote;
  const structuralHysteresisBtcUsed = graphEmbed ? 5 : structuralHysteresisBtc;
  const sustainedTangentMsUsed = graphEmbed ? graphEmbed.sustainedTangentMs : sustainedTangentMs;
  const extremaLocationModeUsed = graphEmbed ? graphEmbed.extremaLocationMode : extremaLocationMode;
  const extremaClusterMinSamplesUsed = graphEmbed
    ? graphEmbed.extremaClusterMinSamples
    : extremaClusterMinSamples;
  const minLegSwingBtcUsdUsed = graphEmbed ? graphEmbed.minLegSwingBtcUsd : minLegSwingBtcUsd;
  const minLegSwingQuoteCentsUsed = graphEmbed ? graphEmbed.minLegSwingQuoteCents : minLegSwingQuoteCents;
  const valleyToPeakAskUsed = graphEmbed ? graphEmbed.valleyToPeakAsk : valleyToPeakAsk;
  const valleyAskMaxExclusiveUsed = graphEmbed
    ? graphEmbed.valleyMaxRawAskCents
    : ANALYSIS_VALLEY_MAX_RAW_ASK_CENTS;

  const span = defaultEmaAskFocus ? emaSpanUsed : DEFAULT_EMA_SPAN;
  const clusterSamples = defaultEmaAskFocus ? extremaClusterMinSamplesUsed : 0;
  const swingBtc = defaultEmaAskFocus ? minLegSwingBtcUsdUsed : 0;
  const swingQuote = defaultEmaAskFocus ? minLegSwingQuoteCentsUsed : 0;
  const peakToValleyAsk = 0;
  const altAskRawFilterOn = defaultEmaAskFocus && valleyToPeakAskUsed > 0;

  const sorted = useMemo(() => {
    const raw = points.filter((p) => Number.isFinite(p.timestamp_ms));
    return [...raw].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }, [points]);

  const seriesAndEma = useMemo(() => {
    const btc = seriesAt(sorted, (p) => p.price ?? null);
    const upAsk = seriesAt(sorted, (p) => p.yes_ask ?? p.yes ?? null);
    const upBid = seriesAt(sorted, (p) => p.yes_bid ?? p.yes ?? null);
    const downAsk = seriesAt(sorted, (p) => p.no_ask ?? p.no ?? null);
    const downBid = seriesAt(sorted, (p) => p.no_bid ?? p.no ?? null);
    return {
      btc,
      upAsk,
      upBid,
      downAsk,
      downBid,
      btcEma: applyNoiseFilter(btc, span, noiseFilterUsed),
      upAskEma: applyNoiseFilter(upAsk, span, noiseFilterUsed),
      upBidEma: applyNoiseFilter(upBid, span, noiseFilterUsed),
      downAskEma: applyNoiseFilter(downAsk, span, noiseFilterUsed),
      downBidEma: applyNoiseFilter(downBid, span, noiseFilterUsed),
      hasBtc: anyFinite(btc),
      hasCents:
        anyFinite(upAsk) || anyFinite(upBid) || anyFinite(downAsk) || anyFinite(downBid),
    };
  }, [sorted, span, noiseFilterUsed]);

  const {
    btc,
    upAsk,
    upBid,
    downAsk,
    downBid,
    btcEma,
    upAskEma,
    upBidEma,
    downAskEma,
    downBidEma,
    hasBtc,
    hasCents,
  } = seriesAndEma;

  const cap =
    maxRenderPoints === Infinity ? sorted.length : (maxRenderPoints ?? DEFAULT_MAX_RENDER_POINTS);
  const idx = useMemo(() => {
    if (sorted.length <= cap) return Array.from({ length: sorted.length }, (_, i) => i);
    return downsampleIndices(sorted.length, cap);
  }, [sorted.length, cap]);
  const renderAll = sorted.length <= cap;
  const labels = idx.map((i) => formatTs(sorted[i]!.timestamp_ms));

  const pick = (arr: (number | null)[]) => idx.map((i) => arr[i]!);

  const fullTimesMs = useMemo(() => sorted.map((p) => p.timestamp_ms), [sorted]);

  const defaultVisibleEma = useMemo(
    () =>
      new Set([
        smoothedDatasetLabel("Up ask", noiseFilterUsed, span),
        smoothedDatasetLabel("Down ask", noiseFilterUsed, span),
      ]),
    [noiseFilterUsed, span],
  );

  const btcEmaPicked = pick(btcEma);
  const upAskEmaPicked = pick(upAskEma);
  const downAskEmaPicked = pick(downAskEma);
  /** Extrema on the full tick stream (same as engine / analysis modal); then mapped to chart buckets for drawing. */
  const rawBtcEmaExtremaFull =
    defaultEmaAskFocus && hasBtc
      ? extremaFromPicked(
          btcEma,
          fullTimesMs,
          structuralHysteresisBtcUsed,
          sustainedTangentMsUsed,
          clusterSamples,
          swingBtc,
          undefined,
          undefined,
          extremaLocationModeUsed,
        )
      : undefined;
  const rawUpAskEmaExtremaFull =
    defaultEmaAskFocus && hasCents
      ? extremaFromPicked(
          upAskEma,
          fullTimesMs,
          structuralHysteresisQuoteUsed,
          sustainedTangentMsUsed,
          clusterSamples,
          swingQuote,
          { maxExclusive: valleyAskMaxExclusiveUsed, askPicked: upAsk },
          upBid,
          extremaLocationModeUsed,
        )
      : undefined;
  const rawDownAskEmaExtremaFull =
    defaultEmaAskFocus && hasCents
      ? extremaFromPicked(
          downAskEma,
          fullTimesMs,
          structuralHysteresisQuoteUsed,
          sustainedTangentMsUsed,
          clusterSamples,
          swingQuote,
          { maxExclusive: valleyAskMaxExclusiveUsed, askPicked: downAsk },
          downBid,
          extremaLocationModeUsed,
        )
      : undefined;

  const upAskEmaExtremaFull =
    rawUpAskEmaExtremaFull && altAskRawFilterOn
      ? filterAlternatingAskSwingCents(
          rawUpAskEmaExtremaFull.peaks,
          rawUpAskEmaExtremaFull.valleys,
          upAsk,
          upBid,
          valleyToPeakAskUsed,
          peakToValleyAsk,
          fullTimesMs,
          ANALYSIS_ALTERNATING_MIN_GAP_MS,
        )
      : rawUpAskEmaExtremaFull;
  const downAskEmaExtremaFull =
    rawDownAskEmaExtremaFull && altAskRawFilterOn
      ? filterAlternatingAskSwingCents(
          rawDownAskEmaExtremaFull.peaks,
          rawDownAskEmaExtremaFull.valleys,
          downAsk,
          downBid,
          valleyToPeakAskUsed,
          peakToValleyAsk,
          fullTimesMs,
          ANALYSIS_ALTERNATING_MIN_GAP_MS,
        )
      : rawDownAskEmaExtremaFull;

  const btcEmaExtrema =
    rawBtcEmaExtremaFull != null ? mapExtremaSetsToChartBuckets(rawBtcEmaExtremaFull, idx) : undefined;
  const upAskEmaExtrema =
    upAskEmaExtremaFull != null ? mapExtremaSetsToChartBuckets(upAskEmaExtremaFull, idx) : undefined;
  const downAskEmaExtrema =
    downAskEmaExtremaFull != null ? mapExtremaSetsToChartBuckets(downAskEmaExtremaFull, idx) : undefined;

  const possibleSignalOverlay = useMemo(() => {
    const empty = {
      buyData: [] as (number | null)[],
      sellData: [] as (number | null)[],
      buyTips: [] as (string | null)[],
      sellTips: [] as (string | null)[],
    };
    if (!showPossibleSignalPositions || !hasCents || idx.length === 0) return empty;
    const L = idx.length;
    const buyData: (number | null)[] = Array.from({ length: L }, () => null);
    const sellData: (number | null)[] = Array.from({ length: L }, () => null);
    const buyTips: (string | null)[] = Array.from({ length: L }, () => null);
    const sellTips: (string | null)[] = Array.from({ length: L }, () => null);

    const add = (
      target: (number | null)[],
      tips: (string | null)[],
      j: number,
      y: number | null,
      tip: string,
    ) => {
      if (y == null || !Number.isFinite(y)) return;
      if (target[j] == null) target[j] = y;
      tips[j] = tips[j] ? `${tips[j]} | ${tip}` : tip;
    };

    if (upAskEmaExtrema) {
      for (const j of upAskEmaExtrema.valleys) {
        add(
          buyData,
          buyTips,
          j,
          upAskEmaPicked[j] ?? null,
          `Possible open · YES valley · smoothed ask ${(upAskEmaPicked[j] ?? Number.NaN).toFixed(2)}¢`,
        );
      }
      for (const j of upAskEmaExtrema.peaks) {
        add(
          sellData,
          sellTips,
          j,
          upAskEmaPicked[j] ?? null,
          `Possible close · YES peak · smoothed ask ${(upAskEmaPicked[j] ?? Number.NaN).toFixed(2)}¢`,
        );
      }
    }
    if (downAskEmaExtrema) {
      for (const j of downAskEmaExtrema.valleys) {
        add(
          buyData,
          buyTips,
          j,
          downAskEmaPicked[j] ?? null,
          `Possible open · NO valley · smoothed ask ${(downAskEmaPicked[j] ?? Number.NaN).toFixed(2)}¢`,
        );
      }
      for (const j of downAskEmaExtrema.peaks) {
        add(
          sellData,
          sellTips,
          j,
          downAskEmaPicked[j] ?? null,
          `Possible close · NO peak · smoothed ask ${(downAskEmaPicked[j] ?? Number.NaN).toFixed(2)}¢`,
        );
      }
    }

    return { buyData, sellData, buyTips, sellTips };
  }, [showPossibleSignalPositions, hasCents, idx, upAskEmaExtrema, downAskEmaExtrema, upAskEmaPicked, downAskEmaPicked]);

  const positionOverlay = useMemo(() => {
    const empty = {
      buyData: [] as (number | null)[],
      sellData: [] as (number | null)[],
      buyTips: [] as (string | null)[],
      sellTips: [] as (string | null)[],
    };
    if (!hasCents || sorted.length === 0) return empty;
    const ws = positionWindow?.start_ms;
    const we = positionWindow?.end_ms;
    if (typeof ws !== "number" || typeof we !== "number") return empty;
    const L = idx.length;
    const buyData: (number | null)[] = Array.from({ length: L }, () => null);
    const sellData: (number | null)[] = Array.from({ length: L }, () => null);
    const buyTips: (string | null)[] = Array.from({ length: L }, () => null);
    const sellTips: (string | null)[] = Array.from({ length: L }, () => null);

    const smoothedAtChartIndex = (sideU: string, j: number, fallbackCents: number): number => {
      const y =
        sideU === "YES"
          ? upAskEmaPicked[j]
          : sideU === "NO"
            ? downAskEmaPicked[j]
            : null;
      return y != null && Number.isFinite(y) ? y : fallbackCents;
    };

    const useSignalEvents =
      String(runMeta?.strategy_name ?? "").trim().toLowerCase() === "mike_v1" &&
      Array.isArray(strategyDebugEvents) &&
      strategyDebugEvents.length > 0;

    if (useSignalEvents) {
      for (const row of strategyDebugEvents) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        if (r.phase !== "accepted_extrema") continue;
        const kind = r.kind;
        const sideRaw = r.side;
        if ((kind !== "valley" && kind !== "peak") || (sideRaw !== "yes" && sideRaw !== "no")) continue;
        const ts = typeof r.ts_ms === "number" && Number.isFinite(r.ts_ms) ? r.ts_ms : null;
        if (ts == null || ts < ws || ts >= we) continue;
        const anchorTs =
          typeof r.emitted_ts_ms === "number" && Number.isFinite(r.emitted_ts_ms) ? r.emitted_ts_ms : ts;
        const side = String(sideRaw).toUpperCase();
        const fi = nearestSortedIndexByTime(sorted, ts);
        const j = mapFullIndexToChartBucket(fi, idx);
        const y = smoothedAtChartIndex(side, j, Number.NaN);
        if (!Number.isFinite(y)) continue;
        if (kind === "valley") {
          buyData[j] = y;
          buyTips[j] =
            `Open (signal confirm) · ${side} · confirm ${formatTs(ts)} · anchor ${formatTs(anchorTs)} · ` +
            `smoothed ${side} ask ${y.toFixed(2)}¢`;
        } else {
          sellData[j] = y;
          sellTips[j] =
            `Close (signal confirm) · ${side} · confirm ${formatTs(ts)} · anchor ${formatTs(anchorTs)} · ` +
            `smoothed ${side} ask ${y.toFixed(2)}¢`;
        }
      }
      return { buyData, sellData, buyTips, sellTips };
    }

    if (!positionTrades?.length) return empty;

    for (const t of positionTrades) {
      const side = String(t.side).toUpperCase();
      if (Number.isFinite(t.opened_ts_ms) && t.opened_ts_ms >= ws && t.opened_ts_ms < we) {
        const fi = nearestSortedIndexByTime(sorted, t.opened_ts_ms);
        const j = mapFullIndexToChartBucket(fi, idx);
        const fillC = t.entry_price * 100;
        const y = smoothedAtChartIndex(side, j, fillC);
        buyData[j] = y;
        buyTips[j] = `Open · ${side} · fill ${fillC.toFixed(2)}¢ · smoothed ${side} ask ${y.toFixed(2)}¢ · qty ${t.quantity}`;
      }
      if (Number.isFinite(t.closed_ts_ms) && t.closed_ts_ms >= ws && t.closed_ts_ms < we) {
        const fi = nearestSortedIndexByTime(sorted, t.closed_ts_ms);
        const j = mapFullIndexToChartBucket(fi, idx);
        const fillC = t.exit_price * 100;
        const y = smoothedAtChartIndex(side, j, fillC);
        sellData[j] = y;
        sellTips[j] = `Close · ${side} · fill ${fillC.toFixed(2)}¢ · smoothed ${side} ask ${y.toFixed(2)}¢ · qty ${t.quantity} · PnL ${formatMoney(t.realized_pnl)}`;
      }
    }
    return { buyData, sellData, buyTips, sellTips };
  }, [positionTrades, positionWindow, hasCents, sorted, idx, upAskEmaPicked, downAskEmaPicked, runMeta, strategyDebugEvents]);

  const datasets: ChartDataset<"line", (number | null)[]>[] = [];

  const line = (
    label: string,
    data: (number | null)[],
    color: string,
    yAxisID: "y" | "y1",
    dashed: boolean,
    emaExtrema?: EmaExtremaSets,
  ) => {
    const base: ChartDataset<"line", (number | null)[]> = {
      label,
      data,
      borderColor: color,
      backgroundColor: `${color}33`,
      fill: false,
      borderWidth: 1,
      tension: 0,
      pointRadius: 0,
      borderDash: dashed ? [6, 4] : undefined,
      spanGaps: false,
      yAxisID,
      ...(defaultEmaAskFocus ? { hidden: !defaultVisibleEma.has(label) } : {}),
    };

    if (!emaExtrema) return base;

    const scriptPoint = (ctx: ScriptableContext<"line">) => {
      const i = ctx.dataIndex;
      return emaExtrema.peaks.has(i) || emaExtrema.valleys.has(i);
    };

    return {
      ...base,
      pointRadius: (ctx: ScriptableContext<"line">) => (scriptPoint(ctx) ? 5 : 0),
      pointHoverRadius: (ctx: ScriptableContext<"line">) => (scriptPoint(ctx) ? 7 : 0),
      pointBackgroundColor: (ctx: ScriptableContext<"line">) => {
        const i = ctx.dataIndex;
        if (emaExtrema.peaks.has(i)) return EXTREMA_MARKER_SELL_BG;
        if (emaExtrema.valleys.has(i)) return EXTREMA_MARKER_BUY_BG;
        return "transparent";
      },
      pointBorderColor: (ctx: ScriptableContext<"line">) => {
        const i = ctx.dataIndex;
        if (emaExtrema.peaks.has(i)) return EXTREMA_MARKER_SELL_BORDER;
        if (emaExtrema.valleys.has(i)) return EXTREMA_MARKER_BUY_BORDER;
        return "transparent";
      },
      pointBorderWidth: (ctx: ScriptableContext<"line">) => (scriptPoint(ctx) ? 1 : 0),
      pointStyle: (ctx: ScriptableContext<"line">) => {
        const i = ctx.dataIndex;
        if (emaExtrema.peaks.has(i) || emaExtrema.valleys.has(i)) return "triangle" as const;
        return "circle" as const;
      },
      pointRotation: (ctx: ScriptableContext<"line">) => {
        const i = ctx.dataIndex;
        if (emaExtrema.peaks.has(i)) return 0;
        if (emaExtrema.valleys.has(i)) return 180;
        return 0;
      },
    };
  };

  if (hasBtc) {
    datasets.push(line("BTC spot", pick(btc), "#fbbf24", "y", false));
    datasets.push(
      line(smoothedDatasetLabel("BTC", noiseFilterUsed, span), btcEmaPicked, "#f59e0b", "y", true, btcEmaExtrema),
    );
  }
  if (hasCents) {
    datasets.push(line("Up ask (¢)", pick(upAsk), "#4ade80", "y1", false));
    datasets.push(
      line(
        smoothedDatasetLabel("Up ask", noiseFilterUsed, span),
        upAskEmaPicked,
        "#22c55e",
        "y1",
        true,
        upAskEmaExtrema,
      ),
    );
    datasets.push(line("Up bid (¢)", pick(upBid), "#86efac", "y1", false));
    datasets.push(
      line(smoothedDatasetLabel("Up bid", noiseFilterUsed, span), pick(upBidEma), "#16a34a", "y1", true),
    );
    datasets.push(line("Down ask (¢)", pick(downAsk), "#f87171", "y1", false));
    datasets.push(
      line(
        smoothedDatasetLabel("Down ask", noiseFilterUsed, span),
        downAskEmaPicked,
        "#dc2626",
        "y1",
        true,
        downAskEmaExtrema,
      ),
    );
    datasets.push(line("Down bid (¢)", pick(downBid), "#fca5a5", "y1", false));
    datasets.push(
      line(smoothedDatasetLabel("Down bid", noiseFilterUsed, span), pick(downBidEma), "#b91c1c", "y1", true),
    );

    const anyBuy = positionOverlay.buyData.some((v) => v != null);
    const anySell = positionOverlay.sellData.some((v) => v != null);
    const anyPossibleBuy = possibleSignalOverlay.buyData.some((v) => v != null);
    const anyPossibleSell = possibleSignalOverlay.sellData.some((v) => v != null);
    if (anyPossibleBuy) {
      datasets.push({
        label: "Possible open (signal)",
        type: "line",
        data: possibleSignalOverlay.buyData,
        yAxisID: "y1",
        borderColor: "transparent",
        backgroundColor: "transparent",
        fill: false,
        tension: 0,
        spanGaps: false,
        pointRadius: (ctx: ScriptableContext<"line">) =>
          possibleSignalOverlay.buyData[ctx.dataIndex] != null ? 5 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: "#7c3aed",
        pointBorderColor: "#f3e8ff",
        pointBorderWidth: 1.5,
        pointStyle: "triangle",
        pointRotation: 180,
      } as ChartDataset<"line", (number | null)[]>);
    }
    if (anyPossibleSell) {
      datasets.push({
        label: "Possible close (signal)",
        type: "line",
        data: possibleSignalOverlay.sellData,
        yAxisID: "y1",
        borderColor: "transparent",
        backgroundColor: "transparent",
        fill: false,
        tension: 0,
        spanGaps: false,
        pointRadius: (ctx: ScriptableContext<"line">) =>
          possibleSignalOverlay.sellData[ctx.dataIndex] != null ? 5 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fffbeb",
        pointBorderWidth: 1.5,
        pointStyle: "triangle",
        pointRotation: 0,
      } as ChartDataset<"line", (number | null)[]>);
    }
    if (anyBuy) {
      datasets.push({
        label: "Open (position)",
        type: "line",
        data: positionOverlay.buyData,
        yAxisID: "y1",
        borderColor: "transparent",
        backgroundColor: "transparent",
        fill: false,
        tension: 0,
        spanGaps: false,
        pointRadius: (ctx: ScriptableContext<"line">) =>
          positionOverlay.buyData[ctx.dataIndex] != null ? 7 : 0,
        pointHoverRadius: 9,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointStyle: "triangle",
        pointRotation: 180,
      } as ChartDataset<"line", (number | null)[]>);
    }
    if (anySell) {
      datasets.push({
        label: "Close (position)",
        type: "line",
        data: positionOverlay.sellData,
        yAxisID: "y1",
        borderColor: "transparent",
        backgroundColor: "transparent",
        fill: false,
        tension: 0,
        spanGaps: false,
        pointRadius: (ctx: ScriptableContext<"line">) =>
          positionOverlay.sellData[ctx.dataIndex] != null ? 7 : 0,
        pointHoverRadius: 9,
        pointBackgroundColor: "#ea580c",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointStyle: "triangle",
        pointRotation: 0,
      } as ChartDataset<"line", (number | null)[]>);
    }
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { boxWidth: 10, font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const di = ctx.dataIndex;
            if (ctx.dataset.label === "Possible open (signal)" && possibleSignalOverlay.buyTips[di]) {
              return possibleSignalOverlay.buyTips[di]!;
            }
            if (ctx.dataset.label === "Possible close (signal)" && possibleSignalOverlay.sellTips[di]) {
              return possibleSignalOverlay.sellTips[di]!;
            }
            if (ctx.dataset.label === "Open (position)" && positionOverlay.buyTips[di]) {
              return positionOverlay.buyTips[di]!;
            }
            if (ctx.dataset.label === "Close (position)" && positionOverlay.sellTips[di]) {
              return positionOverlay.sellTips[di]!;
            }
            const v = ctx.parsed.y;
            if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label}: —`;
            const id = ctx.dataset.yAxisID;
            return `${ctx.dataset.label}: ${id === "y" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : `${v.toFixed(2)}¢`}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8 } },
      ...(hasBtc
        ? {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: { display: true, text: "BTC (USD)" },
            },
          }
        : {}),
      ...(hasCents
        ? {
            y1: {
              type: "linear",
              display: true,
              position: hasBtc ? "right" : "left",
              min: 0,
              max: 100,
              title: { display: true, text: "Up / Down (¢)" },
              grid: { drawOnChartArea: !hasBtc },
            },
          }
        : {}),
    },
  };

  const chartOptions = options;

  if (!sorted.length) {
    return (
      <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
          No samples in this window.
        </Box>
      </Box>
    );
  }

  if (!hasBtc && !hasCents) {
    return (
      <Box sx={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
          No BTC or YES/NO quote fields on these ticks.
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {defaultEmaAskFocus && !graphOnly ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ sm: "center" }}
          sx={{ mb: 1, flexWrap: "wrap" }}
        >
          <FormControl size="small" sx={{ minWidth: 168 }}>
            <InputLabel id="analysis-ema-span-label">Filter span</InputLabel>
            <Select
              labelId="analysis-ema-span-label"
              label="Filter span"
              value={emaSpan}
              onChange={(e) => setEmaSpan(Number(e.target.value))}
            >
              {ANALYSIS_EMA_SPAN_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s} samples
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="analysis-noise-filter-label">Noise filter</InputLabel>
            <Select
              labelId="analysis-noise-filter-label"
              label="Noise filter"
              value={noiseFilter}
              onChange={(e) => setNoiseFilter(e.target.value as NoiseFilterId)}
            >
              {NOISE_FILTER_OPTIONS.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasCents ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="analysis-hyst-quote-label">Structural Δ (¢)</InputLabel>
              <Select
                labelId="analysis-hyst-quote-label"
                label="Structural Δ (¢)"
                value={structuralHysteresisQuote}
                onChange={(e) => setStructuralHysteresisQuote(Number(e.target.value))}
              >
                {ANALYSIS_STRUCTURAL_HYSTERESIS_QUOTE_CENTS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}¢ hysteresis
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          {hasBtc ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="analysis-hyst-btc-label">Structural Δ ($)</InputLabel>
              <Select
                labelId="analysis-hyst-btc-label"
                label="Structural Δ ($)"
                value={structuralHysteresisBtc}
                onChange={(e) => setStructuralHysteresisBtc(Number(e.target.value))}
              >
                {ANALYSIS_STRUCTURAL_HYSTERESIS_BTC_USD.map((x) => (
                  <MenuItem key={x} value={x}>
                    ${x} hysteresis
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="analysis-sustained-label">Sustained tangent</InputLabel>
            <Select
              labelId="analysis-sustained-label"
              label="Sustained tangent"
              value={sustainedTangentMs}
              onChange={(e) => setSustainedTangentMs(Number(e.target.value))}
            >
              {ANALYSIS_SUSTAINED_TANGENT_MS_OPTIONS.map((ms) => (
                <MenuItem key={ms} value={ms}>
                  {ms} ms
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel id="analysis-extrema-location-label">Extrema location</InputLabel>
            <Select
              labelId="analysis-extrema-location-label"
              label="Extrema location"
              value={extremaLocationMode}
              onChange={(e) => setExtremaLocationMode(e.target.value as ExtremaLocationMode)}
            >
              {ANALYSIS_EXTREMA_LOCATION_MODE_OPTIONS.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="analysis-cluster-label">Merge extrema within</InputLabel>
            <Select
              labelId="analysis-cluster-label"
              label="Merge extrema within"
              value={extremaClusterMinSamples}
              onChange={(e) => setExtremaClusterMinSamples(Number(e.target.value))}
            >
              {ANALYSIS_EXTREMA_CLUSTER_MIN_SAMPLES_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n === 0 ? "Off (every marker)" : `${n} samples · sharpest slope`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasBtc ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="analysis-swing-btc-label">BTC smoothed min leg ($)</InputLabel>
              <Select
                labelId="analysis-swing-btc-label"
                label="BTC smoothed min leg ($)"
                value={minLegSwingBtcUsd}
                onChange={(e) => setMinLegSwingBtcUsd(Number(e.target.value))}
              >
                {ANALYSIS_MIN_LEG_SWING_BTC_USD.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x === 0 ? "Off" : `$${x} each leg`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          {hasCents ? (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="analysis-swing-quote-label">Quote smoothed min leg (¢)</InputLabel>
              <Select
                labelId="analysis-swing-quote-label"
                label="Quote smoothed min leg (¢)"
                value={minLegSwingQuoteCents}
                onChange={(e) => setMinLegSwingQuoteCents(Number(e.target.value))}
              >
                {ANALYSIS_MIN_LEG_SWING_QUOTE_CENTS.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x === 0 ? "Off" : `${x}¢ each leg`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          {hasCents ? (
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="analysis-v2p-ask-label">Valley→peak raw ask min (¢)</InputLabel>
              <Select
                labelId="analysis-v2p-ask-label"
                label="Valley→peak raw ask min (¢)"
                value={valleyToPeakAsk}
                onChange={(e) => setValleyToPeakAsk(Number(e.target.value))}
              >
                {ANALYSIS_ALTERNATING_ASK_SWING_CENTS.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x === 0
                      ? "0¢ (no min · all smoothed extrema)"
                      : `${x}¢ min · peak bid − valley ask`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 720 }}>
            Peaks/valleys use structural hysteresis + sustained slope. <strong>Merge</strong> collapses nearby markers.{" "}
            <strong>Min leg</strong> widens the Schmitt band (USD on BTC smoothed line, ¢ on quote smoothed line).{" "}
            <strong>Valley→peak spread min</strong> filters Up/Down ask markers (peak raw bid − valley raw ask);
            chain starts at the first valley; peak→valley has no minimum; consecutive markers must be ≥{" "}
            {ANALYSIS_ALTERNATING_MIN_GAP_MS} ms apart when the valley→peak min is greater than 0¢.
          </Typography>
        </Stack>
      ) : null}
      {!graphOnly && !renderAll ? (
        <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 0.5 }}>
          Plotting {cap.toLocaleString()} of {sorted.length.toLocaleString()} ticks — narrow the time range or pass{" "}
          <code>maxRenderPoints=Infinity</code> to draw all loaded points (heavier).
        </Typography>
      ) : !graphOnly && maxRenderPoints === Infinity && sorted.length >= LARGE_UNCAPPED_HINT ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Plotting all {sorted.length.toLocaleString()} merged ticks in this window (poly_btc + up_down).
        </Typography>
      ) : null}
      {graphOnly && defaultEmaAskFocus ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Signals: <strong style={{ color: "#ef4444" }}>red ▼</strong> = buy (valley),{" "}
          <strong style={{ color: "#22c55e" }}>green ▲</strong> = sell (peak).
          {positionTrades?.length && positionWindow ? (
            <>
              {" "}
              Fills: <strong style={{ color: "#2563eb" }}>blue ●</strong> = open,{" "}
              <strong style={{ color: "#ea580c" }}>orange ◆</strong> = close (Y = smoothed ask on that leg).
              {" "}
              Triangles on <strong>green</strong> = Up (YES) extrema; on <strong>red</strong> = Down (NO) extrema — same
              two-leg logic as the engine.
            </>
          ) : null}
        </Typography>
      ) : null}
      {defaultEmaAskFocus && !graphOnly ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Markers: red = buy (valley), green = sell (peak). Smoothed peaks / valleys (causal): Schmitt-style extrema on{" "}
          {noiseFilterShortLabel(noiseFilterUsed)} — only data through bar <code>k</code>, no later ticks.
          If no strict peak within 30s after a valley, peak is the first bar where the max price since that valley is hit.
          {hasCents
            ? ` Quote valleys only when raw ask < ${valleyAskMaxExclusiveUsed}¢ · Quote Δ ${structuralHysteresisQuoteUsed}¢`
            : ""}
          {hasBtc ? ` · BTC Δ $${structuralHysteresisBtcUsed}` : ""}
          {` · sustained ${sustainedTangentMsUsed} ms`}
          {clusterSamples > 0 ? ` · merge ≤ ${clusterSamples} samples` : ""}
          {swingBtc > 0 ? ` · BTC min leg ≥ $${swingBtc}` : ""}
          {swingQuote > 0 ? ` · quote min leg ≥ ${swingQuote}¢` : ""}
          {altAskRawFilterOn
            ? ` · valley→peak (peak bid − valley ask) ≥ ${valleyToPeakAskUsed}¢ · peak→valley off · ≥ ${ANALYSIS_ALTERNATING_MIN_GAP_MS} ms between markers`
            : ""}
          .
        </Typography>
      ) : null}
      <Box sx={{ height: graphOnly ? 480 : defaultEmaAskFocus ? 380 : 420 }}>
        <Line data={{ labels, datasets }} options={chartOptions} />
      </Box>
    </Box>
  );
}
