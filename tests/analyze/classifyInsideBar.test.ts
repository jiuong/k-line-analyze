import { describe, expect, it } from "vitest";
import { classifyInsideBar } from "../../src/analyze/classifyInsideBar.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
  time = T0 + index * 60,
): Bar {
  return { time, open, high, low, close };
}

describe("classifyInsideBar", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifyInsideBar([])).toThrow(TypeError);
    expect(() => classifyInsideBar(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("emits each consecutive inside bar and skips the first bar", () => {
    const bars = [
      candle(0, 5, 10, 0, 5),
      candle(1, 4, 9, 1, 6),
      candle(2, 5, 8, 2, 6),
    ];
    const result = classifyInsideBar(bars);
    expect(result.summary).toBe("insideBars=2; last=inside_bar");
    expect(result.confidence).toBe(1);
    expect(result.results.map((item) => item.name)).toEqual([
      "inside_bar",
      "inside_bar",
    ]);
    expect(result.results[0]?.range.start).toBe(toTimeString(bars[1]!.time));
    expect(result.results[0]?.levels).toEqual([
      { name: "BarHigh", price: 9, time: toTimeString(bars[1]!.time) },
      { name: "BarLow", price: 1, time: toTimeString(bars[1]!.time) },
    ]);
  });

  it("does not mark two bars with the same high and low", () => {
    const bars = [candle(0, 5, 10, 0, 5), candle(1, 4, 10, 0, 6)];
    const result = classifyInsideBar(bars);
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.results[0]?.levels).toEqual([]);
    expect(result.summary).toBe("insideBars=0; last=unclear");
  });

  it("still compares neighbors whose open times are hours apart", () => {
    const bars = [
      candle(0, 5, 10, 0, 5, T0),
      candle(1, 4, 9, 1, 6, T0 + 6 * 60 * 60),
    ];
    const result = classifyInsideBar(bars);
    expect(result.results.map((item) => item.name)).toEqual(["inside_bar"]);
    expect(result.results[0]?.range.end).toBe(toTimeString(bars[1]!.time));
  });
});
