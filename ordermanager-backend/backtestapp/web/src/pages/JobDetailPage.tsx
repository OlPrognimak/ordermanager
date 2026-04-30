import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import DrawdownChart from "@/components/charts/DrawdownChart";
import EquityChart from "@/components/charts/EquityChart";
import MarketReplayChart from "@/components/charts/MarketReplayChart";
import TradePnLChart from "@/components/charts/TradePnLChart";
import { ENABLE_JOB_CHARTS } from "@/constants/uiPerformance";
import { Link as RouterLink, useParams } from "react-router-dom";
import { describeApiError, getJobResult } from "@/api/client";
import { MetricCards } from "@/components/MetricCards";
import { SimulationProgressPanel } from "@/components/SimulationProgressPanel";
import { SimulationRoundHistorySection } from "@/components/SimulationRoundHistorySection";
import { useJobs } from "@/context/JobsContext";
import {
  exportEquityCsv,
  exportResultJson,
  exportRoundsCsv,
  exportTradesCsv,
} from "@/utils/exportResults";
import { formatMoney, formatTs } from "@/utils/format";
import { sharpeFromEquity } from "@/utils/sharpe";
import type { JobEntry } from "@/context/JobsContext";

type SortKey = "closed_ts_ms" | "realized_pnl" | "side";

function simulationErrorLines(logs: string[]): string[] {
  return logs.flatMap((c) => c.split("\n")).filter((line) => {
    const t = line.trim();
    if (!t) return false;
    // Server prefixes stderr chunks with this label — not an error by itself.
    if (t === "[stderr]") return false;
    // Strategy / engine debug summaries printed to stderr.
    if (/\sdebug\]/i.test(t)) return false;
    return /\[ERROR\]|traceback|exception:|^error\b/i.test(t);
  });
}

function SimulationLogPanel({ job, variant }: { job: JobEntry; variant: "compact" | "full" }): JSX.Element {
  const logs = job.logs ?? [];
  const text = logs.join("\n");
  const errLines = simulationErrorLines(logs);
  const maxH = variant === "full" ? 400 : 200;
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant={variant === "full" ? "h6" : "subtitle1"} gutterBottom>
        Simulation log
      </Typography>
      {variant === "full" ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Engine messages and Python stdout/stderr (tail). Highlighted lines match common error patterns.
        </Typography>
      ) : null}
      {errLines.length > 0 ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Errors &amp; stderr
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              maxHeight: variant === "full" ? 200 : 120,
              overflow: "auto",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {errLines.join("\n")}
          </Box>
        </Alert>
      ) : null}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Full log
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          maxHeight: maxH,
          overflow: "auto",
          fontSize: 12,
          bgcolor: "action.hover",
          p: 1,
          borderRadius: 1,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text.length ? text : "—"}
      </Box>
    </Paper>
  );
}

export default function JobDetailPage() {
  const { jobId = "" } = useParams();
  const { jobs, getJob, attachResult, refreshJob } = useJobs();
  const job = getJob(jobId);
  const [hydrateErr, setHydrateErr] = useState<string | null>(null);
  const [hydrateProgress, setHydrateProgress] = useState<number>(0);
  const [compareId, setCompareId] = useState<string>("");
  const [pnlFilter, setPnlFilter] = useState<"all" | "win" | "loss">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "closed_ts_ms",
    dir: "desc",
  });

  useEffect(() => {
    if (!jobId || !job) return;
    if (job.status !== "completed" || job.result) return;
    setHydrateErr(null);
    setHydrateProgress(5);
    getJobResult(jobId)
      .then((r) => {
        setHydrateProgress(100);
        attachResult(jobId, r);
      })
      .catch((e) =>
        setHydrateErr(`Could not load result: ${describeApiError(e)}`),
      );
  }, [jobId, job, attachResult]);

  useEffect(() => {
    if (!job || job.status !== "completed" || job.result || hydrateErr) return;
    const id = setInterval(() => {
      setHydrateProgress((p) => {
        if (p >= 95) return p;
        // Ease-out style progress while waiting for result JSON.
        const step = p < 30 ? 4 : p < 60 ? 2 : p < 85 ? 1 : 0.4;
        return Math.min(95, p + step);
      });
    }, 250);
    return () => clearInterval(id);
  }, [job, hydrateErr]);

  useEffect(() => {
    if (!jobId || !job) return;
    if (job.status !== "completed" && job.status !== "failed") return;
    if ((job.logs?.length ?? 0) > 0) return;
    void refreshJob(jobId);
  }, [jobId, job, refreshJob]);

  const compareJob = compareId ? getJob(compareId) : undefined;
  const compareEquity = compareJob?.result?.equity;

  const sortedTrades = useMemo(() => {
    const r = job?.result;
    if (!r?.trades.length) return [];
    let rows = [...r.trades];
    if (pnlFilter === "win") rows = rows.filter((t) => t.realized_pnl > 0);
    if (pnlFilter === "loss") rows = rows.filter((t) => t.realized_pnl <= 0);
    const mul = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * mul;
      return ((va as number) - (vb as number)) * mul;
    });
    return rows;
  }, [job?.result, pnlFilter, sort]);

  const sharpe = useMemo(() => {
    const eq = job?.result?.equity.map((p) => p.equity);
    if (!eq?.length) return null;
    return sharpeFromEquity(eq);
  }, [job?.result?.equity]);

  const hasMarketQuotes = (pts: { price?: number }[] | null | undefined) =>
    !!pts?.length && pts[0]?.price != null;

  const completedOptions = jobs.filter(
    (j) => j.status === "completed" && j.result && j.jobId !== jobId,
  );

  if (!jobId) {
    return <Typography>Missing job id.</Typography>;
  }

  if (!job) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">Job not found in this browser session.</Alert>
        <Button component={RouterLink} to="/" variant="contained">
          Back to dashboard
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" fontFamily="monospace" gutterBottom>
            {job.jobId.slice(0, 8)}…
          </Typography>
          <Typography color="text.secondary">
            {job.config.strategy} · {job.config.datasetLabel ?? "dataset"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {job.status === "completed" && job.result?.equity?.length ? (
            <Button component={RouterLink} to={`/jobs/${job.jobId}/analysis`} variant="outlined">
              Data analysis
            </Button>
          ) : null}
          <Button component={RouterLink} to="/configure" variant="outlined">
            New simulation
          </Button>
        </Stack>
      </Stack>

      {job.status === "queued" || job.status === "running" ? (
        <Paper sx={{ p: 2 }}>
          <SimulationProgressPanel job={job} />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 2 }}>
            Status polls about every 4s (compact JSON; charts optional — see <code>web/src/constants/uiPerformance.ts</code>
            ). Rounds align to UTC five-minute boundaries (minute % 5 === 0).
          </Typography>
          {ENABLE_JOB_CHARTS && hasMarketQuotes(job.liveTicks) ? (
            <MarketReplayChart
              ticks={job.liveTicks!}
              markers={job.liveMarkers ?? []}
              title="Live market replay (updating)"
              subtitle="Triangles = open (ledger fill ¢); rotated squares = exit (ledger fill ¢). YES/NO lines use mids. Top-right: latest bid·ask (¢). Mock data."
              strategyName={job.config.strategy}
              strategyParams={job.config.strategyParams}
              playbackControls={false}
            />
          ) : ENABLE_JOB_CHARTS ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Chart appears on first replay tick…
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Live charts are off for performance. Enable <code>ENABLE_JOB_CHARTS</code> in{" "}
              <code>uiPerformance.ts</code> to restore them.
            </Typography>
          )}
        </Paper>
      ) : null}

      {job.error ? (
        <Alert severity="error">{job.error}</Alert>
      ) : null}
      {hydrateErr ? <Alert severity="warning">{hydrateErr}</Alert> : null}

      {job.status === "queued" ||
      job.status === "running" ||
      ((job.status === "completed" || job.status === "failed") && !job.result) ? (
        <SimulationLogPanel job={job} variant="compact" />
      ) : null}

      {job.status === "completed" && job.result ? (
        <>
          <Typography variant="h5">Performance</Typography>
          <MetricCards perf={job.result.performance} sharpe={sharpe} />

          <SimulationLogPanel job={job} variant="full" />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => exportResultJson(job.result!)}>
              Export summary JSON
            </Button>
            <Button variant="outlined" onClick={() => exportTradesCsv(job.result!)}>
              Export positions CSV
            </Button>
            <Button variant="outlined" onClick={() => exportEquityCsv(job.result!)}>
              Export equity CSV
            </Button>
            <Button variant="outlined" onClick={() => exportRoundsCsv(job.result!)}>
              Export rounds CSV (UTC 5m)
            </Button>
          </Stack>

          <SimulationRoundHistorySection
            key={job.result.run_id}
            result={job.result}
            disableCharts={!ENABLE_JOB_CHARTS}
            jobId={jobId}
          />

          {completedOptions.length ? (
            <FormControl sx={{ minWidth: 280 }}>
              <InputLabel>Compare equity (optional)</InputLabel>
              <Select
                label="Compare equity (optional)"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {completedOptions.map((j) => (
                  <MenuItem key={j.jobId} value={j.jobId}>
                    {j.jobId.slice(0, 8)}… · {j.config.strategy}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {ENABLE_JOB_CHARTS ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Equity curve
              </Typography>
              <EquityChart points={job.result.equity} comparePoints={compareEquity} />
            </Paper>
          ) : null}

          {ENABLE_JOB_CHARTS ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Drawdown
              </Typography>
              <DrawdownChart points={job.result.equity} />
            </Paper>
          ) : null}

          {ENABLE_JOB_CHARTS ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Realized P&amp;L per closed position (scatter)
              </Typography>
              <TradePnLChart trades={job.result.trades} />
            </Paper>
          ) : null}

          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">Position history</Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>PnL filter</InputLabel>
                <Select
                  label="PnL filter"
                  value={pnlFilter}
                  onChange={(e) => setPnlFilter(e.target.value as typeof pnlFilter)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="win">Winners only</MenuItem>
                  <MenuItem value="loss">Losers only</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ cursor: "pointer" }}
                    onClick={() =>
                      setSort((s) => ({
                        key: "side",
                        dir: s.key === "side" && s.dir === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    Side
                  </TableCell>
                  <TableCell
                    sx={{ cursor: "pointer" }}
                    onClick={() =>
                      setSort((s) => ({
                        key: "closed_ts_ms",
                        dir: s.key === "closed_ts_ms" && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  >
                    Closed
                  </TableCell>
                  <TableCell align="right">USD Amount</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Entry</TableCell>
                  <TableCell align="right">Exit</TableCell>
                  <TableCell
                    align="right"
                    sx={{ cursor: "pointer" }}
                    onClick={() =>
                      setSort((s) => ({
                        key: "realized_pnl",
                        dir: s.key === "realized_pnl" && s.dir === "desc" ? "asc" : "desc",
                      }))
                    }
                  >
                    PnL
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTrades.map((t) => (
                  <TableRow key={t.trade_id}>
                    <TableCell>{t.side}</TableCell>
                    <TableCell>{formatTs(t.closed_ts_ms)}</TableCell>
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
          </Paper>
        </>
      ) : job.status === "completed" && !job.result && !hydrateErr ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Loading result bundle…
          </Typography>
          <LinearProgress variant="determinate" value={hydrateProgress} sx={{ height: 10, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>{Math.round(hydrateProgress)}%</strong> · simulation done, rendering report files
          </Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}
