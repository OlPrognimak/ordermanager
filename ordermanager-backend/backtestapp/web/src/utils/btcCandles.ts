import type { EquityPoint } from "@/api/types";

export type BtcCandle = { x: number; o: number; h: number; l: number; c: number };

/**
 * Bucket BTC spot (`price`) into OHLC candles aligned to `windowStartMs`.
 * Buckets are [start + k*interval, start + (k+1)*interval) intersected with the round window.
 */
export function buildBtcCandles(
  points: EquityPoint[],
  windowStartMs: number,
  windowEndMs: number,
  intervalMs: number,
): BtcCandle[] {
  const span = windowEndMs - windowStartMs;
  if (span <= 0 || intervalMs <= 0) return [];

  const sorted = [...points]
    .filter((p) => Number.isFinite(p.timestamp_ms))
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms);

  type Bucket = { o: number; h: number; l: number; c: number };
  const buckets = new Map<number, Bucket>();

  for (const p of sorted) {
    const ts = p.timestamp_ms;
    if (ts < windowStartMs || ts >= windowEndMs) continue;
    const price = p.price;
    if (price == null || !Number.isFinite(price)) continue;

    const k = Math.floor((ts - windowStartMs) / intervalMs);
    const bucketStart = windowStartMs + k * intervalMs;
    if (bucketStart >= windowEndMs) continue;

    const b = buckets.get(k);
    if (!b) {
      buckets.set(k, { o: price, h: price, l: price, c: price });
    } else {
      if (price > b.h) b.h = price;
      if (price < b.l) b.l = price;
      b.c = price;
    }
  }

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return keys.map((k) => {
    const b = buckets.get(k)!;
    return {
      x: windowStartMs + k * intervalMs,
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
    };
  });
}
