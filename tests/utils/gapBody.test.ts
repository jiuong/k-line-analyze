import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { withGapBody } from "../../src/utils/gapBody.js";

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: 1_700_000_000 + index * 60, open, high, low, close };
}

describe("withGapBody", () => {
  it("folds a gap up into the next bar from the previous high", () => {
    const prev = candle(0, 8, 10, 7, 9);
    const bar = candle(1, 13, 14, 12, 11);
    const adjusted = withGapBody(prev, bar);
    expect(adjusted).toEqual({ ...bar, open: 10, low: 10 });
    expect(bar.low).toBe(12);
    expect(bar.open).toBe(13);
  });

  it("folds a gap down into the next bar from the previous low", () => {
    const prev = candle(0, 12, 14, 11, 13);
    const bar = candle(1, 8, 9, 6, 7);
    expect(withGapBody(prev, bar)).toEqual({ ...bar, open: 11, high: 11 });
  });

  it("returns the same bar when wicks touch or overlap", () => {
    const prev = candle(0, 8, 10, 7, 9);
    const touch = candle(1, 10, 12, 10, 11);
    const overlap = candle(2, 9, 11, 8, 10);
    expect(withGapBody(prev, touch)).toBe(touch);
    expect(withGapBody(prev, overlap)).toBe(overlap);
  });

  it("returns the bar when there is no previous bar", () => {
    const bar = candle(0, 8, 10, 7, 9);
    expect(withGapBody(undefined, bar)).toBe(bar);
  });
});
