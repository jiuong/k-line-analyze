import { describe, expect, it } from "vitest";
import { measureBreakoutPullback } from "../../src/analyze/measureBreakoutPullback.js";
import type { Bar } from "../../src/types/bars.js";

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

function pullback(): Bar[] {
  return shelf([
    bar(27, 12.6, 14, 12.4, 13),
    bar(28, 13, 15, 12.8, 14.6),
    bar(29, 14.6, 16, 14.2, 15.8),
    bar(30, 15.1, 15.2, 14.5, 14.8),
    bar(31, 15, 16.4, 14.8, 16.2),
    bar(32, 14, 14.2, 12.3, 13.2),
    bar(33, 14.2, 18, 14, 17.5),
  ]);
}

describe("measureBreakoutPullback", () => {
  it("returns empty trades when there is no pullback resume", () => {
    const report = measureBreakoutPullback(shelf([bar(27, 12.6, 14, 12.4, 13)]), {
      swingSpan: 1,
    });
    expect(report.functionId).toBe("measureBreakoutPullback");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("marks a win when the measured target is hit first", () => {
    const bars = pullback();
    bars.push(bar(34, 20, 30, 19, 29));
    const report = measureBreakoutPullback(bars, { swingSpan: 1 });
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({
      basis: "breakout_pullback",
      direction: "up",
      signalPrice: 18,
      entry: 16.4,
      stop: 12.3,
      outcome: "win",
    });
    expect(report.trades[0]!.target).toBeCloseTo(28.4, 10);
    expect(report.stats.winRate).toBe(1);
  });

  it("marks a loss when the stop is hit after fill", () => {
    const bars = pullback();
    bars.push(bar(34, 17, 19, 16, 18));
    bars.push(bar(35, 16, 17, 11, 12));
    const report = measureBreakoutPullback(bars, { swingSpan: 1 });
    expect(report.trades[0]?.outcome).toBe("loss");
    expect(report.stats.winRate).toBe(0);
  });
});
