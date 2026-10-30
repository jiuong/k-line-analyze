import { describe, expect, it } from "vitest";
import { measureSecondEntry } from "../../src/analyze/measureSecondEntry.js";
import { classifySecondEntry } from "../../src/analyze/classifySecondEntry.js";
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

/** Same ABC bull fixture as classifySecondEntry tests. */
function abcBull(): Bar[] {
  return [
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
}

describe("measureSecondEntry", () => {
  it("returns empty trades when there is no second entry", () => {
    const bars = [
      bar(0, 10, 12, 8, 11),
      bar(1, 10, 11.5, 8.5, 10),
      bar(2, 10, 11, 9, 10),
    ];
    const report = measureSecondEntry(bars);
    expect(report.functionId).toBe("measureSecondEntry");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("measures high2 with Fib P1 stop and TP1", () => {
    const bars = abcBull();
    const report = measureSecondEntry(bars);
    expect(report.trades).toHaveLength(1);
    const trade = report.trades[0]!;
    expect(trade).toMatchObject({
      basis: "high2",
      direction: "up",
      entry: 56,
      stop: 20,
      target: 102,
    });
    expect(trade.stop).toBeLessThan(trade.entry);
    expect(trade.targets?.map((level) => level.name)).toEqual([
      "TP1",
      "TP2",
      "TP3",
      "TP4",
    ]);
    expect(trade.range.start).toBe(trade.signalTime);
    expect(trade.range.end).toBeDefined();
    expect(trade.outcome).toBeDefined();
  });

  it("measures high1 when entryCount is 1", () => {
    const report = measureSecondEntry(abcBull(), { entryCount: 1 });
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({
      basis: "high1",
      direction: "up",
    });
    expect(report.trades[0]!.entry).not.toBe(56);
  });

  it("uses classify Stop (Fib P1) as measure stop", () => {
    const bars = abcBull();
    const classified = classifySecondEntry(bars);
    const levels = classified.results[0]!.levels;
    const classifyStop = levels.find((level) => level.name === "Stop");
    const p1 = levels.find((level) => level.name === "P1");
    const report = measureSecondEntry(bars);
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]!.stop).toBe(classifyStop!.price);
    expect(report.trades[0]!.stop).toBe(p1!.price);
    expect(report.trades[0]!.stop).toBe(20);
  });
});
