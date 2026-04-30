import { Pause, PlayArrow, SkipNext, SkipPrevious } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ChartOptions } from "chart.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { EquityPoint, ReplayMarker } from "@/api/types";
import { usePreferences } from "@/context/PreferencesContext";
import { clampSimulationSpeed, formatSpeedLabel } from "@/constants/simulationSpeed";
import { filterAlternatingAskSwingCents } from "@/utils/alternatingAskExtremaFilter";
import { discreteTangentExtremaIndices } from "@/utils/discreteTangentExtrema";
import { formatMoney, formatTs } from "@/utils/format";
import { EXTREMA_MARKER_BUY_BG, EXTREMA_MARKER_SELL_BG } from "@/utils/extremaMarkerStyle";
import { applyNoiseFilter } from "@/utils/noiseFilters";
import { registerCharts } from "./chartRegister";

registerCharts();

/** Simulated ms advanced per wall ms while playing (same numeric range as mock job speed). */
const REPLAY_SPEED_CHOICES = [0.5, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 10, 12, 16, 20] as const;
const ANALYSIS_OVERLAY_SPAN = 20;
const ANALYSIS_OVERLAY_FILTER = "gaussian" as const;
const ANALYSIS_OVERLAY_HYSTERESIS_CENTS = 0.1;
const ANALYSIS_OVERLAY_SUSTAINED_MS = 1000;
const ANALYSIS_OVERLAY_VALLEY_ASK_MAX = 45;
const ANALYSIS_OVERLAY_V2P_MIN = 10;
const ANALYSIS_OVERLAY_MIN_GAP_MS = 1000;

type XY = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** First index i with sorted[i].timestamp_ms > endMs, or sorted.length if none. */
function firstIndexAfterTs(sorted: EquityPoint[], endMs: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]!.timestamp_ms <= endMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Ticks for line paths: all samples with ts ≤ endMs, plus one interpolated point at endMs so the
 * trace reaches the playhead smoothly between grid timestamps.
 */
function ticksForLineSeries(sorted: EquityPoint[], endMs: number): EquityPoint[] {
  if (!sorted.length) return [];
  if (endMs <= sorted[0]!.timestamp_ms) return [sorted[0]!];

  const after = firstIndexAfterTs(sorted, endMs);
  if (after === 0) return [sorted[0]!];

  const base = sorted.slice(0, after);
  const last = base[base.length - 1]!;
  // endMs can overshoot the final tick by a tiny amount during RAF stepping.
  // In that case there is no "next" sample to interpolate against.
  if (after >= sorted.length) return base;
  if (last.timestamp_ms >= endMs) return base;

  const next = sorted[after]!;
  const span = next.timestamp_ms - last.timestamp_ms;
  const u = span > 0 ? (endMs - last.timestamp_ms) / span : 0;
  const t = Math.max(0, Math.min(1, u));

  const syn: EquityPoint = {
    ...last,
    timestamp_ms: endMs,
    price: lerp(last.price!, next.price!, t),
    yes: lerp(last.yes!, next.yes!, t),
    no: lerp(last.no!, next.no!, t),
  };
  if (last.yes_bid != null && next.yes_bid != null) syn.yes_bid = lerp(last.yes_bid, next.yes_bid, t);
  if (last.yes_ask != null && next.yes_ask != null) syn.yes_ask = lerp(last.yes_ask, next.yes_ask, t);
  if (last.no_bid != null && next.no_bid != null) syn.no_bid = lerp(last.no_bid, next.no_bid, t);
  if (last.no_ask != null && next.no_ask != null) syn.no_ask = lerp(last.no_ask, next.no_ask, t);
  if (Number.isFinite(last.equity) && Number.isFinite(next.equity)) syn.equity = lerp(last.equity, next.equity, t);
  if (Number.isFinite(last.cash) && Number.isFinite(next.cash)) syn.cash = lerp(last.cash, next.cash, t);
  if (Number.isFinite(last.unrealized_pnl) && Number.isFinite(next.unrealized_pnl)) {
    syn.unrealized_pnl = lerp(last.unrealized_pnl, next.unrealized_pnl, t);
  }

  return [...base, syn];
}

function ticksForDiscreteSeries(sorted: EquityPoint[], endMs: number): EquityPoint[] {
  if (!sorted.length) return [];
  const out = sorted.filter((p) => p.timestamp_ms <= endMs);
  return out.length ? out : [sorted[0]!];
}

function fmtCents(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}

function fmtStrategyVar(v: unknown): string {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NaN";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (v == null) return "null";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Debug rows often repeat YES/NO mids already shown in the book line above. */
const DEBUG_KEYS_REDUNDANT_WITH_BOOK = new Set(["yes", "no"]);

function downsampleSeries<T extends { timestamp_ms: number }>(
  pts: T[],
  pick: (p: T) => XY,
  max: number,
): XY[] {
  if (pts.length <= max) return pts.map(pick);
  const out: XY[] = [];
  const last = pts.length - 1;
  for (let j = 0; j < max; j++) {
    const idx = Math.round((j * last) / (max - 1));
    out.push(pick(pts[idx]!));
  }
  return out;
}

function scatterDataset(
  markers: ReplayMarker[],
  kind: ReplayMarker["kind"],
  label: string,
  color: string,
  border: string,
  pointStyle: string,
  pointRadius = 7,
) {
  return {
    type: "scatter" as const,
    label,
    data: markers
      .filter((m) => m.kind === kind)
      .map((m) => ({
        x: m.timestamp_ms,
        y: m.quote_cents,
        usd: m.usd_amount ?? (m.quantity * m.quote_cents) / 100,
      })),
    yAxisID: "y1",
    backgroundColor: color,
    borderColor: border,
    pointRadius,
    pointStyle,
    showLine: false,
    parsing: { xAxisKey: "x", yAxisKey: "y" },
  };
}

function useSortedMarketTicks(ticks: EquityPoint[]) {
  return useMemo(() => {
    const raw = ticks.filter(
      (p) => p.price != null && p.yes != null && p.no != null && Number.isFinite(p.timestamp_ms),
    );
    if (!raw.length) return null;
    const sorted = [...raw].sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    const xMin = sorted[0]!.timestamp_ms;
    const xMax = sorted[sorted.length - 1]!.timestamp_ms;
    return { sorted, xMin, xMax };
  }, [ticks]);
}

export default function MarketReplayChart({
  ticks,
  markers,
  title = "Market replay — BTC spot & YES/NO quotes",
  subtitle,
  showQuotePanel = true,
  strategyName,
  strategyParams,
  strategyDebugEvents,
  /** When false (e.g. live mock job), show full series and hide scrubber / play. */
  playbackControls = true,
  /** Downsample BTC line only; YES/NO paths stay full resolution. Default 1200. */
  maxBtcLinePoints = 1200,
}: {
  ticks: EquityPoint[];
  markers: ReplayMarker[];
  title?: string;
  subtitle?: string;
  showQuotePanel?: boolean;
  strategyName?: string;
  strategyParams?: Record<string, unknown> | null;
  strategyDebugEvents?: Record<string, unknown>[] | null;
  playbackControls?: boolean;
  maxBtcLinePoints?: number;
}) {
  const maxPts = Math.max(200, Math.min(500_000, maxBtcLinePoints));
  const { replayUi, setReplayUi } = usePreferences();
  const replaySpeed = clampSimulationSpeed(replayUi.marketReplaySpeed);
  const dataBounds = useSortedMarketTicks(ticks);
  const boundsRef = useRef({ xMin: 0, xMax: 0 });
  const [playheadMs, setPlayheadMs] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(true);

  const boundsKey = dataBounds ? `${dataBounds.xMin}:${dataBounds.xMax}:${dataBounds.sorted.length}` : "";

  useEffect(() => {
    if (!dataBounds) {
      setPlayheadMs(null);
      setPlaying(false);
      return;
    }
    boundsRef.current = { xMin: dataBounds.xMin, xMax: dataBounds.xMax };
    setPlayheadMs(replayUi.marketReplayStartAtEnd ? dataBounds.xMax : dataBounds.xMin);
    setPlaying(false);
  }, [boundsKey, dataBounds, replayUi.marketReplayStartAtEnd]);

  const endMs =
    playbackControls === false
      ? (dataBounds?.xMax ?? 0)
      : (playheadMs ?? dataBounds?.xMax ?? 0);

  const { visibleTicks, visibleMarkers, lastTick, xMin, xMax } = useMemo(() => {
    if (!dataBounds) {
      return {
        visibleTicks: [] as EquityPoint[],
        visibleMarkers: [] as ReplayMarker[],
        lastTick: null as EquityPoint | null,
        xMin: 0,
        xMax: 0,
      };
    }
    const { sorted, xMin: x0, xMax: x1 } = dataBounds;
    const lineTicks = replayUi.marketReplayDiscreteOnly
      ? ticksForDiscreteSeries(sorted, endMs)
      : ticksForLineSeries(sorted, endMs);
    const last = lineTicks.length ? lineTicks[lineTicks.length - 1]! : null;
    const vm = markers.filter((m) => m.timestamp_ms <= endMs);
    return { visibleTicks: lineTicks, visibleMarkers: vm, lastTick: last, xMin: x0, xMax: x1 };
  }, [dataBounds, endMs, markers, replayUi.marketReplayDiscreteOnly]);

  useEffect(() => {
    if (!playbackControls || !playing || !dataBounds) return;
    let raf = 0;
    let lastWall = performance.now();
    const loop = (now: number) => {
      const dt = now - lastWall;
      lastWall = now;
      const xMaxB = boundsRef.current.xMax;
      setPlayheadMs((ph) => {
        const base = ph ?? xMaxB;
        const next = base + dt * replaySpeed;
        if (next >= xMaxB) {
          queueMicrotask(() => setPlaying(false));
          return xMaxB;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, replaySpeed, playbackControls, dataBounds]);

  const chartData = useMemo(() => {
    if (!dataBounds || !visibleTicks.length) return null;
    const t = visibleTicks;
    const tDiscrete = dataBounds.sorted.filter((p) => p.timestamp_ms <= endMs);
    const btc = downsampleSeries(
      t,
      (p) => ({ x: p.timestamp_ms, y: p.price! }),
      t.length <= maxPts ? t.length : maxPts,
    );
    // Render YES/NO with replay path behavior (same as previous chart style).
    const yes = t.map((p) => ({ x: p.timestamp_ms, y: (p.yes_ask ?? p.yes)! }));
    const no = t.map((p) => ({ x: p.timestamp_ms, y: (p.no_ask ?? p.no)! }));
    const lineParsing = { xAxisKey: "x", yAxisKey: "y" };

    const datasets: any[] = [
        {
          type: "line" as const,
          label: "BTC (spot)",
          data: btc,
          yAxisID: "y",
          borderColor: "#fbbf24",
          backgroundColor: "rgba(251,191,36,0.08)",
          fill: false,
          tension: 0,
          hidden: true,
          pointRadius: 0,
          parsing: lineParsing,
        },
        {
          type: "line" as const,
          label: "YES ask ¢",
          data: yes,
          yAxisID: "y1",
          borderColor: "#34d399",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.35,
          cubicInterpolationMode: "monotone" as const,
          borderWidth: 1.25,
          pointRadius: 0,
          parsing: lineParsing,
        },
        {
          type: "line" as const,
          label: "NO ask ¢",
          data: no,
          yAxisID: "y1",
          borderColor: "#f87171",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.35,
          cubicInterpolationMode: "monotone" as const,
          borderWidth: 1.25,
          pointRadius: 0,
          parsing: lineParsing,
        },
        scatterDataset(visibleMarkers, "buy_yes", "Buy YES (fill ¢)", "#00ff99", "#065f46", "triangle", 10),
        scatterDataset(visibleMarkers, "buy_no", "Buy NO (fill ¢)", "#00c2ff", "#0c4a6e", "triangle", 10),
        scatterDataset(visibleMarkers, "exit_yes", "YES exit (fill ¢)", "rgba(251,191,36,0.95)", "#b45309", "rectRot", 7),
        scatterDataset(visibleMarkers, "exit_no", "NO exit (fill ¢)", "rgba(248,113,113,0.95)", "#b91c1c", "rectRot", 7),
    ];

    if (showAnalysisOverlay && tDiscrete.length >= 4) {
      const timesMs = tDiscrete.map((p) => p.timestamp_ms);
      const upAskRaw = tDiscrete.map((p) => (p.yes_ask ?? p.yes)!);
      const upBidRaw = tDiscrete.map((p) => (p.yes_bid ?? p.yes)!);
      const downAskRaw = tDiscrete.map((p) => (p.no_ask ?? p.no)!);
      const downBidRaw = tDiscrete.map((p) => (p.no_bid ?? p.no)!);
      const upAskSmooth = applyNoiseFilter(upAskRaw, ANALYSIS_OVERLAY_SPAN, ANALYSIS_OVERLAY_FILTER).map(
        (v, i) => (v == null ? upAskRaw[i]! : v),
      );
      const downAskSmooth = applyNoiseFilter(downAskRaw, ANALYSIS_OVERLAY_SPAN, ANALYSIS_OVERLAY_FILTER).map(
        (v, i) => (v == null ? downAskRaw[i]! : v),
      );
      const upRawExt = discreteTangentExtremaIndices(upAskSmooth, timesMs, {
        structuralHysteresis: ANALYSIS_OVERLAY_HYSTERESIS_CENTS,
        sustainedTangentMs: ANALYSIS_OVERLAY_SUSTAINED_MS,
        maxValleyAskExclusive: ANALYSIS_OVERLAY_VALLEY_ASK_MAX,
        valleyAskSeries: upAskRaw,
        peakBidSeries: upBidRaw,
        anchorToQuoteSeries: true,
      });
      const dnRawExt = discreteTangentExtremaIndices(downAskSmooth, timesMs, {
        structuralHysteresis: ANALYSIS_OVERLAY_HYSTERESIS_CENTS,
        sustainedTangentMs: ANALYSIS_OVERLAY_SUSTAINED_MS,
        maxValleyAskExclusive: ANALYSIS_OVERLAY_VALLEY_ASK_MAX,
        valleyAskSeries: downAskRaw,
        peakBidSeries: downBidRaw,
        anchorToQuoteSeries: true,
      });
      const upExt = filterAlternatingAskSwingCents(
        upRawExt.peaks,
        upRawExt.valleys,
        upAskRaw,
        upBidRaw,
        ANALYSIS_OVERLAY_V2P_MIN,
        0,
        timesMs,
        ANALYSIS_OVERLAY_MIN_GAP_MS,
      );
      const dnExt = filterAlternatingAskSwingCents(
        dnRawExt.peaks,
        dnRawExt.valleys,
        downAskRaw,
        downBidRaw,
        ANALYSIS_OVERLAY_V2P_MIN,
        0,
        timesMs,
        ANALYSIS_OVERLAY_MIN_GAP_MS,
      );
      const upPeaks = new Set([...upExt.peaks]);
      const upVals = new Set([...upExt.valleys]);
      const dnPeaks = new Set([...dnExt.peaks]);
      const dnVals = new Set([...dnExt.valleys]);
      const overlayPoint = (peaks: Set<number>, vals: Set<number>) => (ctx: { dataIndex: number }) =>
        peaks.has(ctx.dataIndex) || vals.has(ctx.dataIndex) ? 4 : 0;
      const overlayBg = (peaks: Set<number>, vals: Set<number>) => (ctx: { dataIndex: number }) => {
        if (peaks.has(ctx.dataIndex)) return EXTREMA_MARKER_SELL_BG;
        if (vals.has(ctx.dataIndex)) return EXTREMA_MARKER_BUY_BG;
        return "transparent";
      };
      datasets.push(
        {
          type: "line" as const,
          label: "YES ask smoothed (analysis)",
          data: tDiscrete.map((p, i) => ({ x: p.timestamp_ms, y: upAskSmooth[i]! })),
          yAxisID: "y1",
          borderColor: "#22c55e",
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: overlayPoint(upPeaks, upVals) as unknown as number,
          pointBackgroundColor: overlayBg(upPeaks, upVals) as unknown as string,
          pointBorderWidth: 0,
          fill: false,
          tension: 0,
          parsing: lineParsing,
        },
        {
          type: "line" as const,
          label: "NO ask smoothed (analysis)",
          data: tDiscrete.map((p, i) => ({ x: p.timestamp_ms, y: downAskSmooth[i]! })),
          yAxisID: "y1",
          borderColor: "#dc2626",
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: overlayPoint(dnPeaks, dnVals) as unknown as number,
          pointBackgroundColor: overlayBg(dnPeaks, dnVals) as unknown as string,
          pointBorderWidth: 0,
          fill: false,
          tension: 0,
          parsing: lineParsing,
        },
      );
    }

    return { datasets };
  }, [dataBounds, visibleTicks, visibleMarkers, maxPts, endMs, showAnalysisOverlay]);

  const options: ChartOptions<"line" | "scatter"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: playing ? false : { duration: 200 },
      transitions: {
        active: { animation: { duration: 0 } },
      },
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            title(items) {
              const x = items[0]?.parsed.x;
              return x != null ? formatTs(Number(x)) : "";
            },
            label(ctx) {
              const raw = ctx.raw as { usd?: number; y?: number } | undefined;
              const yv = ctx.parsed.y;
              const base = `${ctx.dataset.label}: ${typeof yv === "number" ? yv.toFixed(2) : yv}`;
              if (raw && typeof raw.usd === "number") return `${base} · usd ${formatMoney(raw.usd)}`;
              return base;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: xMin,
          max: xMax,
          ticks: {
            maxTicksLimit: 10,
            callback: (v) => formatTs(Number(v)),
          },
        },
        y: {
          position: "left",
          title: { display: true, text: "BTC (USD)" },
        },
        y1: {
          position: "right",
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Outcome quotes (¢)" },
        },
      },
    }),
    [xMin, xMax, playing],
  );

  const onPlayPause = useCallback(() => {
    if (!dataBounds || !playbackControls) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    let start = playheadMs ?? dataBounds.xMax;
    if (start >= dataBounds.xMax - 0.5) start = dataBounds.xMin;
    setPlayheadMs(start);
    setPlaying(true);
  }, [dataBounds, playbackControls, playing, playheadMs]);

  if (!dataBounds || !chartData || !lastTick) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No market ticks yet (waiting for replay data).</Typography>
      </Box>
    );
  }

  const hasBook =
    lastTick.yes_bid != null &&
    lastTick.yes_ask != null &&
    lastTick.no_bid != null &&
    lastTick.no_ask != null;
  let latestDebugEvent: Record<string, unknown> | null = null;
  if (strategyDebugEvents?.length) {
    let bestTs = -1;
    for (const ev of strategyDebugEvents) {
      if (!ev || typeof ev !== "object") continue;
      const ts = Number((ev as Record<string, unknown>).ts_ms);
      if (!Number.isFinite(ts) || ts > endMs) continue;
      if (ts >= bestTs) {
        latestDebugEvent = ev as Record<string, unknown>;
        bestTs = ts;
      }
    }
  }

  const displayStrategyVars = (() => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(strategyParams ?? {})) out[k] = v;
    if (latestDebugEvent) {
      for (const [k, v] of Object.entries(latestDebugEvent)) {
        if (DEBUG_KEYS_REDUNDANT_WITH_BOOK.has(k)) continue;
        out[k] = v;
      }
    }
    return Object.entries(out).sort(([a], [b]) => a.localeCompare(b));
  })();

  const sliderValue = playheadMs ?? xMax;
  const atEnd = sliderValue >= xMax - 0.5;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          mb: 1,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
          <Typography variant="subtitle1" gutterBottom>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {showQuotePanel ? (
          <Box
            sx={{
              flex: "0 0 auto",
              textAlign: "right",
              minWidth: 200,
              maxWidth: 320,
              bgcolor: "action.hover",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 1.25,
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              YES / NO book (¢) · {formatTs(lastTick.timestamp_ms)}
            </Typography>
            {hasBook ? (
              <>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 13 }}>
                  YES bid {fmtCents(lastTick.yes_bid)} · ask {fmtCents(lastTick.yes_ask)}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 13 }}>
                  NO bid {fmtCents(lastTick.no_bid)} · ask {fmtCents(lastTick.no_ask)}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 13 }}>
                YES mid {fmtCents(lastTick.yes)} · NO mid {fmtCents(lastTick.no)}
              </Typography>
            )}
            <Box sx={{ mt: 1, pt: 0.75, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
                Strategy vars{strategyName ? ` · ${strategyName}` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Run params (JSON) + latest debug row ≤ playhead (per strategy).
              </Typography>
              {displayStrategyVars.length ? (
                displayStrategyVars.map(([k, v]) => (
                  <Typography key={k} variant="body2" sx={{ fontFamily: "monospace", fontSize: 12.5 }}>
                    {k}: {fmtStrategyVar(v)}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: 12.5 }}>
                  (none)
                </Typography>
              )}
            </Box>
          </Box>
        ) : null}
      </Box>

      {playbackControls ? (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Tooltip title={playing ? "Pause" : atEnd ? "Play from start" : "Play"}>
              <IconButton
                color="primary"
                onClick={onPlayPause}
                aria-label={playing ? "Pause replay" : "Play replay"}
                size="small"
              >
                {playing ? <Pause /> : <PlayArrow />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Jump to start">
              <IconButton
                size="small"
                onClick={() => {
                  setPlaying(false);
                  setPlayheadMs(dataBounds.xMin);
                }}
                aria-label="Skip to start"
              >
                <SkipPrevious />
              </IconButton>
            </Tooltip>
            <Tooltip title="Jump to end">
              <IconButton
                size="small"
                onClick={() => {
                  setPlaying(false);
                  setPlayheadMs(dataBounds.xMax);
                }}
                aria-label="Skip to end"
              >
                <SkipNext />
              </IconButton>
            </Tooltip>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Replay ×</InputLabel>
              <Select
                label="Replay ×"
                value={replaySpeed}
                onChange={(e) =>
                  setReplayUi({ marketReplaySpeed: clampSimulationSpeed(Number(e.target.value)) })
                }
              >
                {REPLAY_SPEED_CHOICES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {formatSpeedLabel(s)} sim / wall
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              sx={{ ml: 0, mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={replayUi.marketReplayStartAtEnd}
                  onChange={(_, c) => setReplayUi({ marketReplayStartAtEnd: c })}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Open at end
                </Typography>
              }
            />
            <FormControlLabel
              sx={{ ml: 0, mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={replayUi.marketReplayDiscreteOnly}
                  onChange={(_, c) => setReplayUi({ marketReplayDiscreteOnly: c })}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Debug discrete ticks
                </Typography>
              }
            />
            <FormControlLabel
              sx={{ ml: 0, mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={showAnalysisOverlay}
                  onChange={(_, c) => setShowAnalysisOverlay(c)}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Analysis overlay
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", maxWidth: 240 }}>
              Speed &amp; &quot;open at end&quot; are saved in this browser.
            </Typography>
          </Stack>
          <Slider
            size="small"
            min={xMin}
            max={xMax}
            value={sliderValue}
            onChange={(_, v) => {
              setPlaying(false);
              setPlayheadMs(v as number);
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => formatTs(v)}
            aria-label="Replay position"
          />
        </Stack>
      ) : null}

      <Box sx={{ height: 420 }}>
        <Chart type="line" data={chartData} options={options} />
      </Box>
    </Box>
  );
}
