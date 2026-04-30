import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Paper,
  TablePagination,
  Typography,
} from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";
import type { BacktestResult } from "@/api/types";
import RoundDetailPanel from "@/components/RoundDetailPanel";
import { formatMoney, formatTs } from "@/utils/format";
import { buildRoundSummaries, MARKET_WINDOW_MS, type RoundRow } from "@/utils/rounds";

function RoundCard({
  round,
  selected,
  onSelect,
}: {
  round: RoundRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const pnl = round.realized_pnl;
  const pnlColor = pnl > 0 ? "success.main" : pnl < 0 ? "error.main" : "text.secondary";
  // Keep the card-level delta aligned to the same realized round PnL definition.
  const eqDelta = round.realized_pnl;
  const hasCarry = round.open_positions_at_end > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "background.paper",
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ height: "100%", alignItems: "stretch" }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Round {round.index + 1}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
            UTC slot (minute % 5 = 0) · {formatTs(round.window_start_ms)} → {formatTs(round.window_end_ms)}
          </Typography>
          <Typography variant="h6" sx={{ color: pnlColor }}>
            {formatMoney(pnl)}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
            Expected (before fee) {formatMoney(round.expected_pnl)} · fee drag{" "}
            {formatMoney(round.fee_drag)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {round.closes_count} close{round.closes_count === 1 ? "" : "s"} · fees {formatMoney(round.fees_paid)}
          </Typography>
          {hasCarry ? (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
              Open positions carried: {round.open_positions_at_end}
            </Typography>
          ) : null}
          {round.ending_equity != null ? (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              End equity (realized-only) {formatMoney(round.realized_ending_equity)}
              {eqDelta != null ? ` · realized ${formatMoney(eqDelta)}` : ""}
            </Typography>
          ) : null}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

const SimulationRoundHistorySectionInner = memo(function SimulationRoundHistorySectionInner({
  result,
  heading = "Simulation history (5m rounds)",
  disableCharts = false,
  jobId,
}: {
  result: BacktestResult;
  /** Override main section title (e.g. strategy lab dry-run). */
  heading?: string;
  /** When true, skip Recharts blocks inside the round detail panel (faster UI). */
  disableCharts?: boolean;
  /** Job id for links from round detail to `/jobs/:id/analysis`. */
  jobId?: string;
}) {
  const rows = useMemo(() => buildRoundSummaries(result), [result]);
  const [selectedStartMs, setSelectedStartMs] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(9);

  useEffect(() => {
    if (!rows.length) {
      setSelectedStartMs(null);
      return;
    }
    setSelectedStartMs((prev) => {
      if (prev != null && rows.some((r) => r.window_start_ms === prev)) return prev;
      return rows[0]!.window_start_ms;
    });
  }, [rows]);

  const selectedRound: RoundRow | undefined = useMemo(() => {
    if (selectedStartMs == null) return undefined;
    return rows.find((r) => r.window_start_ms === selectedStartMs);
  }, [rows, selectedStartMs]);

  const slice = rows.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);

  if (!rows.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {heading}
        </Typography>
        <Typography color="text.secondary">No equity or trade data to build rounds.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 800 }}>
        <strong>{rows.length}</strong> UTC five-minute window{rows.length === 1 ? "" : "s"} in this run (each
        begins when <strong>UTC minute % 5 === 0</strong>). Each card is one slot; click a round to load charts
        below (under this card grid and pagination). Equity / bar charts respect <code>ENABLE_JOB_CHARTS</code>. If
        you see only one card with the mock API, restart <code>npm run dev</code> after
        upgrading and run a <strong>new</strong> job so timestamps span your start→end range.
      </Typography>

      <Grid container spacing={2}>
        {slice.map((r) => (
          <Grid item xs={12} sm={6} md={4} key={r.window_start_ms}>
            <RoundCard
              round={r}
              selected={r.window_start_ms === selectedStartMs}
              onSelect={() => {
                setSelectedStartMs(r.window_start_ms);
              }}
            />
          </Grid>
        ))}
      </Grid>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={cardsPerPage}
        onRowsPerPageChange={(e) => {
          setCardsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[6, 9, 12, 24]}
        sx={{ borderTop: 1, borderColor: "divider", mt: 1 }}
      />

      {selectedRound ? (
        <RoundDetailPanel
          result={result}
          round={selectedRound}
          disableCharts={disableCharts}
          jobId={jobId}
        />
      ) : null}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Window length {MARKET_WINDOW_MS / 60_000} minutes UTC. Use <strong>Export rounds CSV</strong> for a full
        ledger rollup.
      </Typography>
    </Paper>
  );
});

export const SimulationRoundHistorySection = SimulationRoundHistorySectionInner;
