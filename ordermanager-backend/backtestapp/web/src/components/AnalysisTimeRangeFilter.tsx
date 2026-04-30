import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { BacktestResult } from "@/api/types";
import { formatTs } from "@/utils/format";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/utils/datetimeLocal";
import { getEquityTimeExtent, sliceBacktestResultByTimeRange } from "@/utils/sliceResultByTimeRange";
import { hasAnalysisEquity } from "@/utils/hasAnalysisEquity";
import { countUpDownQuoteTicks } from "@/utils/upDownQuoteTicks";

export default function AnalysisTimeRangeFilter({
  source,
  children,
}: {
  source: BacktestResult;
  children: (filtered: BacktestResult) => ReactNode;
}) {
  const extent = useMemo(() => getEquityTimeExtent(source), [source]);
  const sourceKey = `${source.run_id}:${extent.min}:${extent.max}:${source.equity.length}`;

  const [draftStart, setDraftStart] = useState(() => toDatetimeLocalValue(extent.min));
  const [draftEnd, setDraftEnd] = useState(() => toDatetimeLocalValue(extent.max));
  const [appliedStart, setAppliedStart] = useState(extent.min);
  const [appliedEnd, setAppliedEnd] = useState(extent.max);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    setDraftStart(toDatetimeLocalValue(extent.min));
    setDraftEnd(toDatetimeLocalValue(extent.max));
    setAppliedStart(extent.min);
    setAppliedEnd(extent.max);
    setRangeError(null);
  }, [sourceKey, extent.min, extent.max]);

  const filtered = useMemo(
    () => sliceBacktestResultByTimeRange(source, appliedStart, appliedEnd),
    [source, appliedStart, appliedEnd],
  );

  const quoteTicks = useMemo(
    () => (hasAnalysisEquity(filtered) ? countUpDownQuoteTicks(filtered.equity) : 0),
    [filtered],
  );

  const apply = () => {
    setRangeError(null);
    const a = fromDatetimeLocalValue(draftStart);
    const b = fromDatetimeLocalValue(draftEnd);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setRangeError("Invalid start or end time.");
      return;
    }
    if (b < a) {
      setRangeError("End must be on or after start.");
      return;
    }
    const candidate = sliceBacktestResultByTimeRange(source, a, b);
    if (!candidate.equity.length) {
      setRangeError("No ticks in that range. Choose times inside the loaded series.");
      return;
    }
    setAppliedStart(a);
    setAppliedEnd(b);
  };

  const fullRange = () => {
    setRangeError(null);
    setDraftStart(toDatetimeLocalValue(extent.min));
    setDraftEnd(toDatetimeLocalValue(extent.max));
    setAppliedStart(extent.min);
    setAppliedEnd(extent.max);
  };

  const minLoc = toDatetimeLocalValue(extent.min);
  const maxLoc = toDatetimeLocalValue(extent.max);

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Date &amp; time range
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Pickers use your browser&apos;s <strong>local</strong> wall clock; labels like{" "}
          <strong>{formatTs(extent.min)}</strong> are <strong>UTC</strong> (same as round windows). If a local time
          looks like &quot;only April 5&quot; while UTC spans two calendar dates, widen the range or compare against the
          UTC span shown here.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} flexWrap="wrap">
          <TextField
            label="Start"
            type="datetime-local"
            size="small"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minLoc, max: maxLoc }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            label="End"
            type="datetime-local"
            size="small"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minLoc, max: maxLoc }}
            sx={{ minWidth: 240 }}
          />
          <Button variant="contained" onClick={apply}>
            Apply range
          </Button>
          <Button variant="outlined" onClick={fullRange}>
            Full range
          </Button>
        </Stack>
        {rangeError ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {rangeError}
          </Alert>
        ) : null}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          Active view: <strong>{formatTs(appliedStart)}</strong> → <strong>{formatTs(appliedEnd)}</strong> ·{" "}
          {filtered.equity.length} equity tick{filtered.equity.length === 1 ? "" : "s"} · {quoteTicks} Up/Down quote
          tick{quoteTicks === 1 ? "" : "s"}
        </Typography>
      </Paper>
      {children(filtered)}
    </>
  );
}
