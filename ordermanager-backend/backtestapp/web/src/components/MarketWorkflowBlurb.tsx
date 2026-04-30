import { Stack, Typography } from "@mui/material";
import { COPY } from "@/domain";

export function MarketWorkflowBlurb({ dense = false }: { dense?: boolean }) {
  return (
    <Stack spacing={dense ? 1 : 1.5}>
      <Typography variant="body2" color="text.secondary">
        {COPY.marketSchedule}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {COPY.pythonWorkflow}
      </Typography>
    </Stack>
  );
}
