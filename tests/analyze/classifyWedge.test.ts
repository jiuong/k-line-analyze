import { describe, expect, it } from "vitest";
import { classifyWedge } from "../../src/analyze/classifyWedge.js";
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

/** Three rising highs, pullback highs equal to the prior peak, span 1. */
function risingWedge(): Bar[] {
  return [
    bar(0, 9, 9),
    bar(1, 8, 8),
    bar(2, 8, 8),
    bar(3, 10, 8),
    bar(4, 10, 6),
    bar(5, 10, 6),
    bar(6, 14, 6),
    bar(7, 14, 4),
    bar(8, 14, 4),
    bar(9, 16, 4),
    bar(10, 15, 5),
  ];
}

/** Reflect the swing-trend nest fixture so the parent segment is a bear trend. */
function bearFlag(): Bar[] {
  const seed: Array<[number, number, number, number]> = [
    [8, 12, 8, 9],
    [9, 10, 6, 8],
    [8, 11, 7, 10],
    [10, 9, 5, 6],
    [8, 13, 6, 12],
  ];
  const bars = seed.map(([open, high, low, close], index) => ({
    time: T0 + index * 60,
    open: 20 - open,
    high: 20 - low,
    low: 20 - high,
    close: 20 - close,
  }));
  const tail = [
    [13, 10],
    [40, 12],
    [14, 8],
    [13, 9],
    [60, 12],
    [15, 7],
  ];
  for (const [high, low] of tail) {
    bars.push(bar(bars.length, high!, low!));
  }
  return bars;
}

describe("classifyWedge", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyWedge([])).toThrow(TypeError);
    expect(() => classifyWedge(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 2, 1)];
    expect(() => classifyWedge(bars, { priceTolerance: -1 })).toThrow(/classifyWedge: priceTolerance/);
    expect(() => classifyWedge(bars, { swingSpan: 1.5 })).toThrow(/classifyWedge: swingSpan/);
  });

  it("marks three rising pushes with a smaller second gap as a wedge top", () => {
    const bars = risingWedge();
    const result = classifyWedge(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.functionId).toBe("classifyWedge");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("wedges=1; last=wedge_top");
    expect(result.evidence.items).toEqual([{ role: "reversal" }]);
    const item = result.results[0]!;
    expect(item.name).toBe("wedge_top");
    expect(item.levels.map((level) => level.name)).toEqual(["Push1", "Push2", "Push3"]);
    expect(item.levels.map((level) => level.price)).toEqual([10, 14, 16]);
    expect(item.range).toEqual({
      start: toTimeString(bars[1]!.time),
      end: toTimeString(bars[9]!.time),
    });
  });

  it("returns unclear when only two pushes are present", () => {
    const bars = risingWedge().slice(0, 9);
    const result = classifyWedge(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.summary).toBe("wedges=0; last=unclear");
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.evidence.items).toEqual([]);
  });

  it("omits Entry until a later close breaks the third leg start", () => {
    const held = risingWedge();
    expect(classifyWedge(held, { swingSpan: 1, priceTolerance: 0 }).results[0]!.levels).toHaveLength(3);

    const broken = risingWedge();
    broken.push(bar(broken.length, 6, 2, 3));
    const levels = classifyWedge(broken, { swingSpan: 1, priceTolerance: 0 }).results[0]!.levels;
    expect(levels.map((level) => level.name)).toEqual([
      "Push1",
      "Push2",
      "Push3",
      "Entry",
      "Stop",
      "Target",
    ]);
    expect(levels[3]!.price).toBe(4);
    expect(levels[4]!.price).toBe(16);
    expect(levels[5]!.price).toBe(-2);
  });

  it("marks a wedge inside one bear trend as a flag", () => {
    const bars = bearFlag();
    const result = classifyWedge(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.summary).toBe("wedges=1; last=wedge_top");
    expect(result.results[0]!.levels.map((level) => level.price)).toEqual([15, 40, 60]);
    expect(result.evidence.items).toEqual([{ role: "flag" }]);
  });
});
