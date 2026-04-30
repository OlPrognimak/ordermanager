import { Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import type { JobEntry } from "@/context/JobsContext";
import { formatSpeedLabel } from "@/constants/simulationSpeed";
import { formatTs } from "@/utils/format";

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued",
  starting: "Starting engine",
  loading: "Loading configuration & data window",
  replay: "Replaying ticks (mock)",
  analytics: "Building metrics & equity series",
  python: "Running Python engine (pmbacktest CLI)",
  complete: "Complete",
  failed: "Failed",
  done: "Finishing",
};

function phaseLabel(phase: string | undefined, status: JobEntry["status"]): string {
  if (status === "queued") return PHASE_LABEL.queued;
  if (!phase) return status === "running" ? "Running…" : "—";
  return PHASE_LABEL[phase] ?? phase;
}

export function SimulationProgressPanel({ job }: { job: JobEntry }) {
  const pct = Math.min(100, Math.max(0, job.progress));
  const showMockSpeed = job.simulationSpeed != null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Simulation progress</Typography>
        {showMockSpeed ? (
          <Chip
            size="small"
            label={formatSpeedLabel(job.simulationSpeed!)}
            variant="outlined"
            color="primary"
          />
        ) : null}
        <Chip
          size="small"
          label={phaseLabel(job.phase, job.status)}
          variant="outlined"
          color={job.status === "running" ? "info" : "default"}
        />
      </Stack>

      <Box sx={{ position: "relative", borderRadius: 1, overflow: "hidden", mb: 1.5 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 12,
            borderRadius: 1,
            bgcolor: "action.hover",
            "@keyframes barPulse": {
              "0%": { opacity: 0.85 },
              "50%": { opacity: 1 },
              "100%": { opacity: 0.85 },
            },
            "& .MuiLinearProgress-bar": {
              borderRadius: 1,
              transition: "transform 0.25s linear",
              animation: job.status === "running" ? "barPulse 1.4s ease-in-out infinite" : "none",
            },
          }}
        />
      </Box>

      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          <strong>{pct}%</strong>
          {job.tickIndex != null && job.tickTotal != null ? (
            <>
              {" "}
              · step {job.tickIndex} / {job.tickTotal}
            </>
          ) : null}
          {job.status === "queued" ? " · waiting for worker" : null}
        </Typography>
        {job.simulatedTimeMs != null ? (
          <Typography variant="body2" color="text.secondary">
            Simulated replay position: <strong>{formatTs(job.simulatedTimeMs)}</strong> (UTC)
          </Typography>
        ) : job.status === "running" || job.status === "queued" ? (
          <Typography variant="caption" color="text.secondary">
            Set start/end on Configure to see a moving clock during the mock run.
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
