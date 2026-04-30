import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadJson, saveJson } from "@/utils/storage";

export interface ConfigureDraft {
  strategy: string;
  strategyParamsJson: string;
  initialCash: string;
  timeStart: string;
  timeEnd: string;
  dataGranularityMs: number;
  datasetLabel: string;
  maxPositionShares: string;
  maxGrossNotional: string;
  maxConcurrentSides: string;
  /** When true, engine runs pre-trade portfolio/risk checks and passes max position cap to strategies. */
  applyRiskLimits: boolean;
  stopLossPct: string;
  takeProfitPct: string;
  slippageFraction: string;
  feeRate: string;
  latencyMs: string;
  settleRoundBoundaries: boolean;
  simulationSpeed: number;
}

/** Persisted UI for market replay scrubber (localStorage, separate from run draft). */
export interface ReplayUiPrefs {
  /** Simulated ms per wall ms while playing. */
  marketReplaySpeed: number;
  /** When true, loading a new tick series opens the scrubber at the last timestamp. */
  marketReplayStartAtEnd: boolean;
  /** Debug mode: render replay using only discrete ticks (no interpolation). */
  marketReplayDiscreteOnly: boolean;
}

const TIMED_BTC_DIFF_ROUND_V1_DEFAULT_PARAMS = {
  side: "both",
  order_qty: 10,
  early_ask_max_cents: 25,
  early_btc_diff_max_usd: 35,
  mid_ask_min_cents: 30,
  mid_ask_max_cents: 45,
  mid_btc_diff_max_usd: 15,
  tp_mult: 2,
  tp_btc_diff_max_usd: 30,
  late_exit_btc_diff_min_usd: 25,
  winddown_last_ms: 3000,
} as const;

const DEFAULT_DRAFT: ConfigureDraft = {
  strategy: "timed_btc_diff_round_v1",
  strategyParamsJson: JSON.stringify(TIMED_BTC_DIFF_ROUND_V1_DEFAULT_PARAMS, null, 2),
  initialCash: "10000",
  timeStart: "",
  timeEnd: "",
  dataGranularityMs: 100,
  datasetLabel: "btc-updown-5m-ticks",
  // Empty by default: no implicit risk caps unless the user sets them.
  maxPositionShares: "",
  maxGrossNotional: "",
  maxConcurrentSides: "",
  applyRiskLimits: false,
  stopLossPct: "",
  takeProfitPct: "",
  slippageFraction: "0.001",
  feeRate: "0.0002",
  latencyMs: "0",
  settleRoundBoundaries: true,
  simulationSpeed: 1,
};

const DEFAULT_REPLAY_UI: ReplayUiPrefs = {
  marketReplaySpeed: 4,
  marketReplayStartAtEnd: true,
  marketReplayDiscreteOnly: false,
};

interface PreferencesContextValue {
  draft: ConfigureDraft;
  setDraft: (u: Partial<ConfigureDraft>) => void;
  resetDraft: () => void;
  replayUi: ReplayUiPrefs;
  setReplayUi: (u: Partial<ReplayUiPrefs>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const DRAFT_KEY = "configureDraft";
const REPLAY_UI_KEY = "replayUiPrefs";

function loadReplayUi(): ReplayUiPrefs {
  const raw = loadJson<Partial<ReplayUiPrefs>>(REPLAY_UI_KEY, {});
  return { ...DEFAULT_REPLAY_UI, ...raw };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<ConfigureDraft>(() => ({
    ...DEFAULT_DRAFT,
    ...loadJson(DRAFT_KEY, DEFAULT_DRAFT),
  }));

  const [replayUi, setReplayUiState] = useState<ReplayUiPrefs>(loadReplayUi);

  const setDraft = useCallback((u: Partial<ConfigureDraft>) => {
    setDraftState((d) => {
      const next = { ...d, ...u };
      saveJson(DRAFT_KEY, next);
      return next;
    });
  }, []);

  const setReplayUi = useCallback((u: Partial<ReplayUiPrefs>) => {
    setReplayUiState((prev) => {
      const next = { ...prev, ...u };
      saveJson(REPLAY_UI_KEY, next);
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState(DEFAULT_DRAFT);
    saveJson(DRAFT_KEY, DEFAULT_DRAFT);
  }, []);

  const value = useMemo(
    () => ({ draft, setDraft, resetDraft, replayUi, setReplayUi }),
    [draft, replayUi, setDraft, resetDraft, setReplayUi],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be within PreferencesProvider");
  return ctx;
}
