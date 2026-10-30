import { describe, expect, it } from "vitest";
import { classifyExtremeRetest } from "../../src/analyze/classifyExtremeRetest.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = (high + low) / 2): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

describe("classifyExtremeRetest", () => {
  it("throws when bars or priceTolerance is invalid", () => {
    expect(() => classifyExtremeRetest([])).toThrow(TypeError);
    expect(() => classifyExtremeRetest(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 2, 1)];
    expect(() => classifyExtremeRetest(bars, { priceTolerance: -1 })).toThrow(
      /classifyExtremeRetest: priceTolerance/,
    );
    expect(() => classifyExtremeRetest(bars, { swingSpan: 1.5 })).toThrow(
      /classifyExtremeRetest: swingSpan/,
    );
  });

  it("marks a later low that sits inside and outside the tolerance band", () => {
    const centers = [8, 2, 10, 4, 9, 3, 11, 5];
    const bars = centers.map((price, index) => bar(index, price + 2, price - 2));
    const result = classifyExtremeRetest(bars, { swingSpan: 1 });
    expect(result.functionId).toBe("classifyExtremeRetest");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("retests=1; last=higher_low");
    expect(result.results).toEqual([
      {
        name: "higher_low",
        range: {
          start: toTimeString(bars[1]!.time),
          end: toTimeString(bars[3]!.time),
        },
        levels: [
          { name: "PriorExtreme", price: 0, time: toTimeString(bars[1]!.time) },
          { name: "Retest", price: 2, time: toTimeString(bars[3]!.time) },
        ],
      },
    ]);
    const retest = result.results[0]!.levels[1]!.price;
    const prior = result.results[0]!.levels[0]!.price;
    expect(retest).toBeGreaterThan(prior);
  });

  it("does not label two highs that sit inside the default tolerance", () => {
    const centers = [8, 2, 10, 4, 9, 3, 11, 5];
    const bars = centers.map((price, index) => bar(index, price + 2, price - 2));
    const result = classifyExtremeRetest(bars, { swingSpan: 1 });
    expect(result.results.some((item) => item.name === "lower_high")).toBe(false);
  });

  it("labels a slightly lower high when the tolerance is zero", () => {
    const centers = [8, 2, 10, 4, 9, 3, 11, 5];
    const bars = centers.map((price, index) => bar(index, price + 2, price - 2));
    const result = classifyExtremeRetest(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.results.map((item) => item.name)).toContain("lower_high");
    const lower = result.results.find((item) => item.name === "lower_high")!;
    const prior = lower.levels[0]!.price;
    const retest = lower.levels[1]!.price;
    expect(retest).toBeLessThan(prior);
  });

  it("returns unclear when no inside retest is outside the band", () => {
    const bars = [1, 3, 2, 4].map((high, index) => bar(index, high, high - 1));
    const result = classifyExtremeRetest(bars);
    expect(result.summary).toBe("retests=0; last=unclear");
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.results[0]?.levels).toEqual([]);
  });
});
