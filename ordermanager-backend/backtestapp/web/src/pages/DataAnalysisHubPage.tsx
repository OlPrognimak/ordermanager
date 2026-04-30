import { Alert, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import AnalysisRoundsView from "@/components/AnalysisRoundsView";
import AnalysisTimeRangeFilter from "@/components/AnalysisTimeRangeFilter";
import { ANALYSIS_MODAL_CHART_MAX_POINTS } from "@/components/charts/RoundQuoteAnalysisChart";
import { fetchMongoMarketTicks, fetchMongoStatus, fetchMongoTimeRange } from "@/api/client";
import {
  ANALYSIS_DEMO_ID,
  ANALYSIS_DEMO_RESULT,
  ANALYSIS_DEMO_TIME_LABEL,
} from "@/data/analysisDemoResult";
import { useJobs } from "@/context/JobsContext";
import type { JobEntry } from "@/context/JobsContext";
import type { BacktestResult, EquityPoint } from "@/api/types";
import { formatTs } from "@/utils/format";
import { hasAnalysisEquity } from "@/utils/hasAnalysisEquity";
import { createMongoLazyShellResult } from "@/utils/mongoMarketToResult";
import { countUtcFiveMinuteRoundsInSpan } from "@/utils/rounds";

/** Select value for merged poly_btc + up_down from MongoDB (not a job id). */
const SOURCE_MONGO = "mongodb";

/** Guardrail: listing more 5m slots can freeze the browser. */
const MAX_LAZY_ROUNDS = 5000;

function dataTimeLabel(j: JobEntry): string {
  const r = j.result;
  if (!r?.equity.length) return `${j.jobId.slice(0, 8)}…`;
  const t0 = r.meta.started_ts_ms ?? r.equity[0]!.timestamp_ms;
  const t1 = r.meta.ended_ts_ms ?? r.equity[r.equity.length - 1]!.timestamp_ms;
  if (t0 != null && t1 != null && Number.isFinite(t0) && Number.isFinite(t1)) {
    return `${formatTs(t0)} — ${formatTs(t1)}`;
  }
  return `${j.jobId.slice(0, 8)}…`;
}

export default function DataAnalysisHubPage() {
  const { jobs, getJob } = useJobs();
  const [selectedId, setSelectedId] = useState<string>(ANALYSIS_DEMO_ID);
  const [mongoConfigured, setMongoConfigured] = useState(false);
  const [mongoLazyResult, setMongoLazyResult] = useState<BacktestResult | null>(null);
  const [mongoLoadError, setMongoLoadError] = useState<string | null>(null);
  const [mongoDbExtent, setMongoDbExtent] = useState<{ min: number; max: number } | null>(null);

  const eligible = useMemo(() => {
    return jobs
      .filter((j) => j.status === "completed" && j.result && hasAnalysisEquity(j.result))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [jobs]);

  useEffect(() => {
    let cancelled = false;
    fetchMongoStatus()
      .then((s) => {
        if (!cancelled) setMongoConfigured(Boolean(s.configured));
      })
      .catch(() => {
        if (!cancelled) setMongoConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mongoConfigured) {
      setMongoDbExtent(null);
      return;
    }
    let cancelled = false;
    fetchMongoTimeRange()
      .then((r) => {
        if (cancelled || !r.hasData || r.t_min_ms == null || r.t_max_ms == null) return;
        setMongoDbExtent({ min: r.t_min_ms, max: r.t_max_ms });
      })
      .catch(() => {
        if (!cancelled) setMongoDbExtent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mongoConfigured]);

  useEffect(() => {
    if (selectedId !== SOURCE_MONGO) {
      setMongoLazyResult(null);
      setMongoLoadError(null);
      return;
    }
    if (!mongoDbExtent) {
      setMongoLazyResult(null);
      return;
    }
    const n = countUtcFiveMinuteRoundsInSpan(mongoDbExtent.min, mongoDbExtent.max);
    if (n > MAX_LAZY_ROUNDS) {
      setMongoLazyResult(null);
      setMongoLoadError(
        `Your up_down span covers ${n.toLocaleString()} five-minute rounds (max ${MAX_LAZY_ROUNDS.toLocaleString()} in the UI). Ask to raise the cap or split the collection window.`,
      );
      return;
    }
    setMongoLoadError(null);
    setMongoLazyResult(createMongoLazyShellResult(mongoDbExtent.min, mongoDbExtent.max));
  }, [selectedId, mongoDbExtent]);

  useEffect(() => {
    if (selectedId === ANALYSIS_DEMO_ID || selectedId === SOURCE_MONGO) return;
    if (!eligible.some((j) => j.jobId === selectedId)) {
      setSelectedId(ANALYSIS_DEMO_ID);
    }
  }, [eligible, selectedId]);

  const resolvedSource = useMemo((): BacktestResult | null => {
    if (selectedId === ANALYSIS_DEMO_ID) return ANALYSIS_DEMO_RESULT;
    if (selectedId === SOURCE_MONGO) return mongoLazyResult;
    const r = getJob(selectedId)?.result;
    if (r && hasAnalysisEquity(r)) return r;
    return null;
  }, [getJob, mongoLazyResult, selectedId]);

  const selectValue =
    selectedId === ANALYSIS_DEMO_ID ||
    selectedId === SOURCE_MONGO ||
    eligible.some((j) => j.jobId === selectedId)
      ? selectedId
      : ANALYSIS_DEMO_ID;

  const lazyMongoFetch = useCallback(async (windowStartMs: number, windowEndMs: number): Promise<EquityPoint[]> => {
    const out = await fetchMongoMarketTicks({
      startMs: windowStartMs,
      endMs: windowEndMs,
      stepMs: 0,
      limit: 500_000,
      maxRaw: 500_000,
      preferRecent: false,
      quoteScale:
        process.env.REACT_APP_MONGO_QUOTE_SCALE === "cents_0_100" ? "cents_0_100" : "dollar_0_1",
      timeoutMs: 120_000,
    });
    return out.ticks;
  }, []);

  const lazyRoundCount = useMemo(() => {
    if (!mongoLazyResult || mongoLazyResult.meta.data_source !== "mongodb_lazy") return 0;
    const a = mongoLazyResult.meta.started_ts_ms;
    const b = mongoLazyResult.meta.ended_ts_ms;
    if (a == null || b == null) return 0;
    return countUtcFiveMinuteRoundsInSpan(a, b);
  }, [mongoLazyResult]);

  const isLazyMongoView = resolvedSource?.meta.data_source === "mongodb_lazy";

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Data analysis</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
        UTC five-minute windows. <strong>MongoDB</strong> lists every round across your <code>up_down</code> time span
        automatically (no bulk tick download). <strong>Open a round</strong> to load merged <code>poly_btc</code> +{" "}
        <code>up_down</code> for that 5m slot only. The bundled sample and completed jobs still include full tick series;
        use <strong>date &amp; time range</strong> below only for those (to slice in the browser).
      </Typography>

      {mongoConfigured && selectedId === SOURCE_MONGO && mongoDbExtent ? (
        <Typography variant="caption" color="text.secondary" display="block">
          Round list span (UTC, from <code>up_down</code>):{" "}
          <strong>{formatTs(mongoDbExtent.min)}</strong> → <strong>{formatTs(mongoDbExtent.max)}</strong>
        </Typography>
      ) : null}

      {!mongoConfigured ? (
        <Alert severity="info" sx={{ maxWidth: 720 }}>
          MongoDB is not configured on the API (<code>MONGODB_URI</code>). Use the bundled sample or a completed job,
          or set the URI and restart the server.
        </Alert>
      ) : null}

      {mongoLoadError ? (
        <Alert severity="error" sx={{ maxWidth: 720 }} onClose={() => setMongoLoadError(null)}>
          {mongoLoadError}
        </Alert>
      ) : null}

      <FormControl sx={{ minWidth: 320, maxWidth: "100%" }} size="small">
        <InputLabel id="analysis-data-select-label">Time series</InputLabel>
        <Select
          labelId="analysis-data-select-label"
          label="Time series"
          value={selectValue}
          onChange={(e) => setSelectedId(String(e.target.value))}
        >
          <MenuItem value={ANALYSIS_DEMO_ID}>{ANALYSIS_DEMO_TIME_LABEL}</MenuItem>
          {mongoConfigured ? (
            <MenuItem value={SOURCE_MONGO}>
              MongoDB (lazy ·{" "}
              {lazyRoundCount ? `${lazyRoundCount.toLocaleString()} rounds` : "loading extent…"})
            </MenuItem>
          ) : null}
          {eligible.map((j) => (
            <MenuItem key={j.jobId} value={j.jobId}>
              {dataTimeLabel(j)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {eligible.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No completed jobs with quotes in this session — use <RouterLink to="/configure">Configure run</RouterLink> or
          MongoDB.
        </Typography>
      ) : null}

      {resolvedSource && hasAnalysisEquity(resolvedSource) ? (
        isLazyMongoView ? (
          <AnalysisRoundsView
            result={resolvedSource}
            chartMaxRenderPoints={ANALYSIS_MODAL_CHART_MAX_POINTS}
            lazyMongoFetch={lazyMongoFetch}
          />
        ) : (
          <AnalysisTimeRangeFilter source={resolvedSource}>
            {(filtered) => (
              <AnalysisRoundsView
                result={filtered}
                chartMaxRenderPoints={ANALYSIS_MODAL_CHART_MAX_POINTS}
                lazyMongoFetch={undefined}
              />
            )}
          </AnalysisTimeRangeFilter>
        )
      ) : selectedId === SOURCE_MONGO ? (
        <Alert severity="info">
          {mongoConfigured && !mongoDbExtent
            ? "Reading MongoDB time extent…"
            : mongoLoadError
              ? "Fix the error above or choose another time series."
              : "Preparing round list…"}
        </Alert>
      ) : (
        <Alert severity="warning">Could not load the selected series.</Alert>
      )}
    </Stack>
  );
}
