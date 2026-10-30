import { describe, expect, it } from "vitest";
import { classifyTrendlineBreak } from "../../src/analyze/classifyTrendlineBreak.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = high): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

function flat(prices: number[]): Bar[] {
  return prices.map((price, index) => bar(index, price, price));
}

describe("classifyTrendlineBreak", () => {
  it("throws when bars or swingSpan is invalid", () => {
    expect(() => classifyTrendlineBreak([])).toThrow(TypeError);
    expect(() => classifyTrendlineBreak(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 1, 0)];
    expect(() => classifyTrendlineBreak(bars, null as unknown as object)).toThrow(
      /classifyTrendlineBreak: options/,
    );
    expect(() => classifyTrendlineBreak(bars, { swingSpan: 0 })).toThrow(
      /classifyTrendlineBreak: swingSpan/,
    );
  });

  it("returns unclear when no close leaves the countertrend rail", () => {
    const bars = flat([5, 1, 4, 2, 6, 3]);
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.functionId).toBe("classifyTrendlineBreak");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("breaks=0; last=unclear");
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: {
          start: toTimeString(bars[0]!.time),
          end: toTimeString(bars[bars.length - 1]!.time),
        },
        levels: [],
      },
    ]);
  });

  it("marks a close below a bull channel's lower rail", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3]), bar(6, 4, 1, 2)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.summary).toBe("breaks=1; last=bear_line_break");
    expect(result.results).toHaveLength(1);
    const item = result.results[0]!;
    expect(item.name).toBe("bear_line_break");
    expect(item.range).toEqual({ start: toTimeString(bars[6]!.time) });
    expect(item.levels.map((level) => level.name)).toEqual([
      "BreakBar",
      "ChannelLow1",
      "ChannelLow2",
    ]);
    expect(item.levels[0]).toEqual({
      name: "BreakBar",
      price: 2,
      time: toTimeString(bars[6]!.time),
    });
    expect(item.levels.slice(1).map((level) => level.price)).toEqual([1, 2]);
  });

  it("marks a close above a bear channel's upper rail", () => {
    const bars = [...flat([1, 7, 3, 6, 2, 5, 1, 4]), bar(8, 10, 10, 10)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.results.map((item) => item.name)).toEqual(["bull_line_break"]);
    const item = result.results[0]!;
    expect(item.levels[0]?.price).toBe(10);
    expect(item.levels.slice(1).map((level) => level.name)).toEqual([
      "ChannelHigh1",
      "ChannelHigh2",
    ]);
    expect(item.levels.slice(1).map((level) => level.price)).toEqual([6, 5]);
  });

  it("ignores a wick beyond the rail when the close stays inside", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3]), bar(6, 4, 1, 4)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.summary).toBe("breaks=0; last=unclear");
  });

  it("ignores a with-trend close beyond the other rail", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3]), bar(6, 9, 9, 9)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
  });

  it("emits one result for each consecutive close beyond the same rail", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3]), bar(6, 2, 2, 2), bar(7, 1, 1, 1)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.summary).toBe("breaks=2; last=bear_line_break");
    expect(result.results.map((item) => item.levels[0]?.price)).toEqual([2, 1]);
    expect(result.results.every((item) => item.name === "bear_line_break")).toBe(true);
  });

  it("does not keep the previous channel's rail after the next channel starts", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3, 7, 4]), bar(8, 3, 3, 3)];
    const result = classifyTrendlineBreak(bars, { swingSpan: 1 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.levels.slice(1).map((level) => level.price)).toEqual([2, 3]);
  });
});
