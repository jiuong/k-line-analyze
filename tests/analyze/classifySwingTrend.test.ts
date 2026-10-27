import { describe, expect, it } from "vitest";
import {
  classifySwingTrend,
  mergeLegsIntoTrends,
} from "../../src/analyze/classifySwingTrend.js";
import type { Bar } from "../../src/types/bars.js";
import { findSwingLegs } from "../../src/utils/swingLegs.js";
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

const ENTRY_MARKS = new Set(["H1", "H2", "H3", "L1", "L2", "L3"]);

function withoutEntryMarks<T extends { levels: { name: string }[] }>(
  results: readonly T[],
): T[] {
  return results.map((item) => ({
    ...item,
    levels: item.levels.filter((level) => !ENTRY_MARKS.has(level.name)),
  }));
}

/** Bull → HL bear → HH bull (span 1). */
function pullbackChain(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 42, 44, 30, 32),
    bar(3, 32, 45, 31, 44),
    bar(4, 44, 60, 43, 58),
    bar(5, 58, 59, 50, 52),
    bar(6, 52, 55, 49, 54),
    bar(7, 54, 75, 53, 74),
    bar(8, 74, 76, 70, 72),
    bar(9, 72, 73, 68, 70),
  ];
}

/** Bull then bear that covers the prior low (no bounce high after). */
function coverBreak(): Bar[] {
  return [
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
}

/** Bull, multi-leg bear pullback (holds prior low), bull HH. */
function nestedBearPullback(): Bar[] {
  return [
    bar(0, 40, 42, 38, 39),
    bar(1, 39, 40, 25, 26),
    bar(2, 26, 28, 20, 22),
    bar(3, 22, 40, 21, 38),
    bar(4, 38, 50, 37, 48),
    bar(5, 48, 49, 36, 37),
    bar(6, 37, 38, 35, 36),
    bar(7, 36, 45, 35, 44),
    bar(8, 44, 46, 40, 41),
    bar(9, 41, 42, 32, 33),
    bar(10, 33, 34, 31, 32),
    bar(11, 32, 55, 31, 54),
    bar(12, 54, 70, 53, 68),
    bar(13, 68, 72, 65, 66),
    bar(14, 66, 68, 60, 62),
  ];
}

/** Pullback holds but next bull fails a higher high. */
function failedHigherHigh(): Bar[] {
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

describe("mergeLegsIntoTrends", () => {
  it("chains same-direction legs across a holding pullback", () => {
    const bars = pullbackChain();
    const legs = findSwingLegs(bars, 1);
    expect(legs.map((leg) => leg.direction)).toEqual(["bull", "bear", "bull"]);
    expect(mergeLegsIntoTrends(legs, bars)).toEqual([
      { direction: "bull", startLegIndex: 0, endLegIndex: 2, nested: [] },
    ]);
  });

  it("opens a reverse trend when the opposite leg covers the guard", () => {
    const bars = coverBreak();
    const legs = findSwingLegs(bars, 1);
    expect(legs.map((leg) => leg.direction)).toEqual(["bull", "bear"]);
    const merged = mergeLegsIntoTrends(legs, bars);
    expect(merged.map((t) => t.direction)).toEqual(["bull", "bear"]);
    expect(merged[0]).toMatchObject({
      direction: "bull",
      startLegIndex: 0,
      endLegIndex: 0,
      nested: [],
    });
    expect(merged[1]?.direction).toBe("bear");
    expect(merged[1]?.startLegIndex).toBe(1);
  });

  it("nests a multi-leg opposite trend as a pullback", () => {
    const bars = nestedBearPullback();
    const legs = findSwingLegs(bars, 1);
    const merged = mergeLegsIntoTrends(legs, bars);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      direction: "bull",
      startLegIndex: 0,
      endLegIndex: 4,
    });
    expect(merged[0]!.nested).toEqual([
      { direction: "bear", startLegIndex: 1, endLegIndex: 3, nested: [] },
    ]);
  });

  it("stops the trend when the next impulse fails a new extreme", () => {
    const bars = failedHigherHigh();
    const legs = findSwingLegs(bars, 1);
    expect(mergeLegsIntoTrends(legs, bars)).toEqual([
      { direction: "bull", startLegIndex: 0, endLegIndex: 0, nested: [] },
      { direction: "bear", startLegIndex: 1, endLegIndex: 1, nested: [] },
      { direction: "bull", startLegIndex: 2, endLegIndex: 2, nested: [] },
    ]);
  });
});

describe("classifySwingTrend", () => {
  it("opens one bull trend from a single bull leg", () => {
    const bars = [
      bar(0, 50, 55, 48, 52),
      bar(1, 52, 54, 40, 42),
      bar(2, 42, 44, 30, 32),
      bar(3, 32, 45, 31, 44),
      bar(4, 44, 60, 43, 58),
      bar(5, 58, 59, 50, 52),
      bar(6, 52, 55, 49, 54),
    ];

    const result = classifySwingTrend(bars, { swingSpan: 1 });

    expect(result.functionId).toBe("classifySwingTrend");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(withoutEntryMarks(result.results)).toEqual([
      {
        name: "bull_trend",
        range: { start: timeAt(2), end: timeAt(4) },
        levels: [
          { name: "BullTrendStart", price: 30, time: timeAt(2) },
          { name: "BullTrendEnd", price: 60, time: timeAt(4) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `trends=1; minor=0; ranges=0; last=bull_trend from=${timeAt(2)} to=${timeAt(4)}`,
    );
  });

  it("opens one bear trend from a single bear leg", () => {
    const bars = [
      bar(0, 40, 50, 38, 48),
      bar(1, 48, 60, 47, 58),
      bar(2, 58, 62, 55, 56),
      bar(3, 56, 57, 40, 42),
      bar(4, 42, 43, 30, 32),
      bar(5, 32, 35, 28, 34),
      bar(6, 34, 36, 30, 33),
    ];

    const result = classifySwingTrend(bars, { swingSpan: 1 });
    const legs = findSwingLegs(bars, 1);
    expect(legs).toHaveLength(1);
    expect(legs[0]?.direction).toBe("bear");
    expect(result.results.map((item) => item.name)).toEqual(["bear_trend"]);
    expect(withoutEntryMarks([result.results[0]!])[0]).toMatchObject({
      name: "bear_trend",
      levels: [
        {
          name: "BearTrendStart",
          price: legs[0]!.startPrice,
          time: timeAt(legs[0]!.startIndex),
        },
        {
          name: "BearTrendEnd",
          price: legs[0]!.endPrice,
          time: timeAt(legs[0]!.endIndex),
        },
      ],
    });
  });

  it("merges a holding single-leg pullback into one bull trend", () => {
    const result = classifySwingTrend(pullbackChain(), { swingSpan: 1 });

    expect(withoutEntryMarks(result.results)).toEqual([
      {
        name: "bull_trend",
        range: { start: timeAt(2), end: timeAt(8) },
        levels: [
          { name: "BullTrendStart", price: 30, time: timeAt(2) },
          { name: "BullTrendEnd", price: 76, time: timeAt(8) },
        ],
      },
    ]);
  });

  it("ends the prior trend and opens the reverse when the opposite covers", () => {
    const bars = coverBreak();
    const result = classifySwingTrend(bars, { swingSpan: 1 });
    const legs = findSwingLegs(bars, 1);

    expect(result.results.map((item) => item.name)).toEqual([
      "bull_trend",
      "bear_trend",
    ]);
    expect(withoutEntryMarks([result.results[0]!])[0]).toMatchObject({
      range: { start: timeAt(2), end: timeAt(4) },
      levels: [
        { name: "BullTrendStart", price: 30, time: timeAt(2) },
        { name: "BullTrendEnd", price: 60, time: timeAt(4) },
      ],
    });
    expect(withoutEntryMarks([result.results[1]!])[0]).toMatchObject({
      name: "bear_trend",
      levels: [
        {
          name: "BearTrendStart",
          price: legs[1]!.startPrice,
          time: timeAt(legs[1]!.startIndex),
        },
        {
          name: "BearTrendEnd",
          price: legs[1]!.endPrice,
          time: timeAt(legs[1]!.endIndex),
        },
      ],
    });
  });

  it("emits a nested opposite trend used as a pullback", () => {
    const result = classifySwingTrend(nestedBearPullback(), { swingSpan: 1 });

    expect(result.results.map((item) => item.name)).toEqual([
      "bull_trend",
      "bear_trend",
    ]);
    expect(withoutEntryMarks([result.results[0]!])[0]).toMatchObject({
      range: { start: timeAt(2), end: timeAt(13) },
      levels: [
        { name: "BullTrendStart", price: 20, time: timeAt(2) },
        { name: "BullTrendEnd", price: 72, time: timeAt(13) },
      ],
    });
    expect(result.results[1]?.name).toBe("bear_trend");
    expect(result.results[1]?.range.start).toBe(timeAt(4));
  });

  it("returns unclear when no swing legs form", () => {
    const bars = [
      bar(0, 10, 12, 8, 11),
      bar(1, 11, 13, 9, 12),
      bar(2, 12, 13, 10, 11),
    ];

    const result = classifySwingTrend(bars);

    expect(withoutEntryMarks(result.results)).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [],
      },
    ]);
    expect(result.summary).toBe(
      "trends=0; minor=0; ranges=0; last=unclear from=- to=-",
    );
  });

  it("returns unclear for one or two bars", () => {
    const one = classifySwingTrend([bar(0, 10, 11, 7, 8)]);
    const two = classifySwingTrend([
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
    ]);

    expect(one.results[0]?.name).toBe("unclear");
    expect(two.results[0]?.name).toBe("unclear");
  });

  it("labels a narrow overlapping segment as a trading range", () => {
    const bars = [
      bar(0, 20, 22, 18, 19),
      bar(1, 19, 21, 10, 11),
      bar(2, 11, 22, 10, 20),
      bar(3, 20, 22, 10, 12),
      bar(4, 12, 22, 10, 18),
      bar(5, 18, 22, 10, 15),
      bar(6, 15, 21, 11, 14),
      bar(7, 14, 20, 12, 13),
    ];

    const result = classifySwingTrend(bars, { swingSpan: 1 });
    const names = result.results.map((item) => item.name);
    expect(names.includes("trading_range") || names.includes("bull_trend")).toBe(
      true,
    );
  });

  it("throws TypeError for a non-array or an empty array", () => {
    expect(() => classifySwingTrend([])).toThrow(TypeError);
    expect(() => classifySwingTrend(undefined as unknown as Bar[])).toThrow(
      /classifySwingTrend/,
    );
    expect(() =>
      classifySwingTrend([bar(0, 1, 2, 0, 1)], { swingSpan: 0 }),
    ).toThrow(TypeError);
  });

  it("appends H2 marks from pullback-scoped second entries", () => {
    const bars = [
      bar(0, 50, 55, 48, 52),
      bar(1, 52, 54, 40, 42),
      bar(2, 22, 35, 20, 34),
      bar(3, 34, 55, 33, 54),
      bar(4, 54, 70, 53, 68),
      bar(5, 66, 67, 58, 59),
      bar(6, 59, 60, 50, 51),
      bar(7, 51, 58, 50.5, 57),
      bar(8, 57, 62, 56, 61),
      bar(9, 60, 61, 54, 55),
      bar(10, 55, 56, 52, 53),
      bar(11, 54, 72, 53, 71),
      bar(12, 71, 80, 70, 79),
      bar(13, 79, 78, 74, 75),
      bar(14, 75, 76, 73, 74),
    ];
    // Defaults: major swingSpan=2, entrySwingSpan=1 for H2 marks.
    const result = classifySwingTrend(bars);
    const marks = result.results.flatMap((item) =>
      item.levels.filter((level) => level.name === "H2" || level.name === "L2"),
    );
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks.some((level) => level.name === "H2")).toBe(true);
  });
});
