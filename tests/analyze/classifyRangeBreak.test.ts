import { describe, expect, it } from "vitest";
import { classifyRangeBreak } from "../../src/analyze/classifyRangeBreak.js";
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

function edge(bars: Bar[], name: "RangeHigh" | "RangeLow") {
  const segment = classifyTradingRange(bars).results.find(
    (item) => item.name === "broad_trading_range",
  );
  return segment?.levels.find((level) => level.name === name);
}

describe("classifyRangeBreak", () => {
  it("throws when bars is empty", () => {
    expect(() => classifyRangeBreak([])).toThrow(TypeError);
    expect(() => classifyRangeBreak(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("marks the first close above the range and skips the next", () => {
    const bars = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13.2, 15, 13, 14),
    ]);
    const high = edge(bars, "RangeHigh");
    const result = classifyRangeBreak(bars);
    expect(result.functionId).toBe("classifyRangeBreak");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("rangeBreaks=1; last=range_break");
    expect(result.evidence.items).toEqual([{ side: "up" }]);
    expect(result.results).toEqual([
      {
        name: "range_break",
        range: { start: timeAt(27) },
        levels: [
          { name: "BreakBar", price: 13, time: timeAt(27) },
          { name: "BrokenEdge", price: high!.price, time: high!.time },
        ],
      },
    ]);
  });

  it("does not mark a wick that closes back inside", () => {
    const shelfBar = (index: number) => bar(index, 8.4, 10, 8, 8.6);
    const gap = (index: number) => bar(index, 8.6, 9.2, 8.5, 8.8);
    const bars = [
      shelfBar(0),
      shelfBar(1),
      gap(2),
      shelfBar(3),
      shelfBar(4),
      bar(5, 9.2, 14, 8.5, 9),
      bar(6, 10, 11, 9.5, 10),
    ];
    const inside = classifyRangeBreak(bars);
    expect(inside.summary).toBe("rangeBreaks=0; last=unclear");
    expect(inside.results[0]?.name).toBe("unclear");

    bars.push(bar(7, 11, 12, 10.5, 11.5));
    const result = classifyRangeBreak(bars);
    expect(result.evidence.items).toEqual([{ side: "up" }]);
    expect(result.results).toEqual([
      {
        name: "range_break",
        range: { start: timeAt(7) },
        levels: [
          { name: "BreakBar", price: 11.5, time: timeAt(7) },
          { name: "BrokenEdge", price: 10, time: timeAt(0) },
        ],
      },
    ]);
  });

  it("marks the first close below the range", () => {
    const bars = shelf([
      bar(27, 0.2, 1, -2, -1),
      bar(28, -1, 0, -3, -2),
    ]);
    const low = edge(bars, "RangeLow");
    const result = classifyRangeBreak(bars);
    expect(result.summary).toBe("rangeBreaks=1; last=range_break");
    expect(result.evidence.items).toEqual([{ side: "down" }]);
    expect(result.results[0]).toEqual({
      name: "range_break",
      range: { start: timeAt(27) },
      levels: [
        { name: "BreakBar", price: -1, time: timeAt(27) },
        { name: "BrokenEdge", price: low!.price, time: low!.time },
      ],
    });
  });

  it("returns unclear when no trading range is present", () => {
    const bars = [bar(0, 1, 2, 0.5, 1.8)];
    const result = classifyRangeBreak(bars);
    expect(result.summary).toBe("rangeBreaks=0; last=unclear");
    expect(result.evidence.items).toEqual([]);
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(0) },
        levels: [],
      },
    ]);
  });
});
