import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { describeApiError, getJobResult, getJobStatus, submitBacktest } from "@/api/client";
import type {
  BacktestResult,
  BacktestSubmitConfig,
  EquityPoint,
  JobStatusResponse,
  ReplayMarker,
} from "@/api/types";
import { loadJson, saveJson } from "@/utils/storage";

export interface JobEntry {
  jobId: string;
  status: JobStatusResponse["status"];
  progress: number;
  logs: string[];
  error: string | null;
  createdAt: number;
  config: BacktestSubmitConfig;
  result?: BacktestResult;
  phase?: string;
  simulatedTimeMs?: number | null;
  tickIndex?: number;
  tickTotal?: number;
  simulationSpeed?: number;
  liveTicks?: EquityPoint[] | null;
  liveMarkers?: ReplayMarker[] | null;
}

interface JobsContextValue {
  jobs: JobEntry[];
  startBacktest: (config: BacktestSubmitConfig) => Promise<string>;
  refreshJob: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => JobEntry | undefined;
  attachResult: (jobId: string, result: BacktestResult) => void;
  removeJob: (jobId: string) => void;
}

const JobsContext = createContext<JobsContextValue | null>(null);

const STORAGE_KEY = "jobsIndex";

/** Status polling: wider spacing + compact payload keeps the dashboard responsive. */
const JOB_POLL_INTERVAL_MS = 4000;
/** Short timeout avoids hanging tabs; transient failures retry next interval (see poll failure budget). */
const JOB_POLL_TIMEOUT_MS = 15_000;
const POLL_FAILURES_BEFORE_ABORT = 8;

const EMPTY_CONFIG: BacktestSubmitConfig = {
  strategy: "unknown",
  strategyParams: {},
  initialCash: 0,
  timeStartMs: null,
  timeEndMs: null,
  dataGranularityMs: 1000,
  settleRoundBoundaries: true,
  simulationSpeed: 1,
};

/** Persisted rows keep last 200 log lines (and may be older shapes); normalize after load. */
function normalizeJobEntry(raw: unknown): JobEntry | null {
  if (!raw || typeof raw !== "object" || !("jobId" in raw)) return null;
  const j = raw as Partial<JobEntry> & { jobId: string };
  const c = j.config;
  const config: BacktestSubmitConfig =
    c && typeof c === "object"
      ? { ...EMPTY_CONFIG, ...c, strategy: (c as BacktestSubmitConfig).strategy ?? "unknown" }
      : EMPTY_CONFIG;
  return {
    jobId: j.jobId,
    status: j.status ?? "queued",
    progress: typeof j.progress === "number" ? j.progress : 0,
    logs: Array.isArray(j.logs) ? j.logs : [],
    error: j.error ?? null,
    createdAt: typeof j.createdAt === "number" ? j.createdAt : Date.now(),
    config,
    result: j.result,
    phase: j.phase,
    simulatedTimeMs: j.simulatedTimeMs,
    tickIndex: j.tickIndex,
    tickTotal: j.tickTotal,
    simulationSpeed: j.simulationSpeed,
    liveTicks: j.liveTicks,
    liveMarkers: j.liveMarkers,
  };
}

function stripForStorage(j: JobEntry) {
  return {
    jobId: j.jobId,
    status: j.status,
    progress: j.progress,
    createdAt: j.createdAt,
    config: j.config,
    error: j.error,
    logs: j.logs?.length ? j.logs.slice(-200) : [],
  };
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobEntry[]>(() => {
    const raw = loadJson<unknown[]>(STORAGE_KEY, []);
    return raw.map(normalizeJobEntry).filter((x): x is JobEntry => x != null);
  });
  const pollers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollFailureCount = useRef<Map<string, number>>(new Map());

  const persistIndex = useCallback((next: JobEntry[]) => {
    saveJson(
      STORAGE_KEY,
      next.slice(0, 30).map(stripForStorage),
    );
  }, []);

  const stopPoll = useCallback((jobId: string) => {
    const id = pollers.current.get(jobId);
    if (id) clearInterval(id);
    pollers.current.delete(jobId);
  }, []);

  const attachResult = useCallback(
    (jobId: string, result: BacktestResult) => {
      setJobs((prev) => {
        const next = prev.map((j) => (j.jobId === jobId ? { ...j, result } : j));
        persistIndex(next);
        return next;
      });
    },
    [persistIndex],
  );

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const st = await getJobStatus(jobId, {
          compact: true,
          timeoutMs: JOB_POLL_TIMEOUT_MS,
        });
        pollFailureCount.current.set(jobId, 0);
        setJobs((prev) => {
          const idx = prev.findIndex((j) => j.jobId === jobId);
          const base = idx >= 0 ? prev[idx]! : ({} as JobEntry);
          const next = [...prev];
          // Compact polls: do not merge liveTicks/liveMarkers — large arrays force heavy re-renders and JSON cost.
          const entry: JobEntry = {
            ...base,
            jobId,
            status: st.status,
            progress: st.progress,
            logs: st.logs,
            error: st.error,
            createdAt: base.createdAt ?? st.createdAt,
            config: base.config,
            result: base.result,
            phase: st.phase ?? undefined,
            simulatedTimeMs: st.simulatedTimeMs ?? undefined,
            tickIndex: st.tickIndex ?? undefined,
            tickTotal: st.tickTotal ?? undefined,
            simulationSpeed: st.simulationSpeed ?? undefined,
            liveTicks: base.liveTicks,
            liveMarkers: base.liveMarkers,
          };
          if (idx >= 0) next[idx] = entry;
          else next.unshift(entry);
          persistIndex(next);
          return next;
        });

        if (st.status === "completed") {
          stopPoll(jobId);
          pollFailureCount.current.delete(jobId);
          let fullLogs = st.logs;
          let fullLiveTicks = st.liveTicks ?? undefined;
          let fullLiveMarkers = st.liveMarkers ?? undefined;
          try {
            const full = await getJobStatus(jobId, { compact: false, timeoutMs: 90_000 });
            fullLogs = full.logs;
            fullLiveTicks = full.liveTicks ?? undefined;
            fullLiveMarkers = full.liveMarkers ?? undefined;
          } catch {
            /* keep compact tail */
          }
          try {
            const result = await getJobResult(jobId);
            setJobs((prev) => {
              const next = prev.map((j) =>
                j.jobId === jobId
                  ? { ...j, result, logs: fullLogs, liveTicks: fullLiveTicks, liveMarkers: fullLiveMarkers }
                  : j,
              );
              persistIndex(next);
              return next;
            });
          } catch (loadErr) {
            const detail = describeApiError(loadErr);
            setJobs((prev) => {
              const next = prev.map((j) =>
                j.jobId === jobId
                  ? {
                      ...j,
                      status: "completed" as const,
                      logs: fullLogs,
                      liveTicks: fullLiveTicks,
                      liveMarkers: fullLiveMarkers,
                      error: `Completed but result download failed: ${detail}. Open the job page to retry.`,
                    }
                  : j,
              );
              persistIndex(next);
              return next;
            });
          }
        } else if (st.status === "failed") {
          stopPoll(jobId);
          pollFailureCount.current.delete(jobId);
          try {
            const full = await getJobStatus(jobId, { compact: false, timeoutMs: 90_000 });
            setJobs((prev) => {
              const next = prev.map((j) =>
                j.jobId === jobId
                  ? {
                      ...j,
                      logs: full.logs,
                      liveTicks: full.liveTicks ?? j.liveTicks,
                      liveMarkers: full.liveMarkers ?? j.liveMarkers,
                    }
                  : j,
              );
              persistIndex(next);
              return next;
            });
          } catch {
            /* keep compact */
          }
        }
      } catch (e) {
        const n = (pollFailureCount.current.get(jobId) ?? 0) + 1;
        pollFailureCount.current.set(jobId, n);
        const detail = describeApiError(e);
        if (n >= POLL_FAILURES_BEFORE_ABORT) {
          stopPoll(jobId);
          pollFailureCount.current.delete(jobId);
          setJobs((prev) => {
            const next = prev.map((j) =>
              j.jobId === jobId
                ? {
                    ...j,
                    status: "failed" as const,
                    error: `Status poll failed after ${POLL_FAILURES_BEFORE_ABORT} attempts: ${detail}`,
                  }
                : j,
            );
            persistIndex(next);
            return next;
          });
        } else {
          setJobs((prev) => {
            const next = prev.map((j) =>
              j.jobId === jobId
                ? {
                    ...j,
                    error: `Temporary API error (${n}/${POLL_FAILURES_BEFORE_ABORT}): ${detail}`,
                  }
                : j,
            );
            persistIndex(next);
            return next;
          });
        }
      }
    },
    [persistIndex, stopPoll],
  );

  const startBacktest = useCallback(
    async (config: BacktestSubmitConfig) => {
      const { jobId } = await submitBacktest(config);
      const entry: JobEntry = {
        jobId,
        status: "queued",
        progress: 0,
        logs: [],
        error: null,
        createdAt: Date.now(),
        config,
      };
      setJobs((prev) => {
        const next = [entry, ...prev.filter((j) => j.jobId !== jobId)];
        persistIndex(next);
        return next;
      });
      if (!pollers.current.has(jobId)) {
        const id = setInterval(() => void pollJob(jobId), JOB_POLL_INTERVAL_MS);
        pollers.current.set(jobId, id);
      }
      void pollJob(jobId);
      return jobId;
    },
    [persistIndex, pollJob],
  );

  const refreshJob = useCallback(
    async (jobId: string) => {
      await pollJob(jobId);
    },
    [pollJob],
  );

  const getJob = useCallback((jobId: string) => jobs.find((j) => j.jobId === jobId), [jobs]);

  const removeJob = useCallback(
    (jobId: string) => {
      stopPoll(jobId);
      pollFailureCount.current.delete(jobId);
      setJobs((prev) => {
        const next = prev.filter((j) => j.jobId !== jobId);
        persistIndex(next);
        return next;
      });
    },
    [persistIndex, stopPoll],
  );

  const activePollingKey = useMemo(
    () =>
      jobs
        .filter((j) => j.status === "queued" || j.status === "running")
        .map((j) => j.jobId)
        .sort()
        .join("\0"),
    [jobs],
  );

  useEffect(() => {
    const ids = activePollingKey ? activePollingKey.split("\0").filter(Boolean) : [];
    for (const jobId of ids) {
      if (!pollers.current.has(jobId)) {
        const tid = setInterval(() => void pollJob(jobId), JOB_POLL_INTERVAL_MS);
        pollers.current.set(jobId, tid);
        void pollJob(jobId);
      }
    }
  }, [activePollingKey, pollJob]);

  const value = useMemo(
    () => ({ jobs, startBacktest, refreshJob, getJob, attachResult, removeJob }),
    [jobs, startBacktest, refreshJob, getJob, attachResult, removeJob],
  );

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}
