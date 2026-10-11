import { describe, expect, it } from "vitest";
import { runReview } from "../../src/page/reviewModel.js";
import type { Bar } from "../../src/types/bars.js";

const bars: Bar[] = [
  { time: 1_704_067_200, open: 1, high: 2, low: 0.5, close: 1.2 },
  { time: 1_704_070_800, open: 1.2, high: 1.5, low: 1, close: 1.1 },
  { time: 1_704_074_400, open: 1.1, high: 1.4, low: 0.9, close: 1 },
];

describe("runReview", () => {
  it("returns nothing until an analyzer is enabled", () => {
    expect(runReview(bars)).toEqual([]);
    expect(runReview(bars, [])).toEqual([]);
  });

  it("runs only the enabled analyzer", () => {
    const results = runReview(bars, ["classifyReversalSignal"]);
    expect(results.map((item) => item.functionId)).toEqual([
      "classifyReversalSignal",
    ]);
    expect(results[0]?.confidence).toBe(1);
    expect(results[0]?.results.length).toBeGreaterThan(0);
  });

  it("returns swing trend and reversal signal when both are enabled", () => {
    const results = runReview(bars, [
      "classifySwingTrend",
      "classifyReversalSignal",
    ]);
    expect(results.map((item) => item.functionId)).toEqual([
      "classifySwingTrend",
      "classifyReversalSignal",
    ]);
  });
});
