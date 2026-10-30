import { describe, expect, it } from "vitest";
import { classifyTrendBar } from "../../src/analyze/classifyTrendBar.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

describe("classifyTrendBar", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifyTrendBar([])).toThrow(TypeError);
    expect(() => classifyTrendBar(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("emits one bull and one bear bar with shaved aligned to the result", () => {
    const bars = [
      candle(0, 10, 16, 10, 16),
      candle(1, 10, 20, 10, 13),
      candle(2, 16, 18, 10, 12),
    ];
    const result = classifyTrendBar(bars);
    expect(result.functionId).toBe("classifyTrendBar");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("trendBars=2; last=bear_trend_bar");
    expect(result.results.map((item) => item.name)).toEqual([
      "bull_trend_bar",
      "bear_trend_bar",
    ]);
    expect(result.evidence.items).toEqual([{ shaved: true }, { shaved: false }]);
    const bullTime = toTimeString(bars[0]!.time);
    expect(result.results[0]).toEqual({
      name: "bull_trend_bar",
      range: { start: bullTime, end: bullTime },
      levels: [
        { name: "BarHigh", price: 16, time: bullTime },
        { name: "BarLow", price: 10, time: bullTime },
      ],
    });
  });

  it("returns unclear when no bar is a trend bar", () => {
    const bars = [candle(0, 10, 20, 10, 13), candle(1, 13, 20, 10, 14)];
    const result = classifyTrendBar(bars);
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: {
          start: toTimeString(bars[0]!.time),
          end: toTimeString(bars[1]!.time),
        },
        levels: [],
      },
    ]);
    expect(result.summary).toBe("trendBars=0; last=unclear");
    expect(result.evidence.items).toEqual([]);
  });
});
