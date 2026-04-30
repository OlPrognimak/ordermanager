import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { memo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { formatSpeedLabel } from "@/constants/simulationSpeed";
import { useJobs, type JobEntry } from "@/context/JobsContext";

function statusColor(s: JobEntry["status"]) {
  switch (s) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "running":
      return "info";
    default:
      return "default";
  }
}

function BacktestQueueInner({ jobs }: { jobs: JobEntry[] }) {
  const { removeJob } = useJobs();

  if (!jobs.length) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No runs yet. Configure a simulation (5-minute market grid, Python strategy id + params).
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {jobs.map((j) => (
        <Paper key={j.jobId} sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
            <Box flex={1}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle1" fontFamily="monospace">
                  {j.jobId.slice(0, 8)}…
                </Typography>
                <Chip size="small" label={j.status} color={statusColor(j.status)} />
                <Typography variant="body2" color="text.secondary">
                  {j.config.strategy} · {j.config.datasetLabel ?? "dataset"}
                </Typography>
                <Chip
                  size="small"
                  label={formatSpeedLabel(j.config.simulationSpeed ?? 1)}
                  variant="outlined"
                  sx={{ ml: 0.5 }}
                />
              </Stack>
              {j.status === "running" || j.status === "queued" ? (
                <Box sx={{ mt: 1, maxWidth: 480 }}>
                  <LinearProgress
                    variant="determinate"
                    value={j.progress}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      "& .MuiLinearProgress-bar": {
                        transition: "transform 0.2s linear",
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {j.progress}%
                    {j.phase ? ` · ${j.phase}` : ""}
                    {j.tickIndex != null && j.tickTotal != null ? ` · ${j.tickIndex}/${j.tickTotal}` : ""}
                  </Typography>
                </Box>
              ) : null}
              {j.error ? (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {j.error}
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" spacing={1} flexShrink={0}>
              <Button
                component={RouterLink}
                to={`/jobs/${j.jobId}`}
                variant="outlined"
                size="small"
              >
                Open
              </Button>
              <Button
                color="error"
                variant="outlined"
                size="small"
                onClick={() => removeJob(j.jobId)}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/** Memoized so dashboard rows do not re-render from unrelated context updates when the jobs array is referentially stable. */
export const BacktestQueue = memo(BacktestQueueInner);
