import { describe, expect, it } from "vitest";
import { classifyBreakoutPullback } from "../../src/analyze/classifyBreakoutPullback.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

function timeAt(index: number): string {
  return toTimeString(T0 + index * 60);
}

function shelfRows(): Array<[number, number]> {
  return [
    [12, 14],
    [10, 12],
    [8, 10],
    [6, 8],
    [4, 6],
    [2, 4],
    [0, 2],
    [2, 4],
    [4, 6],
    [6, 8],
    [8, 10],
    [10, 11.5],
    [11, 12],
    [9, 11],
    [7, 9],
    [5, 7],
    [3, 5],
    [1.2, 3.2],
    [0.3, 2.3],
    [2, 4],
    [4, 6],
    [6, 8],
    [8, 10],
    [10, 11.6],
    [11.2, 12],
    [10, 11.5],
    [10, 11.5],
  ];
}

function shelf(extra: Bar[] = []): Bar[] {
  const bars = shelfRows().map(([low, high], index) =>
    bar(index, low + 0.2, high, low, high - 0.2),
  );
  return bars.concat(extra);
}

/** Follow-through, then the first bear leg back to the broken high, then a resume. */
function pullback(low = 12.3, close = 13.2): Bar[] {
  return shelf([
    bar(27, 12.6, 14, 12.4, 13),
    bar(28, 13, 15, 12.8, 14.6),
    bar(29, 14.6, 16, 14.2, 15.8),
    bar(30, 15.1, 15.2, 14.5, 14.8),
    bar(31, 15, 16.4, 14.8, 16.2),
    bar(32, 14, 14.2, low, close),
    bar(33, 14.2, 18, 14, 17.5),
  ]);
}

describe("classifyBreakoutPullback", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyBreakoutPullback([])).toThrow(TypeError);
    expect(() => classifyBreakoutPullback(null as unknown as Bar[])).toThrow(TypeError);
    const bars = pullback();
    expect(() => classifyBreakoutPullback(bars, null as unknown as object)).toThrow(TypeError);
    expect(() => classifyBreakoutPullback(bars, { swingSpan: 0 })).toThrow(TypeError);
    expect(() => classifyBreakoutPullback(bars, { tickSize: 0 })).toThrow(TypeError);
    expect(() => classifyBreakoutPullback(bars, { priceTolerance: -1 })).toThrow(TypeError);
  });

  it("uses the first opposite leg after follow-through and places the stop beyond its end", () => {
    const bars = pullback();
    const result = classifyBreakoutPullback(bars, { swingSpan: 1, tickSize: 0.1 });
    expect(result.functionId).toBe("classifyBreakoutPullback");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({ directions: ["up"] });
    expect(result.summary).toBe("breakoutPullbacks=1; last=breakout_pullback");
    expect(result.results).toEqual([
      {
        name: "breakout_pullback",
        range: { start: timeAt(31), end: timeAt(33) },
        levels: [
          { name: "BrokenEdge", price: 12, time: timeAt(12) },
          { name: "LegEnd", price: 12.3, time: timeAt(32) },
          { name: "SignalBar", price: 18, time: timeAt(33) },
          { name: "Entry", price: 16.5, time: timeAt(33) },
          { name: "Stop", price: 12.3 - 0.1, time: timeAt(32) },
          { name: "Target", price: 28.5, time: timeAt(33) },
        ],
      },
    ]);
  });

  it("returns unclear when the pullback close is back inside the range", () => {
    const result = classifyBreakoutPullback(pullback(11.9, 12), { swingSpan: 1 });
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.summary).toBe("breakoutPullbacks=0; last=unclear");
  });

  it("returns unclear when there is no follow-through", () => {
    const bars = shelf([bar(27, 12.6, 14, 12.4, 13)]);
    const result = classifyBreakoutPullback(bars, { swingSpan: 1 });
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.evidence).toEqual({ directions: [] });
  });

  it("returns unclear when the leg end is outside the tolerance", () => {
    const result = classifyBreakoutPullback(pullback(), {
      swingSpan: 1,
      priceTolerance: 0,
    });
    expect(result.results[0]?.name).toBe("unclear");
  });
});
