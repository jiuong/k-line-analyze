import { describe, expect, it } from "vitest";
import { measureFailedBreakout } from "../../src/analyze/measureFailedBreakout.js";
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

function failedBreak(): Bar[] {
  return shelf([
    bar(27, 12.6, 14, 12.4, 13),
    bar(28, 13.2, 15, 13, 14),
    bar(29, 12, 12.5, 8, 10),
  ]);
}

describe("measureFailedBreakout", () => {
  it("returns empty trades when nothing fails", () => {
    const report = measureFailedBreakout([bar(0, 1, 2, 0.5, 1.8)]);
    expect(report.functionId).toBe("measureFailedBreakout");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("marks a win when the opposite edge is hit first", () => {
    // tickSize lifts the stop so a deep target bar can keep the range intact.
    const bars = failedBreak();
    bars.push(bar(30, 10, 15.5, -1, 0));
    const report = measureFailedBreakout(bars, { tickSize: 2 });
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({
      basis: "failed_breakout",
      direction: "down",
      signalPrice: 8,
      entry: 10,
      stop: 16,
      target: 0,
      outcome: "win",
    });
    expect(report.stats.winRate).toBe(1);
  });

  it("marks a loss when the fill bar also hits the stop", () => {
    const bars = failedBreak();
    bars.push(bar(30, 10, 17, 5, 16));
    const report = measureFailedBreakout(bars, { tickSize: 2 });
    expect(report.trades[0]?.outcome).toBe("loss");
    expect(report.stats.winRate).toBe(0);
  });
});
