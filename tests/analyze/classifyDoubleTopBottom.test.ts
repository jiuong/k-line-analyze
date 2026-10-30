import { describe, expect, it } from "vitest";
import { classifyDoubleTopBottom } from "../../src/analyze/classifyDoubleTopBottom.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  high: number,
  low: number,
  close = (high + low) / 2,
): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

/** Alternating peaks and valleys. Span 1 keeps each interior pivot. */
function zigzag(peaks: number[], valleys: number[]): Bar[] {
  const bars: Bar[] = [bar(0, 10, 8)];
  for (let index = 0; index < peaks.length; index += 1) {
    const peak = peaks[index]!;
    const valley = valleys[index]!;
    bars.push(bar(bars.length, peak, peak - 2));
    bars.push(bar(bars.length, valley + 2, valley));
  }
  return bars;
}

describe("classifyDoubleTopBottom", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyDoubleTopBottom([])).toThrow(TypeError);
    expect(() => classifyDoubleTopBottom(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 2, 1)];
    expect(() => classifyDoubleTopBottom(bars, { priceTolerance: -1 })).toThrow(
      /classifyDoubleTopBottom: priceTolerance/,
    );
    expect(() => classifyDoubleTopBottom(bars, { swingSpan: 0 })).toThrow(
      /classifyDoubleTopBottom: swingSpan/,
    );
  });

  it("marks two swing highs and emits Neckline before a break", () => {
    const bars = zigzag([20, 20], [5, 8]);
    const result = classifyDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.functionId).toBe("classifyDoubleTopBottom");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("doubles=1; last=double_top");
    expect(result.results.map((item) => item.name)).toEqual(["double_top"]);
    const levels = result.results[0]!.levels;
    expect(levels.map((level) => level.name)).toEqual(["Top1", "Top2", "Neckline"]);
    expect(levels[0]!.price).toBe(20);
    expect(levels[1]!.price).toBe(20);
    expect(levels[0]!.time < levels[1]!.time).toBe(true);
    expect(levels[2]!.price).toBe(5);
    expect(levels[2]!.time).toBe(toTimeString(bars[2]!.time));
    expect(levels.some((level) => level.name === "Target")).toBe(false);
    expect(result.results.some((item) => item.name === "micro_double_top")).toBe(false);
  });

  it("keeps only the earliest pair when three highs share one band", () => {
    const bars = zigzag([20, 20, 20], [5, 9, 8]);
    const result = classifyDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.levels.map((level) => level.name)).toEqual([
      "Top1",
      "Top2",
      "Neckline",
    ]);
    expect(result.results[0]!.range).toEqual({
      start: toTimeString(bars[1]!.time),
      end: toTimeString(bars[3]!.time),
    });
  });

  it("starts the next pair after the previous second high", () => {
    const bars = zigzag([20, 20, 20, 20], [5, 9, 6, 8]);
    const result = classifyDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.range.end).toBe(toTimeString(bars[3]!.time));
    expect(result.results[1]!.range.start).toBe(toTimeString(bars[5]!.time));
  });

  it("does not call a higher low a double bottom", () => {
    const bars = zigzag([20, 12], [5, 9]);
    const result = classifyDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
  });

  it("emits Neckline with Entry and Stop after a neckline break", () => {
    const held = zigzag([20, 20], [5, 8]);
    expect(
      classifyDoubleTopBottom(held, { swingSpan: 1, priceTolerance: 0 }).results[0]!.levels.map(
        (level) => level.name,
      ),
    ).toEqual(["Top1", "Top2", "Neckline"]);

    const broken = zigzag([20, 20], [5, 8]);
    broken.push(bar(broken.length, 6, 3, 4));
    const levels = classifyDoubleTopBottom(broken, {
      swingSpan: 1,
      priceTolerance: 0,
    }).results[0]!.levels;
    expect(levels.map((level) => level.name)).toEqual([
      "Top1",
      "Top2",
      "Neckline",
      "Entry",
      "Stop",
    ]);
    expect(levels[2]!.price).toBe(5);
    expect(levels[2]!.time).toBe(toTimeString(broken[2]!.time));
    expect(levels[3]!.price).toBe(5);
    expect(levels[4]!.price).toBe(20);
    expect(levels.some((level) => level.name === "Target")).toBe(false);
  });

  it("marks a double bottom with Neckline before and after a break", () => {
    const held = zigzag([20, 15], [5, 5]);
    held.push(bar(held.length, 12, 8));
    const heldLevels = classifyDoubleTopBottom(held, {
      swingSpan: 1,
      priceTolerance: 0,
    }).results.find((item) => item.name === "double_bottom")!.levels;
    expect(heldLevels.map((level) => level.name)).toEqual(["Bottom1", "Bottom2", "Neckline"]);
    expect(heldLevels[2]!.price).toBe(15);
    expect(heldLevels[2]!.time).toBe(toTimeString(held[3]!.time));
    expect(heldLevels.some((level) => level.name === "Target")).toBe(false);

    const broken = zigzag([20, 15], [5, 5]);
    broken.push(bar(broken.length, 12, 8));
    broken.push(bar(broken.length, 22, 18, 21));
    const brokenLevels = classifyDoubleTopBottom(broken, {
      swingSpan: 1,
      priceTolerance: 0,
    }).results.find((item) => item.name === "double_bottom")!.levels;
    expect(brokenLevels.map((level) => level.name)).toEqual([
      "Bottom1",
      "Bottom2",
      "Neckline",
      "Entry",
      "Stop",
    ]);
    expect(brokenLevels[2]!.price).toBe(15);
    expect(brokenLevels[2]!.time).toBe(toTimeString(broken[3]!.time));
    expect(brokenLevels.some((level) => level.name === "Target")).toBe(false);
  });
});
