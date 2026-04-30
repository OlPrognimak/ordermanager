import { Grid, Paper, Tooltip, Typography } from "@mui/material";
import { memo } from "react";
import type { PerformanceReport } from "@/api/types";
import { formatMoney, formatPct } from "@/utils/format";

export const MetricCards = memo(function MetricCards({
  perf,
  sharpe,
}: {
  perf: PerformanceReport;
  sharpe: number | null;
}) {
  const pf =
    typeof perf.profit_factor === "string"
      ? perf.profit_factor
      : perf.profit_factor.toFixed(2);

  const items: { label: string; value: string; tip: string }[] = [
    {
      label: "Total PnL",
      value: formatMoney(perf.total_pnl),
      tip: "Simulation bankroll change (YES/NO positions), including MTM on last tick.",
    },
    {
      label: "Realized PnL",
      value: formatMoney(perf.realized_pnl_from_ledger),
      tip: "Sum of realized P&L on all closed positions (ledger). Can differ from Total PnL when MTM moves.",
    },
    { label: "ROI", value: formatPct(perf.roi), tip: "Total PnL / initial cash." },
    {
      label: "Win rate",
      value: formatPct(perf.win_rate),
      tip: "Winning UTC 5m rounds / total UTC 5m rounds in range. A round wins if sum of realized P&L from closes in that slot is > 0.",
    },
    {
      label: "Avg per position",
      value: formatMoney(perf.avg_trade_return),
      tip: "Mean realized P&L each time a YES/NO position is fully closed.",
    },
    {
      label: "Max drawdown",
      value: formatMoney(perf.max_drawdown_abs),
      tip: "Peak-to-trough equity drop on the sampled curve.",
    },
    {
      label: "Max DD %",
      value: formatPct(perf.max_drawdown_pct),
      tip: "Max drawdown relative to prior peak.",
    },
    {
      label: "Sharpe (step)",
      value: sharpe == null ? "—" : sharpe.toFixed(3),
      tip: "Heuristic Sharpe on per-step equity returns (not annualized).",
    },
    {
      label: "Closed positions",
      value: String(perf.num_trades),
      tip: "Count of fully closed YES/NO legs in the ledger.",
    },
    {
      label: "Profit factor",
      value: pf,
      tip: "Gross wins / gross losses (absolute).",
    },
  ];

  return (
    <Grid container spacing={2}>
      {items.map((x) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={x.label}>
          <Tooltip title={x.tip} arrow>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="caption" color="text.secondary">
                {x.label}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {x.value}
              </Typography>
            </Paper>
          </Tooltip>
        </Grid>
      ))}
    </Grid>
  );
});
