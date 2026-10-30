import { describe, expect, it } from "vitest";
import { classifyPullback } from "../../src/analyze/classifyPullback.js";
import { classifySwingTrend } from "../../src/analyze/classifySwingTrend.js";
import { classifyTrendWithPullbacks } from "../../src/analyze/classifyTrendWithPullbacks.js";
import type { Bar } from "../../src/types/bars.js";

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

function risingBar(index: number, step: number): Bar {
  const low = step * 3;
  return bar(index, low + 0.2, low + 1, low, low + 0.8);
}

function wickBar(index: number, high: number, low: number, bodyRatio: number): Bar {
  const height = high - low;
  const open = low + height * 0.35;
  return bar(index, open, high, low, open + height * bodyRatio);
}

function shelvedTrend(): Bar[] {
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
  for (let step = 0; step < 4; step += 1) {
    const low = 30 + step * 3;
    bars.push(bar(bars.length, low + 0.2, low + 1, low, low + 0.8));
  }
  return bars;
}

const bullWithBarPullback = [
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

const nestedMinor = [
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

describe("classifyTrendWithPullbacks", () => {
  it("attaches one bar pullback to the bull trend and keeps the swing segments", () => {
    const swing = classifySwingTrend(bullWithBarPullback, SPAN1);
    const pullback = classifyPullback(bullWithBarPullback, SPAN1);
    const result = classifyTrendWithPullbacks(bullWithBarPullback, SPAN1);

    expect(result.functionId).toBe("classifyTrendWithPullbacks");
    expect(result.confidence).toBe(1);
    expect(result.results).toEqual(swing.results);
    expect(result.evidence.segments).toHaveLength(result.results.length);

    const parent = result.results.findIndex((item) => item.name === "bull_trend");
    expect(parent).toBeGreaterThanOrEqual(0);
    const evidence = pullback.evidence.pullbacks[0];
    expect(result.evidence.segments[parent]?.pullbacks).toEqual([
      {
        name: "bar_pullback",
        range: pullback.results[0]?.range,
        levels: pullback.results[0]?.levels,
        legCount: evidence?.legCount,
        depthPct: evidence?.depthPct,
        nearestFibPct: evidence?.nearestFibPct,
        relation: evidence?.relation,
      },
    ]);
    expect(result.summary).toContain("annotated=1");
    expect(result.summary).toContain("pullbacks=1");
  });

  it("forwards fibTouchTolerance to the attached pullback", () => {
    const result = classifyTrendWithPullbacks(bullWithBarPullback, {
      ...SPAN1,
      fibTouchTolerance: 0.2,
    });
    const child = result.evidence.segments.flatMap((segment) => segment.pullbacks)[0];

    expect(child).toMatchObject({ nearestFibPct: 23.6, relation: "touched" });
  });

  it("puts a leg pullback on the parent trend and leaves the minor row empty", () => {
    const swing = classifySwingTrend(nestedMinor, SPAN1);
    const result = classifyTrendWithPullbacks(nestedMinor, SPAN1);

    expect(result.results).toEqual(swing.results);
    const bull = result.results.findIndex((item) => item.name === "bull_trend");
    const minor = result.results.findIndex((item) => item.name === "minor_bear_trend");
    expect(result.evidence.segments[bull]?.pullbacks.map((item) => item.name)).toEqual([
      "bar_pullback",
      "leg_pullback",
    ]);
    expect(result.evidence.segments[minor]?.pullbacks).toEqual([]);
    expect(result.summary).toContain("pullbacks=2");
  });

  it("keeps swing segments without attaching consolidation for a shelved window", () => {
    const bars = shelvedTrend();
    const swing = classifySwingTrend(bars, SPAN1);
    const pullback = classifyPullback(bars, SPAN1);
    const result = classifyTrendWithPullbacks(bars, SPAN1);

    expect(pullback.results.map((item) => item.name)).not.toContain(
      "consolidation_pullback",
    );
    expect(result.results).toEqual(swing.results);
    expect(
      result.evidence.segments.flatMap((segment) =>
        segment.pullbacks.map((item) => item.name),
      ),
    ).not.toContain("consolidation_pullback");
  });

  it("keeps an unclear swing segment and an empty child list when nothing pulls back", () => {
    const bars = [
      bar(0, 10, 12, 8, 11),
      bar(1, 11, 13, 9, 12),
      bar(2, 12, 13, 10, 11),
    ];
    const swing = classifySwingTrend(bars);
    const result = classifyTrendWithPullbacks(bars);

    expect(result.results).toEqual(swing.results);
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.evidence.segments).toEqual([{ pullbacks: [] }]);
    expect(result.summary).toBe(
      "trends=0; annotated=0; pullbacks=0; last=unclear children=0",
    );
    expect(result.confidence).toBe(1);
  });

  it("throws TypeError for invalid bars or tolerance", () => {
    expect(() => classifyTrendWithPullbacks([])).toThrow(TypeError);
    expect(() => classifyTrendWithPullbacks(undefined as unknown as Bar[])).toThrow(
      TypeError,
    );
    expect(() =>
      classifyTrendWithPullbacks([bar(0, 1, 2, 0, 1)], { fibTouchTolerance: 0 }),
    ).toThrow(TypeError);
  });
});
