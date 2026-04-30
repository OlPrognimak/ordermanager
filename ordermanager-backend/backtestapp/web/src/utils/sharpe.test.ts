import { describe, expect, it } from "@jest/globals";
import { sharpeFromEquity } from "./sharpe";

describe("sharpeFromEquity", () => {
  it("returns null for short series", () => {
    expect(sharpeFromEquity([1, 2])).toBeNull();
  });

  it("is positive for steady uptrend", () => {
    const eq = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const s = sharpeFromEquity(eq);
    expect(s).not.toBeNull();
    expect(s!).toBeGreaterThan(0);
  });
});
