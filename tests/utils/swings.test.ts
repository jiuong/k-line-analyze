import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { findSwings } from "../../src/utils/swings.js";

function bar(index: number, high: number, low: number): Bar {
  return { time: 1_700_000_000 + index * 60, open: low, high, low, close: high };
}

describe("findSwings", () => {
  it("marks a high above the left bars and at or above the right bars", () => {
    const bars = [1, 2, 5, 4, 3, 2, 1].map((high, index) => bar(index, high, high - 1));
    expect(findSwings(bars, 2)).toEqual([{ kind: "high", index: 2, price: 5 }]);
  });

  it("marks a low below the left bars and at or below the right bars", () => {
    const bars = [5, 4, 1, 2, 3, 4, 5].map((low, index) => bar(index, low + 1, low));
    expect(findSwings(bars, 2)).toEqual([{ kind: "low", index: 2, price: 1 }]);
  });

  it("keeps the more extreme of two adjacent same-kind swings", () => {
    const highs = [1, 2, 6, 4, 3, 5, 4, 2, 1];
    const bars = highs.map((high, index) => bar(index, high, 0));
    expect(findSwings(bars, 2).filter((swing) => swing.kind === "high")).toEqual([
      { kind: "high", index: 2, price: 6 },
    ]);
  });

  it("rejects a span below 1", () => {
    expect(() => findSwings([bar(0, 1, 0)], 0)).toThrow(TypeError);
  });
});
