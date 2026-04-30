import { Box } from "@mui/material";
import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { TradeRow } from "@/api/types";
import { registerCharts } from "./chartRegister";

registerCharts();

export default function RoundPositionsBarChart({ trades }: { trades: TradeRow[] }) {
  const labels = trades.map((t) =>
    t.trade_id.length > 14 ? `${t.trade_id.slice(0, 12)}…` : t.trade_id,
  );
  const pnls = trades.map((t) => t.realized_pnl);
  const colors = pnls.map((p) => (p >= 0 ? "rgba(52,211,153,0.85)" : "rgba(248,113,113,0.85)"));

  const data = {
    labels,
    datasets: [
      {
        label: "Realized P&L",
        data: pnls,
        backgroundColor: colors,
        borderColor: colors.map((c) => c.replace("0.85", "1")),
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const i = ctx.dataIndex;
            const t = trades[i];
            return t ? `${t.trade_id}: $${t.realized_pnl.toFixed(4)}` : "";
          },
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
      y: { ticks: { callback: (v) => `$${v}` } },
    },
  };

  if (!trades.length) {
    return (
      <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box component="span" sx={{ color: "text.secondary", typography: "body2" }}>
          No positions closed in this round.
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: Math.min(320, 120 + trades.length * 28) }}>
      <Bar data={data} options={options} />
    </Box>
  );
}
