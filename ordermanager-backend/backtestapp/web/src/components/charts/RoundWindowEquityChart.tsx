import { Box } from "@mui/material";
import type { ChartOptions } from "chart.js";
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

export default function RoundWindowEquityChart({ points }: { points: EquityPoint[] }) {
  const filtered = downsample(points, 800);
  const data = {
    labels: filtered.map((p) => formatTs(p.timestamp_ms)),
    datasets: [
      {
        label: "Equity (this window)",
        data: filtered.map((p) => p.equity),
        borderColor: "#5eead4",
        backgroundColor: "rgba(94,234,212,0.12)",
        fill: true,
        tension: 0.2,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "top" },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 6 } },
      y: { ticks: { callback: (v) => `$${v}` } },
    },
  };

  if (!points.length) {
    return (
      <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
          No equity samples in this 5-minute window.
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 280 }}>
      <Line data={data} options={options} />
    </Box>
  );
}
