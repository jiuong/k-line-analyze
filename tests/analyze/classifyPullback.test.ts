import { describe, expect, it } from "vitest";
import { classifyPullback } from "../../src/analyze/classifyPullback.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;
const SPAN1 = { swingSpan: 1 as const };

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

function risingBar(index: number, step: number): Bar {
  const low = step * 3;
  return bar(index, low + 0.2, low + 1, low, low + 0.8);
}

function wickBar(index: number, high: number, low: number, bodyRatio: number): Bar {
  const height = high - low;
  const open = low + height * 0.35;
  return bar(index, open, high, low, open + height * bodyRatio);
}

function shelvedTrend(rightBars = 4): Bar[] {
  const bars: Bar[] = [bar(0, 0.2, 2, 0, 1.8)];
  for (let step = 0; step < 4; step += 1) bars.push(risingBar(bars.length, step));
  const shelf: Array<[number, number, number]> = [
    [22, 20, 0.4],
    [22, 20, 0.4],
    [21.2, 20.6, 0.2],
    [21.2, 20.6, 0.2],
    [22, 20, 0.4],
  ];
  for (const [high, low, body] of shelf) bars.push(wickBar(bars.length, high, low, body));
  for (let step = 0; step < rightBars; step += 1) {
    const low = 30 + step * 3;
    bars.push(bar(bars.length, low + 0.2, low + 1, low, low + 0.8));
  }
  return bars;
}

/** One bullish swing low → up → one adverse bar → higher high. */
function bullWithBarPullback(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 22, 35, 20, 34),
    bar(3, 34, 50, 33, 48),
    bar(4, 48, 49, 40, 41),
    bar(5, 41, 55, 40, 54),
    bar(6, 54, 70, 53, 68),
    bar(7, 68, 72, 65, 66),
    bar(8, 66, 68, 60, 62),
  ];
}

function bearWithBarPullback(): Bar[] {
  return [
    bar(0, 40, 50, 38, 48),
    bar(1, 48, 60, 47, 58),
    bar(2, 58, 70, 55, 56),
    bar(3, 56, 57, 45, 46),
    bar(4, 46, 52, 45, 51),
    bar(5, 51, 52, 30, 32),
    bar(6, 32, 33, 20, 22),
    bar(7, 22, 28, 18, 26),
    bar(8, 26, 30, 24, 28),
  ];
}

function multiLegPullback(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 22, 35, 20, 34),
    bar(3, 34, 55, 33, 54),
    bar(4, 54, 54, 48, 49),
    bar(5, 49, 53, 48, 52),
    bar(6, 52, 52, 42, 43),
    bar(7, 43, 70, 42, 68),
    bar(8, 68, 75, 67, 74),
    bar(9, 74, 76, 70, 72),
    bar(10, 72, 73, 68, 70),
  ];
}

/** After nest: bull + minor_bear → bar_pullback + leg_pullback. */
function nestedMinor(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 42, 44, 30, 32),
    bar(3, 32, 45, 31, 44),
    bar(4, 44, 60, 43, 58),
    bar(5, 58, 59, 50, 52),
    bar(6, 52, 55, 49, 54),
    bar(7, 54, 58, 53, 56),
    bar(8, 56, 57, 45, 46),
    bar(9, 46, 48, 40, 42),
  ];
}

describe("classifyPullback", () => {
  it("reports one bear bar inside a bull trend as a bar pullback", () => {
    const bars = bullWithBarPullback();
    const result = classifyPullback(bars, SPAN1);

    expect(result.functionId).toBe("classifyPullback");
    expect(result.confidence).toBe(1);
    expect(result.results.map((item) => item.name)).toEqual(["bar_pullback"]);
    expect(result.results[0]?.range).toEqual({
      start: timeAt(4),
      end: timeAt(4),
    });
    expect(result.evidence.pullbacks[0]).toMatchObject({
      legCount: 1,
      nearestFibPct: 23.6,
      relation: "not_reached",
    });
    expect(result.summary).toContain("bars=1");
  });

  it("treats a wider tolerance as a touch of the same fib level", () => {
    const bars = bullWithBarPullback();
    const result = classifyPullback(bars, { ...SPAN1, fibTouchTolerance: 0.2 });

    expect(result.evidence.pullbacks[0]).toMatchObject({
      nearestFibPct: 23.6,
      relation: "touched",
    });
  });

  it("reports one bull bar inside a bear trend as a bar pullback", () => {
    const result = classifyPullback(bearWithBarPullback(), SPAN1);

    expect(result.results.map((item) => item.name)).toEqual(["bar_pullback"]);
    expect(result.evidence.pullbacks[0]?.legCount).toBe(1);
  });

  it("joins two adverse legs when the pause does not break the prior high", () => {
    const result = classifyPullback(multiLegPullback(), SPAN1);

    expect(result.results.map((item) => item.name)).toEqual(["multi_leg_pullback"]);
    expect(result.evidence.pullbacks[0]?.legCount).toBe(2);
    expect(result.summary).toContain("multi=1");
  });

  it("labels a nested minor with one adverse leg as a leg pullback", () => {
    const result = classifyPullback(nestedMinor(), SPAN1);

    expect(result.results.map((item) => item.name)).toEqual([
      "bar_pullback",
      "leg_pullback",
    ]);
    expect(result.evidence.pullbacks).toHaveLength(result.results.length);
    expect(result.evidence.pullbacks[1]?.legCount).toBe(1);
    expect(result.summary).toContain("legs=1");
  });

  it("does not treat an overlapping classifyTradingRange inside one continuous bull as consolidation", () => {
    const result = classifyPullback(shelvedTrend(), SPAN1);

    expect(result.results.map((item) => item.name)).not.toContain(
      "consolidation_pullback",
    );
  });

  it("does not treat an opposite major trend as a consolidation", () => {
    const bars = [
      bar(0, 50, 55, 48, 52),
      bar(1, 52, 54, 40, 42),
      bar(2, 42, 44, 30, 32),
      bar(3, 32, 50, 31, 48),
      bar(4, 48, 60, 47, 58),
      bar(5, 58, 59, 40, 42),
      bar(6, 42, 43, 25, 28),
      bar(7, 28, 30, 25, 26),
      bar(8, 26, 27, 18, 20),
      bar(9, 20, 22, 17, 19),
    ];

    const result = classifyPullback(bars, SPAN1);

    expect(result.results.map((item) => item.name)).not.toContain(
      "consolidation_pullback",
    );
  });

  it("does not report consolidation when a short right stair leaves one continuous bull", () => {
    const result = classifyPullback(shelvedTrend(2), SPAN1);

    expect(result.results.map((item) => item.name)).not.toContain(
      "consolidation_pullback",
    );
  });

  it("returns unclear when the window has no swing legs", () => {
    const bars = [
      bar(0, 10, 12, 8, 11),
      bar(1, 11, 13, 9, 12),
      bar(2, 12, 13, 10, 11),
    ];

    const result = classifyPullback(bars);

    expect(result.results[0]?.name).toBe("unclear");
    expect(result.results[0]?.levels).toEqual([]);
    expect(result.evidence.pullbacks).toEqual([]);
    expect(result.confidence).toBe(1);
  });

  it("throws TypeError for invalid bars or tolerance", () => {
    expect(() => classifyPullback([])).toThrow(TypeError);
    expect(() => classifyPullback(undefined as unknown as Bar[])).toThrow(TypeError);
    expect(() =>
      classifyPullback([bar(0, 1, 2, 0, 1)], { fibTouchTolerance: 0 }),
    ).toThrow(TypeError);
    expect(() =>
      classifyPullback([bar(0, 1, 2, 0, 1)], { fibTouchTolerance: Number.NaN }),
    ).toThrow(TypeError);
    expect(() =>
      classifyPullback([bar(0, 1, 2, 0, 1)], { swingSpan: 0 }),
    ).toThrow(TypeError);
  });
});
