import { describe, expect, it } from "vitest";
import { classifyDoji } from "../../src/analyze/classifyDoji.js";
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

describe("classifyDoji", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifyDoji([])).toThrow(TypeError);
    expect(() => classifyDoji(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("marks a bar whose body is at most a quarter of the range", () => {
    const bars = [candle(0, 10, 14, 10, 11), candle(1, 10, 16, 10, 16)];
    const result = classifyDoji(bars);
    const time = toTimeString(bars[0]!.time);
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("dojis=1; last=doji");
    expect(result.evidence).toEqual({});
    expect(result.results).toEqual([
      {
        name: "doji",
        range: { start: time, end: time },
        levels: [
          { name: "BarHigh", price: 14, time },
          { name: "BarLow", price: 10, time },
        ],
      },
    ]);
  });

  it("does not mark a zero-height bar", () => {
    const bars = [candle(0, 5, 5, 5, 5)];
    const result = classifyDoji(bars);
    const time = toTimeString(bars[0]!.time);
    expect(result.results).toEqual([
      { name: "unclear", range: { start: time, end: time }, levels: [] },
    ]);
    expect(result.summary).toBe("dojis=0; last=unclear");
  });
});
