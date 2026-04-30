import { Box, Button, Stack, Typography } from "@mui/material";
import type { ChartOptions } from "chart.js";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import type { EquityPoint } from "@/api/types";
import { formatTs } from "@/utils/format";
import { registerCharts } from "./chartRegister";

registerCharts();

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.floor(i * step)]!);
  }
  return out;
}

export default function EquityChart({
  points,
  comparePoints,
}: {
  points: EquityPoint[];
  comparePoints?: EquityPoint[];
}) {
  const [range, setRange] = useState<[number, number] | null>(null);

  const filtered = useMemo(() => {
    let p = points;
    if (range) {
      const [a, b] = range;
      p = p.filter((x) => x.timestamp_ms >= a && x.timestamp_ms <= b);
    }
    return downsample(p, 1500);
  }, [points, range]);

  const labels = filtered.map((p) => formatTs(p.timestamp_ms));

  const compareFiltered = useMemo(() => {
    if (!comparePoints?.length) return null;
    let p = comparePoints;
    if (range) {
      const [a, b] = range;
      p = p.filter((x) => x.timestamp_ms >= a && x.timestamp_ms <= b);
    }
    return downsample(p, filtered.length);
  }, [comparePoints, range, filtered.length]);

  const datasets = [
    {
      label: "Equity",
      data: filtered.map((p) => p.equity),
      borderColor: "#5eead4",
      backgroundColor: "rgba(94,234,212,0.08)",
      fill: true,
      tension: 0.15,
      pointRadius: 0,
    },
  ];

  if (compareFiltered && compareFiltered.length === filtered.length) {
    datasets.push({
      label: "Compare run",
      data: compareFiltered.map((p) => p.equity),
      borderColor: "#a78bfa",
      backgroundColor: "transparent",
      fill: false,
      tension: 0.15,
      pointRadius: 0,
    });
  }

  const data = { labels, datasets };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8 } },
      y: { ticks: { callback: (v) => `$${v}` } },
    },
  };

  const lo = points[0]?.timestamp_ms;
  const hi = points.at(-1)?.timestamp_ms;

  return (
    <Box sx={{ height: 380 }}>
      {lo != null && hi != null && hi > lo ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Zoom:
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setRange([lo, lo + (hi - lo) / 2])}>
            1st half
          </Button>
          <Button size="small" variant="outlined" onClick={() => setRange([lo + (hi - lo) / 2, hi])}>
            2nd half
          </Button>
          <Button size="small" onClick={() => setRange(null)}>
            Full
          </Button>
        </Stack>
      ) : null}
      <Box sx={{ height: 300 }}>
        <Line data={data} options={options} />
      </Box>
    </Box>
  );
}
