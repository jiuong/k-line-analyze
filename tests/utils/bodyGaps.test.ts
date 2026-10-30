import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { findBodyGaps } from "../../src/utils/bodyGaps.js";

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: 1_700_000_000 + index * 60, open, high, low, close };
}

describe("findBodyGaps", () => {
  it("lists an unfilled gap up", () => {
    const bars = [
      candle(0, 8, 10, 7, 9),
      candle(1, 13, 14, 12, 13),
      candle(2, 13, 15, 11, 14),
    ];
    expect(findBodyGaps(bars)).toEqual([{ direction: "up", index: 1 }]);
  });

  it("lists an unfilled gap down", () => {
    const bars = [
      candle(0, 12, 14, 11, 13),
      candle(1, 8, 9, 6, 7),
      candle(2, 7, 10, 6, 8),
    ];
    expect(findBodyGaps(bars)).toEqual([{ direction: "down", index: 1 }]);
  });

  it("records the later bar that fills a gap", () => {
    const up = [
      candle(0, 8, 10, 7, 9),
      candle(1, 13, 14, 12, 13),
      candle(2, 13, 14, 11, 12),
      candle(3, 11, 12, 9, 10),
    ];
    expect(findBodyGaps(up)).toEqual([
      { direction: "up", index: 1, filledIndex: 3 },
    ]);

    const down = [
      candle(0, 12, 14, 11, 13),
      candle(1, 8, 9, 6, 7),
      candle(2, 8, 12, 7, 11),
    ];
    expect(findBodyGaps(down)).toEqual([
      { direction: "down", index: 1, filledIndex: 2 },
    ]);
  });

  it("does not treat touching wicks as a gap", () => {
    const bars = [
      candle(0, 8, 10, 7, 9),
      candle(1, 10, 12, 10, 11),
      candle(2, 11, 13, 9, 12),
    ];
    expect(findBodyGaps(bars)).toEqual([]);
    expect(findBodyGaps([candle(0, 1, 2, 0, 1)])).toEqual([]);
  });

  it("throws when bars is not an array", () => {
    expect(() => findBodyGaps(null as unknown as Bar[])).toThrow(TypeError);
  });
});
