import { describe, expect, it } from "vitest";
import { classifyFollowThrough } from "../../src/analyze/classifyFollowThrough.js";
import { classifyRangeBreak } from "../../src/analyze/classifyRangeBreak.js";
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

describe("classifyFollowThrough", () => {
  it("throws when bars is empty", () => {
    expect(() => classifyFollowThrough([])).toThrow(TypeError);
    expect(() => classifyFollowThrough(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("marks two bull trend bars after an upside break", () => {
    const bars = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13, 15, 12.8, 14.6),
      bar(29, 14.6, 16, 14.2, 15.8),
      bar(30, 15, 15.4, 12, 12.1),
    ]);
    const broke = classifyRangeBreak(bars).results[0]!;
    const result = classifyFollowThrough(bars);
    expect(result.functionId).toBe("classifyFollowThrough");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("followThroughs=1; last=follow_through");
    expect(result.results).toEqual([
      {
        name: "follow_through",
        range: { start: timeAt(27), end: timeAt(29) },
        levels: [
          broke.levels[0],
          { name: "FollowBar", price: 15.8, time: timeAt(29) },
          broke.levels[1],
        ],
      },
    ]);
  });

  it("marks two bear trend bars after a downside break", () => {
    const bars = shelf([
      bar(27, 0.2, 1, -2, -1),
      bar(28, -1, -0.4, -2.4, -2.2),
      bar(29, -2.2, -1.6, -3.4, -3.2),
    ]);
    const broke = classifyRangeBreak(bars).results[0]!;
    const result = classifyFollowThrough(bars);
    expect(result.evidence).toEqual({});
    expect(result.results).toEqual([
      {
        name: "follow_through",
        range: { start: timeAt(27), end: timeAt(29) },
        levels: [
          broke.levels[0],
          { name: "FollowBar", price: -3.2, time: timeAt(29) },
          broke.levels[1],
        ],
      },
    ]);
  });

  it("does not follow through a non-trend bar or a single trend bar", () => {
    const interrupted = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13, 14, 12.5, 13.1),
      bar(29, 13.2, 15, 13, 14.6),
      bar(30, 14.6, 16, 14.2, 15.8),
    ]);
    const oneBar = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13, 15, 12.8, 14.6),
      bar(29, 14, 14.4, 12, 12.2),
    ]);
    expect(classifyFollowThrough(interrupted).summary).toBe("followThroughs=0; last=unclear");
    expect(classifyFollowThrough(oneBar).results[0]?.name).toBe("unclear");
    expect(classifyFollowThrough(oneBar).evidence).toEqual({});
  });
});
