import { describe, expect, it } from "@jest/globals";
import type { BacktestResult } from "@/api/types";
import {
  buildRoundSummaries,
  equitySeriesForRoundWindow,
  floorToUtcFiveMinute,
  MARKET_WINDOW_MS,
} from "./rounds";

describe("floorToUtcFiveMinute", () => {
  it("floors to previous 5-minute UTC boundary", () => {
    const ts = Date.UTC(2024, 0, 1, 10, 7, 30, 500);
    expect(floorToUtcFiveMinute(ts)).toBe(Date.UTC(2024, 0, 1, 10, 5, 0, 0));
  });

  it("leaves :00 unchanged", () => {
    const ts = Date.UTC(2024, 0, 1, 10, 0, 0, 0);
    expect(floorToUtcFiveMinute(ts)).toBe(ts);
  });
});

describe("buildRoundSummaries", () => {
  it("buckets closed trades by UTC 5m window", () => {
    const base = Date.UTC(2024, 0, 1, 12, 0, 0, 0);
    const result = {
      run_id: "x",
      meta: {} as BacktestResult["meta"],
      performance: {} as BacktestResult["performance"],
      parameter_set: {},
      equity: [
        { timestamp_ms: base, equity: 1000, cash: 500, unrealized_pnl: 500 },
        { timestamp_ms: base + MARKET_WINDOW_MS + 1000, equity: 1010, cash: 500, unrealized_pnl: 510 },
      ],
      trades: [
        {
          trade_id: "a",
          side: "yes",
          opened_ts_ms: base,
          closed_ts_ms: base + 60_000,
          quantity: 1,
          entry_price: 0.5,
          exit_price: 0.55,
          fees_paid: 0,
          realized_pnl: 5,
        },
        {
          trade_id: "b",
          side: "no",
          opened_ts_ms: base + MARKET_WINDOW_MS - 1000,
          closed_ts_ms: base + MARKET_WINDOW_MS + 30_000,
          quantity: 1,
          entry_price: 0.5,
          exit_price: 0.48,
          fees_paid: 0,
          realized_pnl: -2,
        },
      ],
    } as BacktestResult;
    const rows = buildRoundSummaries(result);
    const r0 = rows.find((r) => r.window_start_ms === base);
    const r1 = rows.find((r) => r.window_start_ms === base + MARKET_WINDOW_MS);
    expect(r0?.closes_count).toBe(1);
    expect(r0?.realized_pnl).toBe(5);
    expect(r0?.realized_ending_equity).toBe(1005);
    expect(r0?.expected_pnl).toBeCloseTo(0.05, 9);
    expect(r0?.fee_drag).toBeCloseTo(-4.95, 9);
    expect(r1?.closes_count).toBe(1);
    expect(r1?.realized_pnl).toBe(-2);
    expect(r1?.realized_ending_equity).toBe(1003);
    expect(r1?.expected_pnl).toBeCloseTo(-0.02, 9);
    expect(r1?.fee_drag).toBeCloseTo(1.98, 9);
  });
});

describe("equitySeriesForRoundWindow", () => {
  it("returns in-window points and optional prior pad", () => {
    const ws = Date.UTC(2024, 0, 1, 12, 0, 0, 0);
    const we = ws + MARKET_WINDOW_MS;
    const eq = [
      { timestamp_ms: ws - 1000, equity: 100, cash: 0, unrealized_pnl: 0 },
      { timestamp_ms: ws + 1000, equity: 101, cash: 0, unrealized_pnl: 0 },
      { timestamp_ms: we - 1000, equity: 102, cash: 0, unrealized_pnl: 0 },
      { timestamp_ms: we + 5000, equity: 999, cash: 0, unrealized_pnl: 0 },
    ];
    const inner = equitySeriesForRoundWindow(eq, ws, we, false);
    expect(inner).toHaveLength(2);
    expect(inner[0]!.equity).toBe(101);
    const padded = equitySeriesForRoundWindow(eq, ws, we, true);
    expect(padded[0]!.timestamp_ms).toBe(ws - 1000);
    expect(padded).toHaveLength(3);
  });
});
