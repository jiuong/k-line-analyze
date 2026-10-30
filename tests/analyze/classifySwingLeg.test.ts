import { describe, expect, it } from "vitest";
import { classifySwingLeg } from "../../src/analyze/classifySwingLeg.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number): Bar {
  return { time: T0 + index * 60, open: low, high, low, close: high };
}

describe("classifySwingLeg", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifySwingLeg([])).toThrow(TypeError);
    expect(() => classifySwingLeg(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("throws when options or swingSpan is invalid", () => {
    const bars = [bar(0, 1, 0)];
    expect(() => classifySwingLeg(bars, null as unknown as object)).toThrow(TypeError);
    expect(() => classifySwingLeg(bars, { swingSpan: 0 })).toThrow(TypeError);
    expect(() => classifySwingLeg(bars, { swingSpan: 1.5 })).toThrow(TypeError);
  });

  it("marks a low-to-high pair as a bull leg", () => {
    const highs = [3, 2, 1, 2, 5, 4, 3];
    const bars = highs.map((high, index) => bar(index, high, high - 1));
    const result = classifySwingLeg(bars);
    const start = toTimeString(bars[2]!.time);
    const end = toTimeString(bars[4]!.time);
    expect(result.functionId).toBe("classifySwingLeg");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("legs=1; last=bull_leg");
    expect(result.results).toEqual([
      {
        name: "bull_leg",
        range: { start, end },
        levels: [
          { name: "LegStart", price: 0, time: start },
          { name: "LegEnd", price: 5, time: end },
        ],
      },
    ]);
  });

  it("keeps a bear leg between two bull legs", () => {
    const prices = [5, 1, 4, 2, 6, 3, 2];
    const bars = prices.map((price, index) => bar(index, price, price - 0.5));
    const result = classifySwingLeg(bars, { swingSpan: 1 });
    expect(result.results.map((item) => item.name)).toEqual([
      "bull_leg",
      "bear_leg",
      "bull_leg",
    ]);
    expect(result.summary).toBe("legs=3; last=bull_leg");
  });

  it("returns unclear when the ends cannot fill the span", () => {
    const bars = [1, 3, 2, 4].map((high, index) => bar(index, high, high - 1));
    const result = classifySwingLeg(bars);
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: {
          start: toTimeString(bars[0]!.time),
          end: toTimeString(bars[3]!.time),
        },
        levels: [],
      },
    ]);
    expect(result.summary).toBe("legs=0; last=unclear");
  });
});
