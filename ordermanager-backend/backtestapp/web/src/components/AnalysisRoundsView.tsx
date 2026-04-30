import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  TablePagination,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BacktestResult, EquityPoint } from "@/api/types";
import BtcCandleChart from "@/components/charts/BtcCandleChart";
import RoundQuoteAnalysisChart from "@/components/charts/RoundQuoteAnalysisChart";
import { describeApiError } from "@/api/client";
import { formatMoney, formatTs } from "@/utils/format";
import {
  buildRoundSummaries,
  buildUtcFiveMinuteRoundSkeletons,
  equitySeriesForRoundWindow,
  MARKET_WINDOW_MS,
  type RoundRow,
} from "@/utils/rounds";
import { countUpDownQuoteTicks } from "@/utils/upDownQuoteTicks";

export type AnalysisRoundPanel = {
  round: RoundRow;
  ticks: EquityPoint[];
  hasQuotes: boolean;
  quoteTickCount: number;
  equityRowCount: number;
  displayRoundNumber: number;
  /** Mongo lazy mode: ticks not yet fetched for this slot. */
  lazyPending?: boolean;
};

function buildPanelsFromEquity(result: BacktestResult): AnalysisRoundPanel[] {
  const rounds = buildRoundSummaries(result);
  const panels: AnalysisRoundPanel[] = [];
  for (const round of rounds) {
    const ticks = equitySeriesForRoundWindow(
      result.equity,
      round.window_start_ms,
      round.window_end_ms,
      true,
    );
    const inWindow = equitySeriesForRoundWindow(
      result.equity,
      round.window_start_ms,
      round.window_end_ms,
      false,
    );
    if (inWindow.length === 0) continue;
    const quoteTickCount = countUpDownQuoteTicks(inWindow);
    const hasQuotes = quoteTickCount > 0;
    panels.push({
      round,
      ticks,
      hasQuotes,
      quoteTickCount,
      equityRowCount: inWindow.length,
      displayRoundNumber: panels.length + 1,
    });
  }
  return panels;
}

function buildLazyPanels(
  result: BacktestResult,
  fetched: Record<number, EquityPoint[]>,
): AnalysisRoundPanel[] {
  const t0 = result.meta.started_ts_ms ?? 0;
  const t1 = result.meta.ended_ts_ms ?? t0;
  const rounds = buildUtcFiveMinuteRoundSkeletons(t0, t1);
  return rounds.map((round, i) => {
    const ws = round.window_start_ms;
    const loaded = Object.prototype.hasOwnProperty.call(fetched, ws);
    const raw = loaded ? fetched[ws]! : [];
    const hasData = raw.length > 0;
    const ticks = hasData
      ? equitySeriesForRoundWindow(raw, round.window_start_ms, round.window_end_ms, true)
      : [];
    const winOnly = hasData
      ? equitySeriesForRoundWindow(raw, round.window_start_ms, round.window_end_ms, false)
      : [];
    const quoteTickCount = winOnly.length ? countUpDownQuoteTicks(winOnly) : 0;
    return {
      round,
      ticks,
      hasQuotes: quoteTickCount > 0,
      quoteTickCount,
      equityRowCount: winOnly.length,
      displayRoundNumber: i + 1,
      lazyPending: !loaded,
    };
  });
}

/** Same UTC 5m slot semantics and card layout as Simulation history round cards; extra quote-density line for analysis. */
function AnalysisRoundCard({
  panel,
  selected,
  onSelect,
}: {
  panel: AnalysisRoundPanel;
  selected: boolean;
  onSelect: () => void;
}) {
  const { round, hasQuotes, quoteTickCount, equityRowCount, displayRoundNumber, lazyPending } = panel;
  const pnl = round.realized_pnl;
  const pnlColor = pnl > 0 ? "success.main" : pnl < 0 ? "error.main" : "text.secondary";
  const eqDelta = round.realized_pnl;
  const hasCarry = round.open_positions_at_end > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : hasQuotes ? "divider" : "action.disabledBackground",
        bgcolor: selected ? "action.selected" : "background.paper",
        opacity: lazyPending ? 0.92 : hasQuotes ? 1 : 0.9,
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ height: "100%", alignItems: "stretch" }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            Round {displayRoundNumber}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
            UTC slot (minute % 5 = 0) · {formatTs(round.window_start_ms)} → {formatTs(round.window_end_ms)}
          </Typography>
          {lazyPending ? (
            <Typography variant="body2" color="primary.light" sx={{ mb: 1 }}>
              Click to load this 5m window from MongoDB
            </Typography>
          ) : null}
          <Typography variant="h6" sx={{ color: pnlColor }}>
            {formatMoney(pnl)}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
            Expected (before fee) {formatMoney(round.expected_pnl)} · fee drag {formatMoney(round.fee_drag)}
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
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            {lazyPending ? (
              <Typography component="span" variant="caption" color="text.secondary">
                Ticks not loaded yet
              </Typography>
            ) : (
              <>
                <Typography component="span" variant="caption" fontWeight={600} color="text.primary">
                  {quoteTickCount} Up/Down quote tick{quoteTickCount === 1 ? "" : "s"}
                </Typography>
                {equityRowCount !== quoteTickCount ? (
                  <Typography component="span" variant="caption" display="block" sx={{ mt: 0.25 }}>
                    {equityRowCount} equity row{equityRowCount === 1 ? "" : "s"} in slot
                  </Typography>
                ) : null}
                {!hasQuotes ? " · no Up/Down quotes" : ""}
              </>
            )}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function AnalysisRoundsView({
  result,
  chartMaxRenderPoints,
  lazyMongoFetch,
}: {
  result: BacktestResult;
  chartMaxRenderPoints?: number;
  /** When set with a `mongodb_lazy` shell result, each round fetches merged ticks on open (or first open). */
  lazyMongoFetch?: (windowStartMs: number, windowEndMs: number) => Promise<EquityPoint[]>;
}) {
  const isLazyMongo =
    result.meta.data_source === "mongodb_lazy" && result.equity.length === 0 && Boolean(lazyMongoFetch);

  const [fetchedByRound, setFetchedByRound] = useState<Record<number, EquityPoint[]>>({});
  const fetchedRef = useRef<Record<number, EquityPoint[]>>(fetchedByRound);
  const inflightRef = useRef<Map<number, Promise<EquityPoint[]>>>(new Map());

  useEffect(() => {
    fetchedRef.current = fetchedByRound;
  }, [fetchedByRound]);

  useEffect(() => {
    setFetchedByRound({});
    fetchedRef.current = {};
    inflightRef.current.clear();
  }, [result.run_id]);

  /** Oldest → newest (used for prev/next round in time). */
  const panelsChrono = useMemo(() => {
    if (isLazyMongo) return buildLazyPanels(result, fetchedByRound);
    return buildPanelsFromEquity(result);
  }, [result, fetchedByRound, isLazyMongo]);

  /** Newest rounds first in the card grid. */
  const panelsNewestFirst = useMemo(() => [...panelsChrono].reverse(), [panelsChrono]);

  const [page, setPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(9);
  const [selectedStartMs, setSelectedStartMs] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStartMs(null);
    setModalOpen(false);
    setModalError(null);
    setPage(0);
  }, [result.run_id]);

  const slice = useMemo(
    () => panelsNewestFirst.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage),
    [panelsNewestFirst, page, cardsPerPage],
  );

  const selected = useMemo(
    () =>
      selectedStartMs == null
        ? null
        : (panelsChrono.find((p) => p.round.window_start_ms === selectedStartMs) ?? null),
    [panelsChrono, selectedStartMs],
  );

  const totalPages = Math.max(1, Math.ceil(panelsNewestFirst.length / cardsPerPage));
  const lastPage = Math.max(0, totalPages - 1);

  useEffect(() => {
    if (!cardsPerPage) return;
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [cardsPerPage, page, totalPages]);

  const ensureRoundTicks = useCallback(
    async (windowStartMs: number, windowEndMs: number): Promise<EquityPoint[]> => {
      if (!lazyMongoFetch) return [];
      const prev = fetchedRef.current;
      if (Object.prototype.hasOwnProperty.call(prev, windowStartMs)) {
        return prev[windowStartMs]!;
      }
      let p = inflightRef.current.get(windowStartMs);
      if (!p) {
        p = lazyMongoFetch(windowStartMs, windowEndMs)
          .then((ticks) => {
            setFetchedByRound((old) => {
              const next = { ...old, [windowStartMs]: ticks };
              fetchedRef.current = next;
              return next;
            });
            inflightRef.current.delete(windowStartMs);
            return ticks;
          })
          .catch((e) => {
            inflightRef.current.delete(windowStartMs);
            throw e;
          });
        inflightRef.current.set(windowStartMs, p);
      }
      return p;
    },
    [lazyMongoFetch],
  );

  const fetchRoundIfLazy = useCallback(
    async (windowStartMs: number, windowEndMs: number) => {
      setModalError(null);
      if (!isLazyMongo || !lazyMongoFetch) return;
      const needFetch =
        !Object.prototype.hasOwnProperty.call(fetchedRef.current, windowStartMs) &&
        !inflightRef.current.has(windowStartMs);
      if (needFetch) setModalLoading(true);
      try {
        await ensureRoundTicks(windowStartMs, windowEndMs);
      } catch (e) {
        setModalError(describeApiError(e));
      } finally {
        if (needFetch) setModalLoading(false);
      }
    },
    [ensureRoundTicks, isLazyMongo, lazyMongoFetch],
  );

  const openRound = async (windowStartMs: number, windowEndMs: number) => {
    setSelectedStartMs(windowStartMs);
    setModalOpen(true);
    await fetchRoundIfLazy(windowStartMs, windowEndMs);
  };

  const selectedChronoIndex = useMemo(() => {
    if (selectedStartMs == null) return -1;
    return panelsChrono.findIndex((p) => p.round.window_start_ms === selectedStartMs);
  }, [panelsChrono, selectedStartMs]);

  const goToAdjacentRound = useCallback(
    async (delta: number) => {
      if (selectedChronoIndex < 0) return;
      const target = panelsChrono[selectedChronoIndex + delta];
      if (!target) return;
      setSelectedStartMs(target.round.window_start_ms);
      await fetchRoundIfLazy(target.round.window_start_ms, target.round.window_end_ms);
    },
    [fetchRoundIfLazy, panelsChrono, selectedChronoIndex],
  );

  /** Previous = older in time; Next = newer in time. */
  const canPrevRound = selectedChronoIndex > 0;
  const canNextRound = selectedChronoIndex >= 0 && selectedChronoIndex < panelsChrono.length - 1;

  const mongoMerged =
    result.meta.data_source === "mongodb" ||
    result.meta.data_source === "mongodb_lazy" ||
    String(result.run_id ?? "").startsWith("mongo:");

  const selectedTicks =
    selected && selectedStartMs != null
      ? Object.prototype.hasOwnProperty.call(fetchedByRound, selectedStartMs)
        ? equitySeriesForRoundWindow(
            fetchedByRound[selectedStartMs]!,
            selected.round.window_start_ms,
            selected.round.window_end_ms,
            true,
          )
        : selected.ticks
      : [];

  const selectedWinOnly =
    selected && isLazyMongo && selectedStartMs != null && Object.prototype.hasOwnProperty.call(fetchedByRound, selectedStartMs)
      ? equitySeriesForRoundWindow(
          fetchedByRound[selectedStartMs]!,
          selected.round.window_start_ms,
          selected.round.window_end_ms,
          false,
        )
      : selected && !isLazyMongo
        ? equitySeriesForRoundWindow(
            selected.ticks,
            selected.round.window_start_ms,
            selected.round.window_end_ms,
            false,
          )
        : [];

  const selectedQuoteCount =
    selected && !isLazyMongo
      ? selected.quoteTickCount
      : selectedWinOnly.length
        ? countUpDownQuoteTicks(selectedWinOnly)
        : 0;

  const headerRowCount = selected ? (isLazyMongo ? selectedWinOnly.length : selected.equityRowCount) : 0;

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 900 }}>
        UTC <strong>five-minute rounds</strong> (minute % 5 = 0). Cards show <strong>newest first</strong>; use{" "}
        <strong>Go to oldest</strong> below to jump to the last page.
        {isLazyMongo ? (
          <>
            {" "}
            <strong>MongoDB lazy mode:</strong> the grid lists every slot in the chosen range; opening a round fetches
            merged <code>poly_btc</code> + <code>up_down</code> ticks for that window only.
          </>
        ) : (
          <>
            {" "}
            <strong>Click a round</strong> for the bid/ask + EMA chart (BTC from <code>poly_btc</code>, Up/Down from{" "}
            <code>up_down</code>
            {mongoMerged ? ", merged at every raw timestamp when loaded from Mongo" : ""}).
          </>
        )}
      </Typography>

      <Grid container spacing={2}>
        {slice.map((panel) => (
          <Grid item xs={12} sm={6} md={4} key={panel.round.window_start_ms}>
            <AnalysisRoundCard
              panel={panel}
              selected={panel.round.window_start_ms === selectedStartMs}
              onSelect={() => openRound(panel.round.window_start_ms, panel.round.window_end_ms)}
            />
          </Grid>
        ))}
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        flexWrap="wrap"
        sx={{ borderTop: 1, borderColor: "divider", mt: 1, pt: 1 }}
      >
        <Button
          size="small"
          variant="outlined"
          onClick={() => setPage(lastPage)}
          disabled={panelsNewestFirst.length === 0 || page >= lastPage}
        >
          Go to oldest (last page)
        </Button>
        <TablePagination
          component="div"
          count={panelsNewestFirst.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={cardsPerPage}
          onRowsPerPageChange={(e) => {
            setCardsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[6, 9, 12, 24]}
          sx={{ border: "none", flex: 1, justifyContent: "flex-end" }}
        />
      </Stack>

      <Dialog
        open={modalOpen && selected != null}
        onClose={() => setModalOpen(false)}
        maxWidth="xl"
        fullWidth
        scroll="paper"
        aria-labelledby="analysis-round-dialog-title"
      >
        {selected ? (
          <>
            <DialogTitle id="analysis-round-dialog-title">
              <Typography variant="h6" component="span">
                Up/Down bid·ask with EMA — round {selected.displayRoundNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {formatTs(selected.round.window_start_ms)} → {formatTs(selected.round.window_end_ms)} UTC ·{" "}
                {MARKET_WINDOW_MS / 60_000} min slot
                {modalLoading ? " · loading…" : null}
                {!modalLoading && headerRowCount > 0
                  ? ` · ${headerRowCount.toLocaleString()} merged tick${headerRowCount === 1 ? "" : "s"}`
                  : null}
                {!modalLoading && selectedQuoteCount > 0 && selectedQuoteCount !== headerRowCount
                  ? ` · ${selectedQuoteCount.toLocaleString()} with Up/Down quotes`
                  : null}
              </Typography>
              {!modalLoading ? (
                <Typography variant="body2" sx={{ mt: 1 }} fontWeight={600}>
                  Round realized PnL (backtest closes in window):{" "}
                  <Box
                    component="span"
                    sx={{
                      color:
                        selected.round.realized_pnl > 0
                          ? "success.main"
                          : selected.round.realized_pnl < 0
                            ? "error.main"
                            : "text.secondary",
                    }}
                  >
                    {formatMoney(selected.round.realized_pnl)}
                  </Box>
                  {selected.round.closes_count > 0 ? (
                    <Box component="span" sx={{ ml: 1, fontWeight: 400 }} color="text.secondary">
                      · {selected.round.closes_count} close{selected.round.closes_count === 1 ? "" : "s"}
                    </Box>
                  ) : null}
                </Typography>
              ) : null}
            </DialogTitle>
            <DialogContent dividers>
              {modalError ? (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setModalError(null)}>
                  {modalError}
                </Alert>
              ) : null}
              {modalLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !modalLoading &&
                !modalError &&
                (isLazyMongo ? selectedWinOnly.length > 0 : selected.hasQuotes || selected.ticks.length > 0) ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ minHeight: 580 }}>
                    <RoundQuoteAnalysisChart
                      points={isLazyMongo ? selectedTicks : selected.ticks}
                      maxRenderPoints={chartMaxRenderPoints}
                      defaultEmaAskFocus
                      showPossibleSignalPositions
                      positionTrades={result.trades.filter(
                        (t) =>
                          (t.opened_ts_ms >= selected.round.window_start_ms &&
                            t.opened_ts_ms < selected.round.window_end_ms) ||
                          (t.closed_ts_ms >= selected.round.window_start_ms &&
                            t.closed_ts_ms < selected.round.window_end_ms),
                      )}
                      positionWindow={{
                        start_ms: selected.round.window_start_ms,
                        end_ms: selected.round.window_end_ms,
                      }}
                      runMeta={result.meta}
                      strategyDebugEvents={result.strategy_debug_events}
                    />
                  </Box>
                  <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Typography variant="subtitle2" gutterBottom>
                      BTC candles (same window)
                    </Typography>
                    <BtcCandleChart
                      points={isLazyMongo ? selectedTicks : selected.ticks}
                      windowStartMs={selected.round.window_start_ms}
                      windowEndMs={selected.round.window_end_ms}
                    />
                  </Box>
                </Paper>
              ) : isLazyMongo && selectedWinOnly.length === 0 && !modalError ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No merged ticks in this window (empty overlap or missing fields). Try another round.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No BTC or Up/Down quote fields on ticks in this window.
                </Typography>
              )}
            </DialogContent>
            <DialogActions
              sx={{
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                px: 2,
                py: 1.5,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ChevronLeft />}
                  disabled={!canPrevRound || modalLoading}
                  onClick={() => void goToAdjacentRound(-1)}
                  aria-label="Previous round"
                >
                  Previous round
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ChevronRight />}
                  disabled={!canNextRound || modalLoading}
                  onClick={() => void goToAdjacentRound(1)}
                  aria-label="Next round"
                >
                  Next round
                </Button>
              </Stack>
              <Button onClick={() => setModalOpen(false)}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Window length {MARKET_WINDOW_MS / 60_000} minutes UTC.
      </Typography>
    </>
  );
}
