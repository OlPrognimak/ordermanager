import { Box, Button, Stack, Typography } from "@mui/material";
import type { ChartOptions } from "chart.js";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import type { EquityPoint } from "@/api/types";
import { equityToDrawdownSeries } from "@/utils/drawdown";
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

export default function DrawdownChart({ points }: { points: EquityPoint[] }) {
  const [range, setRange] = useState<[number, number] | null>(null);
  const series = useMemo(() => equityToDrawdownSeries(points), [points]);
  const filtered = useMemo(() => {
    let s = series;
    if (range) {
      const [a, b] = range;
      s = s.filter((x) => x.timestamp_ms >= a && x.timestamp_ms <= b);
    }
    return downsample(s, 1500);
  }, [series, range]);

  const data = {
    labels: filtered.map((p) => formatTs(p.timestamp_ms)),
    datasets: [
      {
        label: "Drawdown %",
        data: filtered.map((p) => p.drawdown_pct * 100),
        borderColor: "#f87171",
        backgroundColor: "rgba(248,113,113,0.1)",
        fill: true,
        tension: 0.15,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      x: { ticks: { maxTicksLimit: 8 } },
      y: { ticks: { callback: (v) => `${v}%` } },
    },
  };

  const lo = points[0]?.timestamp_ms;
  const hi = points.at(-1)?.timestamp_ms;

  return (
    <Box sx={{ height: 320 }}>
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
      <Box sx={{ height: 260 }}>
        <Line data={data} options={options} />
      </Box>
    </Box>
  );
}
