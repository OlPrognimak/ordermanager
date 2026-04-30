import axios from "axios";

import { stripAnsi } from "./stripAnsi";

/** User-visible hint after a failed API call (axios or unknown). */
export function formatApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
      return `${fallback} (network: is the API running on port 3001? Try \`npm run dev\` from the web folder, or check REACT_APP_API_BASE in .env.)`;
    }
    const st = err.response?.status;
    const data = err.response?.data as { error?: string } | undefined;
    const detail = stripAnsi(data?.error ?? err.message);
    return st ? `${fallback} (HTTP ${st}: ${detail})` : `${fallback} (${detail})`;
  }
  if (err instanceof Error) return `${fallback} (${stripAnsi(err.message)})`;
  return fallback;
}
