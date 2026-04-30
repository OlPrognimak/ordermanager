import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { ChartOptions } from "chart.js";
import { useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { EquityPoint } from "@/api/types";
import { buildBtcCandles } from "@/utils/btcCandles";
import { formatTsUtc } from "@/utils/format";
import { registerCharts } from "./chartRegister";

registerCharts();

const DEFAULT_INTERVAL_MS = 10_000;

export const BTC_CANDLE_INTERVAL_OPTIONS = [
  { label: "3s", ms: 3_000 },
  { label: "5s", ms: 5_000 },
  { label: "7s", ms: 7_000 },
  { label: "10s", ms: 10_000 },
  { label: "15s", ms: 15_000 },
  { label: "20s", ms: 20_000 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
] as const;

export default function BtcCandleChart({
  points,
  windowStartMs,
  windowEndMs,
}: {
  points: EquityPoint[];
  windowStartMs: number;
  windowEndMs: number;
}) {
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);

  const candles = useMemo(
    () => buildBtcCandles(points, windowStartMs, windowEndMs, intervalMs),
    [points, windowStartMs, windowEndMs, intervalMs],
  );

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: "BTC",
          data: candles,
          borderWidth: 1,
          // CandlestickElement compares pixel Y: smaller Y is higher on screen, so `close < open` is a visually “up” body (bullish) → `.up`.
          borderColors: {
            up: "#4ade80",
            down: "#f87171",
            unchanged: "#94a3b8",
          },
          backgroundColors: {
            up: "rgba(74,222,128,0.35)",
            down: "rgba(248,113,113,0.35)",
            unchanged: "rgba(148,163,184,0.35)",
          },
        },
      ],
    }),
    [candles],
  );

  const options: ChartOptions<"candlestick"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0]?.raw as { x?: number } | undefined;
              const x = raw?.x;
              return x != null && Number.isFinite(x) ? formatTsUtc(x) : "";
            },
            label: (ctx) => {
              const raw = ctx.raw as { o?: number; h?: number; l?: number; c?: number };
              const { o, h, l, c } = raw;
              if (
                typeof o !== "number" ||
                typeof h !== "number" ||
                typeof l !== "number" ||
                typeof c !== "number" ||
                ![o, h, l, c].every(Number.isFinite)
              ) {
                return "";
              }
              return [`O ${o.toFixed(2)}`, `H ${h.toFixed(2)}`, `L ${l.toFixed(2)}`, `C ${c.toFixed(2)}`];
            },
          },
        },
      },
      scales: {
        x: {
          type: "timeseries",
          min: windowStartMs,
          max: windowEndMs,
          adapters: {
            date: {
              zone: "utc",
            },
          },
          ticks: {
            maxRotation: 0,
            maxTicksLimit: 8,
          },
          time: {
            displayFormats: {
              millisecond: "HH:mm:ss",
              second: "HH:mm:ss",
              minute: "HH:mm",
            },
          },
        },
        y: {
          title: { display: true, text: "BTC (USD)" },
        },
      },
    }),
    [windowStartMs, windowEndMs],
  );

  const label = BTC_CANDLE_INTERVAL_OPTIONS.find((o) => o.ms === intervalMs)?.label ?? `${intervalMs} ms`;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 1 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="btc-candle-interval-label">Candle interval</InputLabel>
          <Select
            labelId="btc-candle-interval-label"
            label="Candle interval"
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
          >
            {BTC_CANDLE_INTERVAL_OPTIONS.map((o) => (
              <MenuItem key={o.ms} value={o.ms}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          BTC OHLC from spot ticks · {label} buckets from round start · {candles.length.toLocaleString()} candle
          {candles.length === 1 ? "" : "s"}
        </Typography>
      </Stack>
      {candles.length === 0 ? (
        <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No BTC <code>price</code> samples in this window for the chosen interval.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ height: 280 }}>
          <Chart type="candlestick" data={data} options={options} />
        </Box>
      )}
    </Box>
  );
}
