import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { findSwingLegs } from "../../src/utils/swingLegs.js";

function bar(index: number, high: number, low: number): Bar {
  return { time: 1_700_000_000 + index * 60, open: low, high, low, close: high };
}

describe("findSwingLegs", () => {
  it("pairs one swing low with the next swing high", () => {
    const highs = [3, 2, 1, 2, 5, 4, 3];
    const bars = highs.map((high, index) => bar(index, high, high - 1));
    expect(findSwingLegs(bars, 2)).toEqual([
      {
        direction: "bull",
        startIndex: 2,
        endIndex: 4,
        startPrice: 0,
        endPrice: 5,
      },
    ]);
  });

  it("keeps same-direction legs separate", () => {
    const prices = [5, 1, 4, 2, 6, 3, 2];
    const bars = prices.map((price, index) => bar(index, price, price - 0.5));
    expect(findSwingLegs(bars, 1).map((leg) => leg.direction)).toEqual([
      "bull",
      "bear",
      "bull",
    ]);
  });

  it("does not pair a swing high and swing low on the same bar", () => {
    const bars = [
      bar(0, 5, 4),
      bar(1, 10, 1),
      bar(2, 6, 5),
    ];
    expect(findSwingLegs(bars, 1)).toEqual([]);
  });

  it("returns no legs when the ends cannot fill the span", () => {
    const bars = [1, 3, 2, 4].map((high, index) => bar(index, high, high - 1));
    expect(findSwingLegs(bars, 2)).toEqual([]);
    expect(findSwingLegs([], 2)).toEqual([]);
  });

  it("throws when bars is not an array", () => {
    expect(() => findSwingLegs(null as unknown as Bar[])).toThrow(TypeError);
  });
});
