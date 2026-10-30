import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import {
  DEFAULT_FIB_EXTENSION_RATIOS,
  DEFAULT_FIB_RETRACEMENT_RATIOS,
  fibExtensionFromBars,
  fibRetracementFromBars,
  projectFibExtension,
  projectFibRetracement,
} from "../../src/utils/fibonacci.js";

function bar(index: number, high: number, low: number): Bar {
  return { time: 1_700_000_000 + index * 60, open: low, high, low, close: high };
}

describe("projectFibRetracement", () => {
  it("projects from later toward earlier with default ratios", () => {
    const levels = projectFibRetracement(10, 0);
    expect(levels.map((l) => l.ratio)).toEqual([...DEFAULT_FIB_RETRACEMENT_RATIOS]);
    expect(levels[0]).toEqual({ ratio: 0, pct: 0, price: 10 });
    expect(levels.at(-1)).toEqual({ ratio: 1, pct: 100, price: 0 });
    const r618 = levels.find((l) => l.ratio === 0.618)!;
    expect(r618.price).toBeCloseTo(10 + 0.618 * (0 - 10));
    expect(r618.pct).toBeCloseTo(61.8);
  });

  it("accepts custom ratios", () => {
    expect(projectFibRetracement(100, 0, [0.5])).toEqual([
      { ratio: 0.5, pct: 50, price: 50 },
    ]);
  });

  it("throws when later or earlier is not finite", () => {
    expect(() => projectFibRetracement(Number.NaN, 1)).toThrow(TypeError);
    expect(() => projectFibRetracement(1, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("throws when a ratio is not finite", () => {
    expect(() => projectFibRetracement(10, 0, [Number.NaN])).toThrow(TypeError);
  });

  it("throws when ratios is not an array", () => {
    expect(() =>
      projectFibRetracement(10, 0, null as unknown as number[]),
    ).toThrow(TypeError);
  });
});

describe("fibRetracementFromBars", () => {
  it("uses high_to_low when the low appears before the high", () => {
    const bars = [bar(0, 2, 1), bar(1, 10, 9), bar(2, 6, 5)];
    const result = fibRetracementFromBars(bars);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("high_to_low");
    expect(result!.low).toEqual({ price: 1, index: 0 });
    expect(result!.high).toEqual({ price: 10, index: 1 });
    expect(result!.range).toBe(9);
    expect(result!.levels[0]).toEqual({ ratio: 0, pct: 0, price: 10 });
    expect(result!.levels.at(-1)).toEqual({ ratio: 1, pct: 100, price: 1 });
    const r618 = result!.levels.find((l) => l.ratio === 0.618)!;
    expect(r618.price).toBeCloseTo(10 + 0.618 * (1 - 10));
  });

  it("uses low_to_high when the high appears before the low", () => {
    const bars = [bar(0, 10, 9), bar(1, 2, 1), bar(2, 5, 4)];
    const result = fibRetracementFromBars(bars);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("low_to_high");
    expect(result!.high).toEqual({ price: 10, index: 0 });
    expect(result!.low).toEqual({ price: 1, index: 1 });
    expect(result!.levels[0]).toEqual({ ratio: 0, pct: 0, price: 1 });
    expect(result!.levels.at(-1)).toEqual({ ratio: 1, pct: 100, price: 10 });
    const r618 = result!.levels.find((l) => l.ratio === 0.618)!;
    expect(r618.price).toBeCloseTo(1 + 0.618 * (10 - 1));
  });

  it("picks the earliest bar for a repeated extreme", () => {
    const bars = [bar(0, 5, 1), bar(1, 10, 2), bar(2, 10, 3)];
    const result = fibRetracementFromBars(bars);
    expect(result!.high).toEqual({ price: 10, index: 1 });
    expect(result!.low).toEqual({ price: 1, index: 0 });
    expect(result!.direction).toBe("high_to_low");
  });

  it("returns null when both extremes first appear on the same bar", () => {
    const bars = [bar(0, 5, 4), bar(1, 10, 1), bar(2, 6, 5)];
    expect(fibRetracementFromBars(bars)).toBeNull();
  });

  it("returns null when the range is zero", () => {
    const bars = [bar(0, 5, 5), bar(1, 5, 5)];
    expect(fibRetracementFromBars(bars)).toBeNull();
  });

  it("forwards custom ratios", () => {
    const bars = [bar(0, 2, 0), bar(1, 10, 9)];
    const result = fibRetracementFromBars(bars, { ratios: [0, 0.5, 1] });
    expect(result!.levels).toEqual([
      { ratio: 0, pct: 0, price: 10 },
      { ratio: 0.5, pct: 50, price: 5 },
      { ratio: 1, pct: 100, price: 0 },
    ]);
  });

  it("throws when bars is not an array or is empty", () => {
    expect(() => fibRetracementFromBars(null as unknown as Bar[])).toThrow(TypeError);
    expect(() => fibRetracementFromBars([])).toThrow(TypeError);
  });

  it("throws when options or ratios are invalid", () => {
    const bars = [bar(0, 2, 1), bar(1, 3, 0)];
    expect(() =>
      fibRetracementFromBars(bars, null as unknown as { ratios: number[] }),
    ).toThrow(TypeError);
    expect(() =>
      fibRetracementFromBars(bars, { ratios: null as unknown as number[] }),
    ).toThrow(TypeError);
  });

  it("throws when a bar high or low is invalid", () => {
    expect(() =>
      fibRetracementFromBars([
        { time: 1, open: 1, high: Number.NaN, low: 0, close: 1 },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      fibRetracementFromBars([{ time: 1, open: 1, high: 0, low: 1, close: 1 }]),
    ).toThrow(TypeError);
  });
});

describe("projectFibExtension", () => {
  it("projects from v3 along v2 − v1 with default ratios", () => {
    const levels = projectFibExtension(1, 10, 3);
    expect(levels.map((l) => l.ratio)).toEqual([...DEFAULT_FIB_EXTENSION_RATIOS]);
    expect(levels[0]).toEqual({ ratio: 0, pct: 0, price: 3 });
    const r1 = levels.find((l) => l.ratio === 1)!;
    expect(r1.price).toBe(3 + 1 * (10 - 1));
    const r1618 = levels.find((l) => l.ratio === 1.618)!;
    expect(r1618.price).toBeCloseTo(3 + 1.618 * 9);
    expect(r1618.pct).toBeCloseTo(161.8);
  });

  it("accepts custom ratios", () => {
    expect(projectFibExtension(0, 10, 2, [0.5, 2])).toEqual([
      { ratio: 0.5, pct: 50, price: 7 },
      { ratio: 2, pct: 200, price: 22 },
    ]);
  });

  it("throws when an anchor is not finite", () => {
    expect(() => projectFibExtension(Number.NaN, 1, 1)).toThrow(TypeError);
    expect(() => projectFibExtension(1, Number.POSITIVE_INFINITY, 1)).toThrow(TypeError);
    expect(() => projectFibExtension(1, 1, Number.NaN)).toThrow(TypeError);
  });

  it("throws when ratios are invalid", () => {
    expect(() => projectFibExtension(1, 2, 3, [Number.NaN])).toThrow(TypeError);
    expect(() =>
      projectFibExtension(1, 2, 3, null as unknown as number[]),
    ).toThrow(TypeError);
  });
});

describe("fibExtensionFromBars", () => {
  it("uses up direction when low then high then a pullback low", () => {
    // V1=low 1@0, V2=high 10@1, V3=low 3@2 (must stay above V1 so window low stays at V1)
    const bars = [bar(0, 2, 1), bar(1, 10, 9), bar(2, 5, 3), bar(3, 6, 4)];
    const result = fibExtensionFromBars(bars);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("up");
    expect(result!.v1).toEqual({ price: 1, index: 0 });
    expect(result!.v2).toEqual({ price: 10, index: 1 });
    expect(result!.v3).toEqual({ price: 3, index: 2 });
    expect(result!.range).toBe(9);
    expect(result!.levels[0]).toEqual({ ratio: 0, pct: 0, price: 3 });
    const r1 = result!.levels.find((l) => l.ratio === 1)!;
    expect(r1.price).toBe(12);
    const r1618 = result!.levels.find((l) => l.ratio === 1.618)!;
    expect(r1618.price).toBeCloseTo(3 + 1.618 * 9);
  });

  it("uses down direction when high then low then a bounce high", () => {
    const bars = [bar(0, 10, 9), bar(1, 2, 1), bar(2, 7, 4), bar(3, 6, 5)];
    const result = fibExtensionFromBars(bars);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("down");
    expect(result!.v1).toEqual({ price: 10, index: 0 });
    expect(result!.v2).toEqual({ price: 1, index: 1 });
    expect(result!.v3).toEqual({ price: 7, index: 2 });
    expect(result!.range).toBe(9);
    expect(result!.levels[0]).toEqual({ ratio: 0, pct: 0, price: 7 });
    const r1 = result!.levels.find((l) => l.ratio === 1)!;
    expect(r1.price).toBe(7 + 1 * (1 - 10));
    const r1618 = result!.levels.find((l) => l.ratio === 1.618)!;
    expect(r1618.price).toBeCloseTo(7 + 1.618 * (1 - 10));
  });

  it("returns null when there are no bars after V2", () => {
    const bars = [bar(0, 2, 1), bar(1, 10, 9)];
    expect(fibExtensionFromBars(bars)).toBeNull();
  });

  it("returns null when both extremes first appear on the same bar", () => {
    const bars = [bar(0, 5, 4), bar(1, 10, 1), bar(2, 6, 5)];
    expect(fibExtensionFromBars(bars)).toBeNull();
  });

  it("returns null when the range is zero", () => {
    expect(fibExtensionFromBars([bar(0, 5, 5), bar(1, 5, 5), bar(2, 5, 5)])).toBeNull();
  });

  it("forwards custom ratios", () => {
    const bars = [bar(0, 2, 0), bar(1, 10, 9), bar(2, 4, 2)];
    const result = fibExtensionFromBars(bars, { ratios: [0, 1] });
    expect(result!.levels).toEqual([
      { ratio: 0, pct: 0, price: 2 },
      { ratio: 1, pct: 100, price: 12 },
    ]);
  });

  it("throws when bars is not an array or is empty", () => {
    expect(() => fibExtensionFromBars(null as unknown as Bar[])).toThrow(TypeError);
    expect(() => fibExtensionFromBars([])).toThrow(TypeError);
  });

  it("throws when options or ratios are invalid", () => {
    const bars = [bar(0, 2, 1), bar(1, 10, 9), bar(2, 5, 3)];
    expect(() =>
      fibExtensionFromBars(bars, null as unknown as { ratios: number[] }),
    ).toThrow(TypeError);
    expect(() =>
      fibExtensionFromBars(bars, { ratios: null as unknown as number[] }),
    ).toThrow(TypeError);
  });

  it("throws when a bar high or low is invalid", () => {
    expect(() =>
      fibExtensionFromBars([
        { time: 1, open: 1, high: Number.NaN, low: 0, close: 1 },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      fibExtensionFromBars([{ time: 1, open: 1, high: 0, low: 1, close: 1 }]),
    ).toThrow(TypeError);
  });
});
