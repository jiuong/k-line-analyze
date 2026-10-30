import { describe, expect, it } from "vitest";
import { classifyTradingRange } from "../../src/analyze/classifyTradingRange.js";
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

/**
 * Flat shelf. Swing low 6, high 12, low 18, high 24.
 * Steps are wide enough that three-bar windows are not tight ranges.
 */
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

function fromRanges(rows: Array<[number, number]>, bullish = true): Bar[] {
  return rows.map(([low, high], index) => {
    const open = bullish ? low + 0.2 : high - 0.2;
    const close = bullish ? high - 0.2 : low + 0.2;
    return bar(index, open, high, low, close);
  });
}

describe("classifyTradingRange", () => {
  it("marks a flat swing-leg oscillation and leaves a later tailed cluster out", () => {
    const bars = fromRanges(shelfRows());
    for (let index = 27; index <= 31; index += 1) {
      const doji = index === 29;
      bars.push(
        doji
          ? bar(index, 11.3, 11.4, 11.1, 11.3)
          : bar(index, 11.15, 11.4, 11.1, 11.35),
      );
    }

    const result = classifyTradingRange(bars);
    expect(result.results.map((item) => item.name)).toEqual(["broad_trading_range"]);
    const broad = result.results[0]!;
    expect(broad.range).toEqual({ start: timeAt(6), end: timeAt(24) });
    expect(broad.levels).toEqual([
      { name: "RangeLow", price: 0, time: timeAt(6) },
      { name: "RangeHigh", price: 12, time: timeAt(12) },
    ]);
    expect(result.evidence.segments[0]).toMatchObject({
      testsHigh: 2,
      testsLow: 2,
      failedBreakouts: 0,
      boundaryDriftHigh: 0,
    });
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe(
      `ranges=1; broad=1; tight=0; barbwire=0; breakout=0; last=broad_trading_range from=${timeAt(6)} to=${timeAt(24)}`,
    );
  });

  it("does not mark a drifting channel as a broad range", () => {
    const rows = shelfRows().map(([low, high], index) =>
      index >= 12 ? [low + 5, high + 5] as [number, number] : [low, high],
    );
    const result = classifyTradingRange(fromRanges(rows));
    expect(result.results.some((item) => item.name === "broad_trading_range")).toBe(false);
  });

  it("labels a long tight overlap as breakout mode", () => {
    const bars = Array.from({ length: 22 }, (_, index) =>
      index === 10 ? bar(index, 0.5, 1.2, 0.5, 0.7) : bar(index, 0.3, 2, 0, 0.8),
    );
    const result = classifyTradingRange(bars);
    expect(result.results.map((item) => item.name)).toEqual(["breakout_mode"]);
    expect(result.results[0]!.range).toEqual({ start: timeAt(0), end: timeAt(21) });
    expect(result.summary).toContain("breakout=1");
  });

  it("ends a broad range before two closes beyond the shelf", () => {
    const bars = fromRanges(shelfRows());
    bars.push(bar(27, 12.6, 14, 12.4, 13));
    bars.push(bar(28, 13.2, 15, 13, 14));
    const result = classifyTradingRange(bars);
    const broad = result.results.find((item) => item.name === "broad_trading_range");
    expect(broad?.range).toEqual({ start: timeAt(6), end: timeAt(24) });
    expect(broad?.levels).toContainEqual({ name: "RangeHigh", price: 12, time: timeAt(12) });
  });

  it("puts RangeHigh on the lower level when only one bar prints the high", () => {
    const shelf = (index: number) => bar(index, 8.4, 10, 8, 8.6);
    const bars = [
      shelf(0),
      bar(1, 8.5, 12, 8.2, 8.7),
      shelf(2),
      bar(3, 8.8, 10, 8.6, 9),
      shelf(4),
      shelf(5),
    ];
    const result = classifyTradingRange(bars);
    expect(result.results[0]?.levels).toContainEqual({
      name: "RangeHigh",
      price: 10,
      time: timeAt(0),
    });
  });

  it("ends the range before a poke at least 1.5 times the height", () => {
    const shelf = (index: number) => bar(index, 8.4, 10, 8, 8.6);
    const gap = (index: number) => bar(index, 8.6, 9.2, 8.5, 8.8);
    const bars = [
      shelf(0),
      shelf(1),
      gap(2),
      shelf(3),
      shelf(4),
      bar(5, 11.9, 14, 9, 13.5),
      bar(6, 12, 12.2, 8.2, 9),
    ];
    const result = classifyTradingRange(bars);
    expect(result.results[0]?.range).toEqual({ start: timeAt(0), end: timeAt(4) });
  });

  it("keeps a 1.2 height poke when a close returns inside within two bars", () => {
    const shelf = (index: number) => bar(index, 8.4, 10, 8, 8.6);
    const gap = (index: number) => bar(index, 8.6, 9.2, 8.5, 8.8);
    const bars = [
      shelf(0),
      shelf(1),
      gap(2),
      shelf(3),
      shelf(4),
      bar(5, 11.8, 12.4, 8.5, 12),
      bar(6, 8.5, 10, 8, 9),
    ];
    const result = classifyTradingRange(bars);
    expect(result.results[0]?.range).toEqual({ start: timeAt(0), end: timeAt(6) });
    expect(result.results[0]?.levels).toContainEqual({
      name: "RangeHigh",
      price: 10,
      time: timeAt(0),
    });
  });

  it("drops a segment that has only one trend direction", () => {
    const bars = [
      bar(0, 8, 10, 8, 9.5),
      bar(1, 9, 11, 8.5, 10.5),
      bar(2, 10, 12, 9, 11.5),
      bar(3, 11, 13, 9.5, 12.5),
    ];
    const result = classifyTradingRange(bars);
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
  });

  it("drops a smaller range that sits entirely inside a larger one", () => {
    const shelf = (index: number) => bar(index, 8.4, 10, 8, 8.6);
    const gap = (index: number) => bar(index, 8.6, 9.2, 8.5, 8.8);
    const bars = [
      bar(0, 8.2, 13, 8, 8.4),
      shelf(1),
      shelf(2),
      gap(3),
      shelf(4),
      shelf(5),
      shelf(6),
    ];
    const result = classifyTradingRange(bars);
    expect(result.results.map((item) => item.range)).toEqual([
      { start: timeAt(0), end: timeAt(6) },
    ]);
  });

  it("does not mark a single-leg staircase as a tight range", () => {
    const bars = Array.from({ length: 5 }, (_, index) => {
      const low = index * 0.2;
      return bar(index, low + 1, low + 10, low, low + 9);
    });
    const result = classifyTradingRange(bars);
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
  });

  it("does not mark a new-extreme swing trend as a broad range", () => {
    const rows = shelfRows().map(
      ([low, high], index) => (index === 24 ? [low, 12.2] : [low, high]) as [number, number],
    );
    const result = classifyTradingRange(fromRanges(rows));
    expect(result.results.some((item) => item.name === "broad_trading_range")).toBe(false);
  });

  it("returns unclear when the window has no second test", () => {
    const bars = Array.from({ length: 10 }, (_, index) =>
      bar(index, index * 3, index * 3 + 1, index * 3, index * 3 + 1),
    );
    const result = classifyTradingRange(bars);
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(9) },
        levels: [],
      },
    ]);
    expect(result.evidence.segments).toEqual([]);
    expect(result.summary).toBe(
      "ranges=0; broad=0; tight=0; barbwire=0; breakout=0; last=unclear from=- to=-",
    );
  });

  it("throws when bars are missing", () => {
    expect(() => classifyTradingRange([])).toThrow(TypeError);
    expect(() => classifyTradingRange(undefined as unknown as Bar[])).toThrow(TypeError);
  });
});
