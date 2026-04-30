import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  describeApiError,
  fetchMongoMarketTicks,
  fetchMongoTimeRange,
  getApiHealth,
  listStrategies,
} from "@/api/client";
import type { MongoMarketTicksResponse } from "@/api/client";
import MarketReplayChart from "@/components/charts/MarketReplayChart";
import { MarketWorkflowBlurb } from "@/components/MarketWorkflowBlurb";
import type { EquityPoint, StrategyInfo } from "@/api/types";
import { SIMULATION_SPEED_OPTIONS } from "@/constants/simulationSpeed";
import { useJobs } from "@/context/JobsContext";
import { usePreferences } from "@/context/PreferencesContext";
import { formatTsUtc } from "@/utils/format";

function utcInputToMs(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  if ([yyyy, mm, dd, hh, mi].some((n) => !Number.isFinite(n))) return null;
  return Date.UTC(yyyy, mm - 1, dd, hh, mi, 0, 0);
}

function msToUtcInput(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseStrategyParamsJson(raw: string): Record<string, unknown> | null {
  try {
    const obj = JSON.parse(raw || "{}");
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    return obj as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function ConfigurePage() {
  const { draft, setDraft, resetDraft } = usePreferences();
  const { startBacktest } = useJobs();
  const nav = useNavigate();
  const [mongoRange, setMongoRange] = useState<{ min: number; max: number } | null>(null);
  const [builtIn, setBuiltIn] = useState<StrategyInfo[]>([]);
  const [customStrategies, setCustomStrategies] = useState<StrategyInfo[]>([]);
  const [strategyCatalogError, setStrategyCatalogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mongoUriConfigured, setMongoUriConfigured] = useState<boolean | null>(null);
  const [mongoLoading, setMongoLoading] = useState(false);
  const [mongoErr, setMongoErr] = useState<string | null>(null);
  const [mongoTicks, setMongoTicks] = useState<EquityPoint[] | null>(null);
  const [mongoMeta, setMongoMeta] = useState<Omit<MongoMarketTicksResponse, "ticks"> | null>(null);
  const [mongoDefaultRangeApplied, setMongoDefaultRangeApplied] = useState(false);

  useEffect(() => {
    setStrategyCatalogError(null);
    listStrategies()
      .then((r) => {
        setBuiltIn(r.builtIn);
        setCustomStrategies(r.custom);
      })
      .catch((e) => {
        setBuiltIn([]);
        setCustomStrategies([]);
        setStrategyCatalogError(`Could not load strategies: ${describeApiError(e)}`);
      });
  }, []);

  useEffect(() => {
    getApiHealth()
      .then((h) => setMongoUriConfigured(!!h.mongoUriConfigured))
      .catch(() => setMongoUriConfigured(false));
  }, []);

  useEffect(() => {
    if (mongoDefaultRangeApplied) return;
    if (mongoUriConfigured !== true) return;
    if (draft.timeStart || draft.timeEnd) {
      setMongoDefaultRangeApplied(true);
      return;
    }

    (async () => {
      try {
        const r = await fetchMongoTimeRange();
        if (!r.hasData || r.t_min_ms == null || r.t_max_ms == null) {
          setMongoDefaultRangeApplied(true);
          return;
        }
        setMongoRange({ min: r.t_min_ms, max: r.t_max_ms });
        const startStr = msToUtcInput(r.t_min_ms);
        const endStr = msToUtcInput(r.t_max_ms);
        if (startStr && endStr) {
          setDraft({ timeStart: startStr, timeEnd: endStr });
        }
      } catch {
        // Silent failure: if range probing fails, leave defaults empty.
      } finally {
        setMongoDefaultRangeApplied(true);
      }
    })();
  }, [draft.timeStart, draft.timeEnd, mongoDefaultRangeApplied, mongoUriConfigured, setDraft]);

  // Always load Mongo up/down time range for visibility, even when draft already has dates.
  useEffect(() => {
    if (mongoUriConfigured !== true) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchMongoTimeRange();
        if (!cancelled && r.hasData && r.t_min_ms != null && r.t_max_ms != null) {
          setMongoRange({ min: r.t_min_ms, max: r.t_max_ms });
        }
      } catch {
        // Keep UI usable if probing fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mongoUriConfigured]);

  const startMsPreview = draft.timeStart ? utcInputToMs(draft.timeStart) : null;
  const endMsPreview = draft.timeEnd ? utcInputToMs(draft.timeEnd) : null;
  const startUtcPreview =
    startMsPreview != null && Number.isFinite(startMsPreview) ? formatTsUtc(startMsPreview) : null;
  const endUtcPreview =
    endMsPreview != null && Number.isFinite(endMsPreview) ? formatTsUtc(endMsPreview) : null;
  const strategyParamsObj = useMemo(
    () => parseStrategyParamsJson(draft.strategyParamsJson),
    [draft.strategyParamsJson],
  );
  const isBuyCheaper = draft.strategy === "buy_cheaper_token_continuously";
  const betUsdPerOrder =
    strategyParamsObj && strategyParamsObj.bet_usd_per_order != null
      ? String(strategyParamsObj.bet_usd_per_order)
      : "";
  const maxUsdPerOrder =
    strategyParamsObj &&
    (strategyParamsObj.max_usd_per_order != null || strategyParamsObj.max_qty_per_order != null)
      ? String(strategyParamsObj.max_usd_per_order ?? strategyParamsObj.max_qty_per_order)
      : "";

  const setStrategyParam = (key: string, value: string) => {
    const parsed = parseStrategyParamsJson(draft.strategyParamsJson);
    if (!parsed) return;
    const next: Record<string, unknown> = { ...parsed };
    if (value.trim() === "") delete next[key];
    else {
      const n = Number(value);
      next[key] = Number.isFinite(n) ? n : value;
    }
    // Keep legacy key from lingering after rename.
    if (key === "max_usd_per_order" && "max_qty_per_order" in next) delete next.max_qty_per_order;
    setDraft({ strategyParamsJson: JSON.stringify(next, null, 2) });
  };

  const onMongoPreview = async () => {
    setMongoErr(null);
    setMongoLoading(true);
    setMongoTicks(null);
    setMongoMeta(null);
    try {
      const out = await fetchMongoMarketTicks({
        startMs: utcInputToMs(draft.timeStart),
        endMs: utcInputToMs(draft.timeEnd),
        limit: 8000,
        stepMs: 100,
        quoteScale: "dollar_0_1",
      });
      setMongoTicks(out.ticks);
      setMongoMeta({
        truncated: out.truncated,
        limitUsed: out.limitUsed,
        quoteScale: out.quoteScale,
        resample_step_ms: out.resample_step_ms,
        grid_points_emitted: out.grid_points_emitted,
        grid_points_total: out.grid_points_total,
        raw_truncated_btc: out.raw_truncated_btc,
        raw_truncated_ud: out.raw_truncated_ud,
        diagnostics: out.diagnostics,
      });
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const d = e.response?.data as { error?: string } | undefined;
        setMongoErr(d?.error ?? e.message);
      } else {
        setMongoErr(e instanceof Error ? e.message : "Mongo preview failed");
      }
    } finally {
      setMongoLoading(false);
    }
  };

  const applyStrategyDefaults = (id: string) => {
    const s = [...builtIn, ...customStrategies].find((x) => x.id === id);
    if (s?.defaultParams) {
      setDraft({ strategyParamsJson: JSON.stringify(s.defaultParams, null, 2) });
    }
  };

  const onSubmit = async () => {
    setError(null);
    let strategyParams: Record<string, unknown>;
    try {
      strategyParams = JSON.parse(draft.strategyParamsJson || "{}");
    } catch {
      setError("Strategy parameters must be valid JSON.");
      return;
    }
    const initial = Number(draft.initialCash);
    if (!Number.isFinite(initial) || initial <= 0) {
      setError("Initial cash must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const jobId = await startBacktest({
        strategy: draft.strategy,
        strategyParams,
        initialCash: initial,
        timeStartMs: utcInputToMs(draft.timeStart),
        timeEndMs: utcInputToMs(draft.timeEnd),
        dataGranularityMs: draft.dataGranularityMs,
        datasetLabel: draft.datasetLabel || undefined,
        stopLossPct: draft.stopLossPct ? Number(draft.stopLossPct) : null,
        takeProfitPct: draft.takeProfitPct ? Number(draft.takeProfitPct) : null,
        execution: {
          slippage_fraction: Number(draft.slippageFraction) || 0,
          fee_rate: Number(draft.feeRate) || 0,
          latency_ms: Number(draft.latencyMs) || 0,
        },
        risk: draft.applyRiskLimits
          ? {
              apply_risk_limits: true,
              max_position_shares_per_side: draft.maxPositionShares
                ? Number(draft.maxPositionShares)
                : undefined,
              max_gross_notional_usd: draft.maxGrossNotional
                ? Number(draft.maxGrossNotional)
                : undefined,
              max_concurrent_sides: draft.maxConcurrentSides
                ? Number(draft.maxConcurrentSides)
                : undefined,
            }
          : { apply_risk_limits: false },
        settleRoundBoundaries: draft.settleRoundBoundaries,
        simulationSpeed: draft.simulationSpeed,
      });
      nav(`/jobs/${jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start simulation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Configure simulation</Typography>
      <Typography color="text.secondary" maxWidth={720} sx={{ mb: 1 }}>
        Rounds use <strong>UTC</strong> five-minute boundaries (e.g. 13:05:00Z). Tick times should come from your
        data source (e.g. MongoDB up/down timestamps); the granularity control below mainly affects the mock API
        spacing. Parameters persist in your browser. The API payload matches what your Python runner should accept
        on <code>POST /api/backtests</code> (<code>settle_round_boundaries</code>). Strategies submit{" "}
        <code>OPEN_*</code> / <code>CLOSE_*</code>; optional portfolio risk limits run only if you enable them below.
      </Typography>
      <MarketWorkflowBlurb dense />
      <Typography color="text.secondary" maxWidth={720} sx={{ mt: 2 }}>
        Strategy <strong>logic</strong> is not edited here—implement it in Python and reference it by id below.
      </Typography>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {strategyCatalogError ? (
        <Alert severity="warning">
          {strategyCatalogError}
          <Typography variant="body2" sx={{ mt: 1 }}>
            Dev: <code>http://&lt;server-ip&gt;:3000</code> with <code>REACT_APP_API_BASE</code> unset (CRA proxies{" "}
            <code>/api</code>). Production: run <code>npm run prod</code> from <code>web/</code> so Express serves{" "}
            <code>build/</code> and <code>/api</code> on port 3000 (rebuild first; do not set{" "}
            <code>REACT_APP_API_BASE</code>). Or use <code>serve -s build</code> only if you set{" "}
            <code>REACT_APP_API_BASE</code> to a reachable API URL and open that port.
          </Typography>
        </Alert>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Strategy</InputLabel>
              <Select
                label="Strategy"
                value={draft.strategy}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ strategy: v });
                  applyStrategyDefaults(v);
                }}
              >
                {builtIn.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} (built-in)
                  </MenuItem>
                ))}
                {customStrategies.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.isPythonUploaded ? "Python file" : "catalog"})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Dataset label"
              fullWidth
              value={draft.datasetLabel}
              onChange={(e) => setDraft({ datasetLabel: e.target.value })}
              helperText="Logical name for reports (e.g. mongo stream id)."
            />
          </Stack>

          <TextField
            label="Strategy parameters (JSON)"
            value={draft.strategyParamsJson}
            onChange={(e) => setDraft({ strategyParamsJson: e.target.value })}
            multiline
            minRows={6}
            fullWidth
            inputProps={{ style: { fontFamily: "monospace" } }}
          />
          {isBuyCheaper ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Bet USD per order (optional)"
                type="number"
                value={betUsdPerOrder}
                onChange={(e) => setStrategyParam("bet_usd_per_order", e.target.value)}
                helperText="If set, this fixed USD amount is used for each buy."
                fullWidth
                disabled={!strategyParamsObj}
              />
              <TextField
                label="Max USD per order"
                type="number"
                value={maxUsdPerOrder}
                onChange={(e) => setStrategyParam("max_usd_per_order", e.target.value)}
                helperText="Hard cap on per-order USD notional."
                fullWidth
                disabled={!strategyParamsObj}
              />
            </Stack>
          ) : null}

          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Initial cash"
              type="number"
              value={draft.initialCash}
              onChange={(e) => setDraft({ initialCash: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tick granularity (ms)</InputLabel>
              <Select
                label="Tick granularity (ms)"
                value={draft.dataGranularityMs}
                onChange={(e) => setDraft({ dataGranularityMs: Number(e.target.value) })}
              >
                <MenuItem value={100}>100 ms</MenuItem>
                <MenuItem value={1000}>1 s</MenuItem>
                <MenuItem value={60_000}>1 min</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Simulation speed</InputLabel>
              <Select
                label="Simulation speed"
                value={draft.simulationSpeed}
                onChange={(e) => setDraft({ simulationSpeed: Number(e.target.value) })}
              >
                {SIMULATION_SPEED_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    ×{s} {s === 1 ? "(baseline)" : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720 }}>
            <strong>Simulation speed</strong> scales how fast the <strong>dev mock API</strong> advances progress
            steps (wall clock). Higher × finishes sooner. The job page shows phase, percent, step counter, and a
            simulated replay clock when start/end are set. The Python engine ignores this unless you wire it.
          </Typography>

          <Typography variant="subtitle2">Betting / contract model</Typography>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.settleRoundBoundaries}
                  onChange={(_, c) => setDraft({ settleRoundBoundaries: c })}
                />
              }
              label="Settle at UTC 5m round boundaries"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4.5, maxWidth: 720 }}>
              Each 5m market is a new YES/NO pair. When on, any open YES/NO is flattened at the previous round&apos;s
              last quote before the first tick of the next round, and again after the final tick. Turn off only for
              legacy &quot;single continuous contract&quot; experiments.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Start (UTC datetime)"
              type="datetime-local"
              value={draft.timeStart}
              onChange={(e) => setDraft({ timeStart: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End (UTC datetime)"
              type="datetime-local"
              value={draft.timeEnd}
              onChange={(e) => setDraft({ timeEnd: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          {startUtcPreview ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720 }}>
              Start as UTC instant: <strong>{startUtcPreview}</strong>
            </Typography>
          ) : null}
          {endUtcPreview ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720 }}>
              End as UTC instant: <strong>{endUtcPreview}</strong>
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720, mt: 0.5 }}>
            This field is interpreted as <strong>UTC</strong> (not browser local timezone). Use the UTC instants above
            when matching runs across machines.
          </Typography>
          {mongoRange ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720 }}>
              Backtestable Mongo range (UTC): <strong>{formatTsUtc(mongoRange.min)}</strong> →{" "}
              <strong>{formatTsUtc(mongoRange.max)}</strong>
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720 }}>
            The dev <strong>mock API</strong> lays synthetic equity points evenly between start and end so{" "}
            <strong>Simulation history (5m rounds)</strong> gets one card per UTC five-minute bucket in that range.
            Leave both empty for a ~2h default span. The real Python engine uses your actual tick timestamps.
          </Typography>

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">MongoDB market preview (dev API)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 720, mb: 1 }}>
            Loads BTC and YES/NO quotes from <code>poly_btc</code> + <code>up_down</code> (database{" "}
            <code>own</code> by default), then <strong>resamples to a 100ms grid</strong> using{" "}
            <strong>last row with timestamp ≤ grid time</strong> on each side (causal LOCF — YES/NO updates whenever
            new up_down rows arrive in range). With <strong>no</strong> start/end datetimes, the API loads the{" "}
            <strong>newest</strong>{" "}
            <code>max_raw</code> rows per collection. Timestamps may be BSON <code>Date</code> or ms numbers; override
            the field with API params <code>ts_field</code> / <code>btc_ts_field</code> / <code>ud_ts_field</code> if not{" "}
            <code>ts_ms</code>. Set <code>MONGODB_URI</code> on the server. The Python engine uses its own merge for
            backtests.
          </Typography>
          {mongoUriConfigured === false ? (
            <Alert severity="info" sx={{ mb: 1 }}>
              Health check: <code>MONGODB_URI</code> is not set on the API — preview requests will fail until you set
              it and restart <code>npm run dev:server</code>.
            </Alert>
          ) : null}
          {mongoErr ? (
            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setMongoErr(null)}>
              {mongoErr}
            </Alert>
          ) : null}
          <Button variant="outlined" onClick={() => void onMongoPreview()} disabled={mongoLoading}>
            {mongoLoading ? "Loading…" : "Load market ticks from Mongo"}
          </Button>
          {mongoMeta ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Loaded {mongoTicks?.length ?? 0} tick{mongoTicks?.length === 1 ? "" : "s"}
              {mongoMeta.truncated ? ` (capped at ${mongoMeta.limitUsed} up_down documents)` : ""}.
            </Typography>
          ) : null}
          {mongoTicks != null && mongoTicks.length > 0 ? (
            <Box sx={{ mt: 2, minHeight: 520 }}>
              <MarketReplayChart
                ticks={mongoTicks}
                markers={[]}
                title="Mongo preview — BTC & YES/NO book"
                subtitle="100ms grid, LOCF merge (last BTC & book with ts≤t). Quote scale dollar_0_1 (×100 to ¢). No fills."
                strategyName={draft.strategy}
                strategyParams={strategyParamsObj}
              />
            </Box>
          ) : mongoTicks != null && mongoTicks.length === 0 ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                No grid points produced. Check collection names, time window, field names (
                <code>ts_ms</code> vs <code>timestamp</code>), and that BTC docs have a price field and up/down docs
                have bid/ask columns.
              </Typography>
              {mongoMeta?.diagnostics ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    fontSize: 11,
                    borderRadius: 1,
                    bgcolor: "action.hover",
                    overflow: "auto",
                    maxHeight: 280,
                  }}
                >
                  {JSON.stringify(mongoMeta.diagnostics, null, 2)}
                </Box>
              ) : null}
            </Stack>
          ) : null}

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Portfolio / risk limits (optional)
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={draft.applyRiskLimits}
                onChange={(_, c) => setDraft({ applyRiskLimits: c })}
              />
            }
            label="Enforce pre-trade portfolio & risk checks"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4.5, maxWidth: 720 }}>
            When off (default), the engine does not reject orders for cash, max position per side, gross notional, or
            concurrent sides, and strategies do not receive <code>max_position_shares_per_side</code> from the run
            context. Cash is still checked at <strong>fill</strong> time (opens cannot overdraw the ledger).
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Max position / side"
              value={draft.maxPositionShares}
              onChange={(e) => setDraft({ maxPositionShares: e.target.value })}
              fullWidth
              disabled={!draft.applyRiskLimits}
            />
            <TextField
              label="Max gross notional USD"
              value={draft.maxGrossNotional}
              onChange={(e) => setDraft({ maxGrossNotional: e.target.value })}
              fullWidth
              disabled={!draft.applyRiskLimits}
            />
            <TextField
              label="Max concurrent sides"
              value={draft.maxConcurrentSides}
              onChange={(e) => setDraft({ maxConcurrentSides: e.target.value })}
              fullWidth
              disabled={!draft.applyRiskLimits}
            />
          </Stack>

          <Typography variant="subtitle2">Stops (passed through; engine support may vary)</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Stop-loss %"
              value={draft.stopLossPct}
              onChange={(e) => setDraft({ stopLossPct: e.target.value })}
              fullWidth
            />
            <TextField
              label="Take-profit %"
              value={draft.takeProfitPct}
              onChange={(e) => setDraft({ takeProfitPct: e.target.value })}
              fullWidth
            />
          </Stack>

          <Typography variant="subtitle2">Execution model</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Slippage fraction"
              value={draft.slippageFraction}
              onChange={(e) => setDraft({ slippageFraction: e.target.value })}
              fullWidth
            />
            <TextField
              label="Fee rate"
              value={draft.feeRate}
              onChange={(e) => setDraft({ feeRate: e.target.value })}
              fullWidth
            />
            <TextField
              label="Latency ms"
              value={draft.latencyMs}
              onChange={(e) => setDraft({ latencyMs: e.target.value })}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" size="large" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? "Starting…" : "Run simulation"}
            </Button>
            <Button onClick={resetDraft}>Reset draft</Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
