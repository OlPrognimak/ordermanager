import type { NoiseFilterId } from "@/utils/noiseFilters";
import { NOISE_FILTER_OPTIONS } from "@/utils/noiseFilters";

const ALLOWED_NOISE = new Set<NoiseFilterId>(NOISE_FILTER_OPTIONS.map((o) => o.id));
type ExtremaLocationMode = "classic" | "spread_anchored";

/** Matches `MikeV1Strategy` defaults in `pmbacktest/strategies/mike_v1.py` + dashboard `defaultParams`. */
export const DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS = {
  emaSpan: 20,
  noiseFilter: "gaussian" as NoiseFilterId,
  structuralHysteresisQuote: 5,
  sustainedTangentMs: 1000,
  extremaLocationMode: "spread_anchored" as ExtremaLocationMode,
  extremaClusterMinSamples: 0,
  minLegSwingBtcUsd: 0,
  minLegSwingQuoteCents: 0,
  valleyToPeakAsk: 5,
  valleyMaxRawAskCents: 48,
};

export type GraphEmbedSignalParams = typeof DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS;

function pickNumber(p: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function pickNoiseFilter(p: Record<string, unknown>): NoiseFilterId {
  const raw = p.noise_filter ?? p.noiseFilter;
  const s =
    typeof raw === "string" ? raw.trim().toLowerCase() : raw != null ? String(raw).trim().toLowerCase() : "";
  if (s && ALLOWED_NOISE.has(s as NoiseFilterId)) return s as NoiseFilterId;
  return DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.noiseFilter;
}

/**
 * When the run was `mike_v1`, return chart/extrema params from persisted `strategy_params`
 * so the embed uses the **same** signal settings as the Python engine for that job.
 */
export function mikeV1GraphSignalParamsFromRunMeta(meta: {
  strategy_name?: string;
  strategy_params?: Record<string, unknown>;
}): GraphEmbedSignalParams | null {
  if (String(meta?.strategy_name ?? "").trim().toLowerCase() !== "mike_v1") return null;
  const raw = meta.strategy_params;
  const p =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  return {
    emaSpan: Math.max(2, Math.round(pickNumber(p, ["span"], DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.emaSpan))),
    noiseFilter: pickNoiseFilter(p),
    structuralHysteresisQuote: pickNumber(
      p,
      ["quote_structural_hysteresis_cents", "quoteStructuralHysteresisCents"],
      DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.structuralHysteresisQuote,
    ),
    sustainedTangentMs: Math.max(
      1,
      Math.round(pickNumber(p, ["sustained_tangent_ms", "sustainedTangentMs"], DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.sustainedTangentMs)),
    ),
    extremaLocationMode:
      String(p.extrema_location_mode ?? p.extremaLocationMode ?? "spread_anchored").trim().toLowerCase() === "spread_anchored"
        ? "spread_anchored"
        : "classic",
    extremaClusterMinSamples: 0,
    minLegSwingBtcUsd: 0,
    minLegSwingQuoteCents: 0,
    valleyToPeakAsk: pickNumber(
      p,
      ["valley_to_peak_raw_spread_min_cents", "valleyToPeakRawSpreadMinCents"],
      DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.valleyToPeakAsk,
    ),
    valleyMaxRawAskCents: pickNumber(
      p,
      ["valley_max_raw_ask_cents", "valleyMaxRawAskCents"],
      DEFAULT_GRAPH_EMBED_SIGNAL_PARAMS.valleyMaxRawAskCents,
    ),
  };
}
