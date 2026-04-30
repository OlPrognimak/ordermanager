import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BacktestQueue } from "@/components/BacktestQueue";
import { useJobs } from "@/context/JobsContext";

export default function DashboardPage() {
  const { jobs } = useJobs();

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={2}
      >
        <Typography variant="h4">Dashboard</Typography>
        <Button component={RouterLink} to="/configure" variant="contained" size="large">
          New simulation
        </Button>
      </Stack>

      <BacktestQueue jobs={jobs} />
    </Stack>
  );
}
