import { describe, expect, it } from "vitest";
import { classifyFailedBreakout } from "../../src/analyze/classifyFailedBreakout.js";
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

describe("classifyFailedBreakout", () => {
  it("throws when bars or tickSize is invalid", () => {
    expect(() => classifyFailedBreakout([])).toThrow(TypeError);
    expect(() => classifyFailedBreakout(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 1, 2, 0, 1)];
    expect(() => classifyFailedBreakout(bars, { tickSize: 0 })).toThrow(
      /classifyFailedBreakout: tickSize/,
    );
    expect(() => classifyFailedBreakout(bars, null as unknown as { tickSize?: number })).toThrow(
      /classifyFailedBreakout: options/,
    );
  });

  it("marks an upside break that closes back inside without follow-through", () => {
    const bars = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13.2, 15, 13, 14),
      bar(29, 12, 12.5, 8, 10),
    ]);
    const result = classifyFailedBreakout(bars);
    expect(result.functionId).toBe("classifyFailedBreakout");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({ directions: ["down"] });
    expect(result.summary).toBe("failedBreakouts=1; last=failed_breakout");
    const item = result.results[0]!;
    expect(item.name).toBe("failed_breakout");
    expect(item.range).toEqual({ start: timeAt(27), end: timeAt(29) });
    expect(item.levels.map((level) => level.name)).toEqual([
      "BreakBar",
      "BrokenEdge",
      "ReturnBar",
      "SignalBar",
      "Entry",
      "Stop",
      "Target",
    ]);
    expect(item.levels[0]).toEqual({ name: "BreakBar", price: 13, time: timeAt(27) });
    expect(item.levels[1]).toEqual({ name: "BrokenEdge", price: 12, time: timeAt(12) });
    expect(item.levels[2]).toEqual({ name: "ReturnBar", price: 10, time: timeAt(29) });
    expect(item.levels[3]).toEqual({ name: "SignalBar", price: 8, time: timeAt(29) });
    expect(item.levels[4]).toEqual({ name: "Entry", price: 12, time: timeAt(29) });
    expect(item.levels[5]).toEqual({ name: "Stop", price: 14, time: timeAt(27) });
    expect(item.levels[6]?.name).toBe("Target");
    expect(item.levels[6]?.price).toBeLessThan(12);
  });

  it("places the stop beyond the break extreme when tickSize is set", () => {
    const bars = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13.2, 15, 13, 14),
      bar(29, 12, 12.5, 8, 10),
    ]);
    const item = classifyFailedBreakout(bars, { tickSize: 0.25 }).results[0]!;
    expect(item.levels[4]).toEqual({ name: "Entry", price: 11.75, time: timeAt(29) });
    expect(item.levels[5]).toEqual({ name: "Stop", price: 14.25, time: timeAt(27) });
  });

  it("marks a downside break that closes back inside", () => {
    const bars = shelf([
      bar(27, 0.2, 1, -2, -1),
      bar(28, -1, 0, -3, -2),
      bar(29, -1, 2, -1.5, 1),
    ]);
    const item = classifyFailedBreakout(bars).results[0]!;
    expect(item.range).toEqual({ start: timeAt(27), end: timeAt(29) });
    expect(item.levels[1]).toEqual({ name: "BrokenEdge", price: 0, time: timeAt(6) });
    expect(item.levels[2]).toEqual({ name: "ReturnBar", price: 1, time: timeAt(29) });
    expect(item.levels[3]).toEqual({ name: "SignalBar", price: 2, time: timeAt(29) });
    expect(item.levels[4]).toEqual({ name: "Entry", price: 0, time: timeAt(29) });
    expect(item.levels[5]).toEqual({ name: "Stop", price: -2, time: timeAt(27) });
    expect(item.levels[6]?.price).toBeGreaterThan(0);
  });

  it("does not fail a break that already has follow-through", () => {
    const bars = shelf([
      bar(27, 12.6, 14, 12.4, 13),
      bar(28, 13, 15, 12.8, 14.6),
      bar(29, 14.6, 16, 14.2, 15.8),
      bar(30, 12, 12.5, 8, 10),
    ]);
    const result = classifyFailedBreakout(bars);
    expect(result.summary).toBe("failedBreakouts=0; last=unclear");
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.evidence).toEqual({ directions: [] });
  });

  it("returns unclear when nothing fails", () => {
    const result = classifyFailedBreakout([bar(0, 1, 2, 0.5, 1.8)]);
    expect(result.summary).toBe("failedBreakouts=0; last=unclear");
    expect(result.results[0]?.levels).toEqual([]);
  });
});
