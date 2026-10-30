import { describe, expect, it } from "vitest";
import { classifySecondEntry } from "../../src/analyze/classifySecondEntry.js";
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

/** Bull impulse, ABC pullback (W1 bear / W2 bull / W3 bear), then HH resume. */
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

/** Price-inverted `abcBull` → bear ABC with low2. */
function abcBear(): Bar[] {
  return abcBull().map((b, index) =>
    bar(index, 100 - b.close, 100 - b.low, 100 - b.high, 100 - b.open),
  );
}

describe("classifySecondEntry", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifySecondEntry([])).toThrow(TypeError);
    expect(() => classifySecondEntry(null as unknown as Bar[])).toThrow(TypeError);
    const bars = abcBull();
    expect(() => classifySecondEntry(bars, null as unknown as object)).toThrow(TypeError);
    expect(() => classifySecondEntry(bars, { tickSize: 0 })).toThrow(TypeError);
    expect(() => classifySecondEntry(bars, { swingSpan: 0 })).toThrow(TypeError);
    expect(() => classifySecondEntry(bars, { majorSwingSpan: 0 })).toThrow(TypeError);
    expect(() => classifySecondEntry(bars, { entrySwingSpan: 0 })).toThrow(TypeError);
    expect(() => classifySecondEntry(bars, { entryCount: 0 })).toThrow(/entryCount/);
    expect(() => classifySecondEntry(bars, { entryCount: 1.5 })).toThrow(/entryCount/);
  });

  it("returns unclear when there is no second with-trend hinge", () => {
    const bars = [
      bar(0, 10, 12, 8, 11),
      bar(1, 10, 11.5, 8.5, 10),
      bar(2, 10, 11, 9, 10),
    ];
    const result = classifySecondEntry(bars);
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [],
      },
    ]);
    expect(result.summary).toBe("entries=0; last=unclear");
  });

  it("emits high2 on the second hinge of a bull ABC pullback (defaults major=2 entry=1)", () => {
    const result = classifySecondEntry(abcBull());
    expect(result.results.map((item) => item.name)).toEqual(["high2"]);
    expect(result.summary).toBe("entries=1; last=high2");
    const item = result.results[0]!;
    const byName = Object.fromEntries(item.levels.map((level) => [level.name, level]));
    expect(byName.Entry?.price).toBe(56);
    expect(byName.P1?.price).toBe(20);
    expect(byName.P2?.price).toBe(70);
    expect(byName.P3?.price).toBe(52);
    expect(byName.TP1?.price).toBe(102);
    expect(byName.TP2?.price).toBeCloseTo(52 + 1.272 * 50);
    expect(byName.TP3?.price).toBeCloseTo(52 + 1.414 * 50);
    expect(byName.TP4?.price).toBeCloseTo(52 + 1.618 * 50);
    expect(byName.Stop?.price).toBe(20);
    expect(byName.SignalBar?.price).toBe(72);
  });

  it("applies tickSize to entry and stop on high2", () => {
    const result = classifySecondEntry(abcBull(), { tickSize: 0.5 });
    const item = result.results[0]!;
    const entry = item.levels.find((level) => level.name === "Entry");
    const stop = item.levels.find((level) => level.name === "Stop");
    expect(entry?.price).toBe(56.5);
    expect(stop?.price).toBe(19.5);
  });

  it("emits low2 on the second hinge of a bear ABC pullback", () => {
    const result = classifySecondEntry(abcBear());
    expect(result.results.some((item) => item.name === "low2")).toBe(true);
  });

  it("emits the earlier high1 when entryCount is 1", () => {
    const bars = abcBull();
    const first = classifySecondEntry(bars, { entryCount: 1 });
    const second = classifySecondEntry(bars);
    expect(first.results.map((item) => item.name)).toEqual(["high1"]);
    expect(first.summary).toBe("entries=1; last=high1");
    expect(first.results[0]!.range.end! < second.results[0]!.range.end!).toBe(true);
  });

  it("returns unclear when the window has fewer hinges than entryCount", () => {
    const result = classifySecondEntry(abcBull(), { entryCount: 3 });
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
    expect(result.summary).toBe("entries=0; last=unclear");
  });

  it("emits low1 when entryCount is 1 on a bear ABC pullback", () => {
    const result = classifySecondEntry(abcBear(), { entryCount: 1 });
    expect(result.results.map((item) => item.name)).toEqual(["low1"]);
  });
});
