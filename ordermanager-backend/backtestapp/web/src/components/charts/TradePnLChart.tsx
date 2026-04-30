import { Box } from "@mui/material";
import type { ChartOptions } from "chart.js";
import { Scatter } from "react-chartjs-2";
import type { TradeRow } from "@/api/types";
import { formatTs } from "@/utils/format";
import { registerCharts } from "./chartRegister";

registerCharts();

export default function TradePnLChart({ trades }: { trades: TradeRow[] }) {
  const wins = trades.filter((t) => t.realized_pnl > 0);
  const losses = trades.filter((t) => t.realized_pnl <= 0);

  const data = {
    datasets: [
      {
        label: "Winning closes",
        data: wins.map((t) => ({ x: t.closed_ts_ms, y: t.realized_pnl })),
        backgroundColor: "#34d399",
        pointRadius: 5,
      },
      {
        label: "Losing closes",
        data: losses.map((t) => ({ x: t.closed_ts_ms, y: t.realized_pnl })),
        backgroundColor: "#f87171",
        pointRadius: 5,
      },
    ],
  };

  const options: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = ctx.raw as { x: number; y: number };
            return `${formatTs(p.x)} · P&L ${p.y.toFixed(4)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (ms epoch)" },
      },
      y: {
        title: { display: true, text: "Realized P&L" },
        ticks: { callback: (v) => `$${v}` },
      },
    },
  };

  return (
    <Box sx={{ height: 320 }}>
      <Box sx={{ height: 280 }}>
        <Scatter data={data} options={options} />
      </Box>
    </Box>
  );
}
