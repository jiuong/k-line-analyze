import { describe, expect, it } from "vitest";
import { classifyBodyGap } from "../../src/analyze/classifyBodyGap.js";
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

describe("classifyBodyGap", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifyBodyGap([])).toThrow(TypeError);
    expect(() => classifyBodyGap(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("marks an unfilled gap up with the near and far edges", () => {
    const bars = [
      candle(0, 8, 10, 7, 9),
      candle(1, 13, 14, 12, 13),
      candle(2, 13, 15, 11, 14),
    ];
    const result = classifyBodyGap(bars);
    const near = toTimeString(bars[0]!.time);
    const far = toTimeString(bars[1]!.time);
    expect(result.functionId).toBe("classifyBodyGap");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("gaps=1; last=open_body_gap");
    expect(result.results).toEqual([
      {
        name: "open_body_gap",
        range: { start: far },
        levels: [
          { name: "GapNear", price: 10, time: near },
          { name: "GapFar", price: 12, time: far },
        ],
      },
    ]);
  });

  it("marks a filled gap down through the bar that reaches the near edge", () => {
    const bars = [
      candle(0, 12, 14, 11, 13),
      candle(1, 8, 9, 6, 7),
      candle(2, 8, 12, 7, 11),
    ];
    const result = classifyBodyGap(bars);
    const near = toTimeString(bars[0]!.time);
    const far = toTimeString(bars[1]!.time);
    const end = toTimeString(bars[2]!.time);
    expect(result.summary).toBe("gaps=1; last=filled_body_gap");
    expect(result.results).toEqual([
      {
        name: "filled_body_gap",
        range: { start: far, end },
        levels: [
          { name: "GapNear", price: 11, time: near },
          { name: "GapFar", price: 9, time: far },
        ],
      },
    ]);
  });

  it("returns unclear when wicks only touch", () => {
    const bars = [
      candle(0, 8, 10, 7, 9),
      candle(1, 10, 12, 10, 11),
    ];
    const result = classifyBodyGap(bars);
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
    expect(result.summary).toBe("gaps=0; last=unclear");
  });
});
