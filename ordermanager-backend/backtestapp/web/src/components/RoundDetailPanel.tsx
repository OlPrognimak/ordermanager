import {
  Box,
  Grid,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { BacktestResult } from "@/api/types";
import RoundPositionsBarChart from "@/components/charts/RoundPositionsBarChart";
import RoundQuoteAnalysisChart, {
  ANALYSIS_MODAL_CHART_MAX_POINTS,
} from "@/components/charts/RoundQuoteAnalysisChart";
import RoundWindowEquityChart from "@/components/charts/RoundWindowEquityChart";
import { formatMoney, formatTs } from "@/utils/format";
import {
  equitySeriesForRoundWindow,
  MARKET_WINDOW_MS,
  type RoundRow,
} from "@/utils/rounds";

function ChartBlock({ children }: { children: ReactNode }) {
  return <Box sx={{ minHeight: 200 }}>{children}</Box>;
}

export type RoundDetailPanelProps = {
  result: BacktestResult;
  round: RoundRow;
  disableCharts: boolean;
  /**
   * When set (e.g. data analysis with empty rounds omitted), used in titles instead of
   * `round.index + 1` (which follows raw UTC slot index from extent).
   */
  roundLabelNumber?: number;
  /** When set (e.g. job detail), link to the per-job Data analysis page with the same chart in a modal. */
  jobId?: string;
};

export default function RoundDetailPanel({
  result,
  round,
  disableCharts,
  roundLabelNumber,
  jobId,
}: RoundDetailPanelProps) {
  const rn = roundLabelNumber ?? round.index + 1;

  const equitySeries = useMemo(
    () => equitySeriesForRoundWindow(result.equity, round.window_start_ms, round.window_end_ms, true),
    [result.equity, round.window_end_ms, round.window_start_ms],
  );
  const marketSeries = useMemo(
    () => equitySeriesForRoundWindow(result.equity, round.window_start_ms, round.window_end_ms, false),
    [result.equity, round.window_end_ms, round.window_start_ms],
  );
  /** Same idea as the data-analysis modal: need at least one tick inside the UTC window (not only a prepended prior). */
  const showQuoteAnalysisChart = marketSeries.length > 0;
  const positionTradesForChart = useMemo(() => {
    const ws = round.window_start_ms;
    const we = round.window_end_ms;
    return result.trades.filter(
      (t) =>
        (t.opened_ts_ms >= ws && t.opened_ts_ms < we) || (t.closed_ts_ms >= ws && t.closed_ts_ms < we),
    );
  }, [result.trades, round.window_end_ms, round.window_start_ms]);
  const startEq = equitySeries[0]?.equity ?? null;
  const endEq = equitySeries.length ? equitySeries[equitySeries.length - 1]!.equity : round.ending_equity;

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Round {rn} — detailed analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        UTC five-minute slot {formatTs(round.window_start_ms)} → {formatTs(round.window_end_ms)} (
        {MARKET_WINDOW_MS / 60_000} min). Each round starts when <strong>UTC minute % 5 === 0</strong>. P&amp;L
        attributed by position <strong>close</strong> time.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Realized P&amp;L
          </Typography>
          <Typography variant="subtitle1">{formatMoney(round.realized_pnl)}</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Expected P&amp;L (before fee)
          </Typography>
          <Typography variant="subtitle1">{formatMoney(round.expected_pnl)}</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Fee drag (expected - realized)
          </Typography>
          <Typography variant="subtitle1">{formatMoney(round.fee_drag)}</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Closes
          </Typography>
          <Typography variant="subtitle1">{round.closes_count}</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            Start equity (chart)
          </Typography>
          <Typography variant="subtitle1">{startEq == null ? "—" : formatMoney(startEq)}</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">
            End equity (chart)
          </Typography>
          <Typography variant="subtitle1">{endEq == null ? "—" : formatMoney(endEq)}</Typography>
        </Grid>
      </Grid>

      {showQuoteAnalysisChart ? (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Quote &amp; extrema (result graph)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Same line chart as Data analysis; full controls and BTC candles live on the{" "}
            <Link
              component={RouterLink}
              to={jobId ? `/jobs/${jobId}/analysis` : "/analysis"}
              underline="hover"
            >
              Data analysis
            </Link>{" "}
            page. Extrema run on <strong>both</strong> Up and Down smoothed asks (YES and NO); red/green triangles on
            the green curve are <strong>Up-leg</strong> signals, not “wrong colors” on the wrong line.
          </Typography>
          <ChartBlock>
            <Box sx={{ minHeight: 480 }}>
              <RoundQuoteAnalysisChart
                points={equitySeries}
                maxRenderPoints={ANALYSIS_MODAL_CHART_MAX_POINTS}
                defaultEmaAskFocus
                graphOnly
                positionTrades={positionTradesForChart}
                positionWindow={{
                  start_ms: round.window_start_ms,
                  end_ms: round.window_end_ms,
                }}
                runMeta={result.meta}
                strategyDebugEvents={result.strategy_debug_events}
              />
            </Box>
          </ChartBlock>
        </>
      ) : null}

      {!disableCharts ? (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Simulated equity path (this window)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Replay of bankroll through ticks inside the 5m slot; prior tick prepended when available so the line
            starts at the last known level before the window.
          </Typography>
          <ChartBlock>
            <RoundWindowEquityChart points={equitySeries} />
          </ChartBlock>
        </>
      ) : null}

      {!disableCharts ? (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
            Realized P&amp;L by position (this round)
          </Typography>
          <ChartBlock>
            <RoundPositionsBarChart trades={round.trades} />
          </ChartBlock>
        </>
      ) : null}

      {disableCharts && marketSeries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No quote series in this window and round charts are off - enable <code>ENABLE_JOB_CHARTS</code> in{" "}
          <code>uiPerformance.ts</code> for equity and position charts.
        </Typography>
      ) : null}

      {round.trades.length ? (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Position details
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Side</TableCell>
                <TableCell>Closed</TableCell>
                <TableCell align="right">USD Amount</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Entry ($ · ¢)</TableCell>
                <TableCell align="right">Exit ($ · ¢)</TableCell>
                <TableCell align="right">P&amp;L</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {round.trades.map((t) => (
                <TableRow key={t.trade_id}>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{t.trade_id}</TableCell>
                  <TableCell>{t.side}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{formatTs(t.closed_ts_ms)}</TableCell>
                  <TableCell align="right">{formatMoney(t.bet_usd_amount ?? t.quantity * t.entry_price)}</TableCell>
                  <TableCell align="right">{t.order_count ?? 1}</TableCell>
                  <TableCell align="right">{t.quantity.toFixed(4)}</TableCell>
                  <TableCell align="right">
                    {t.entry_price.toFixed(4)}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({(t.entry_price * 100).toFixed(2)}¢)
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {t.exit_price.toFixed(4)}{" "}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({(t.exit_price * 100).toFixed(2)}¢)
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatMoney(t.realized_pnl)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
    </Paper>
  );
}
