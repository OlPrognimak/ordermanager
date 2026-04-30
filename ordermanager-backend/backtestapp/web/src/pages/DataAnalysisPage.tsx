import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import AnalysisRoundsView from "@/components/AnalysisRoundsView";
import AnalysisTimeRangeFilter from "@/components/AnalysisTimeRangeFilter";
import { hasAnalysisEquity } from "@/utils/hasAnalysisEquity";
import { MARKET_WINDOW_MS } from "@/utils/rounds";
import { useJobs } from "@/context/JobsContext";

export default function DataAnalysisPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { getJob } = useJobs();
  const job = jobId ? getJob(jobId) : undefined;
  const result = job?.result;

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

  if (job.status !== "completed" || !result) {
    return (
      <Stack spacing={2}>
        <Alert severity="info">Load a completed result to browse rounds by date.</Alert>
        <Button component={RouterLink} to={`/jobs/${jobId}`} variant="outlined">
          Back to job
        </Button>
      </Stack>
    );
  }

  if (!hasAnalysisEquity(result)) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">This series has no BTC or YES/NO fields on equity ticks.</Alert>
        <Button component={RouterLink} to={`/jobs/${jobId}`} variant="outlined">
          Back to job
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" gutterBottom>
            Data analysis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            BTC spot, Up (YES) and Down (NO) bid/ask (¢) with EMA₂₀ (α = 2/21) per UTC window ({MARKET_WINDOW_MS / 60_000}{" "}
            min). Use <strong>date &amp; time range</strong> below to focus the series; each round modal plots{" "}
            <strong>all ticks</strong> in that window (jagged lines), up to a display cap. Up uses <code>yes_ask</code>/
            <code>yes_bid</code> with mid fallback; Down uses <code>no_ask</code>/<code>no_bid</code>.
          </Typography>
        </Box>
        <Button component={RouterLink} to={`/jobs/${jobId}`} variant="outlined">
          Back to job
        </Button>
      </Stack>

      <AnalysisTimeRangeFilter source={result}>
        {(filtered) => <AnalysisRoundsView result={filtered} />}
      </AnalysisTimeRangeFilter>
    </Stack>
  );
}
