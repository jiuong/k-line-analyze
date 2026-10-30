import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { barRange, body } from "../../src/utils/barMetrics.js";
import {
  CONSECUTIVE_TREND_BARS,
  DOJI_BODY_RATIO,
  TREND_BAR_BODY_RATIO,
  consecutiveTrendBars,
  isBearTrendBar,
  isBullTrendBar,
  isDoji,
  isInsideBar,
  isOutsideBar,
  isShaved,
  matchingBars,
} from "../../src/utils/barPredicates.js";

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: 1_700_000_000 + index * 60, open, high, low, close };
}

describe("barPredicates", () => {
  it("marks a small body as a doji and a zero-height bar as not a doji", () => {
    const small = candle(0, 10, 14, 10, 10.5);
    expect(body(small) / barRange(small)).toBeLessThanOrEqual(DOJI_BODY_RATIO);
    expect(isDoji(small)).toBe(true);

    const exact = candle(1, 10, 14, 10, 11);
    expect(body(exact) / barRange(exact)).toBe(DOJI_BODY_RATIO);
    expect(isDoji(exact)).toBe(true);

    const larger = candle(2, 10, 14, 10, 11.2);
    expect(body(larger) / barRange(larger)).toBeGreaterThan(DOJI_BODY_RATIO);
    expect(isDoji(larger)).toBe(false);

    const flat = candle(3, 5, 5, 5, 5);
    expect(barRange(flat)).toBe(0);
    expect(isDoji(flat)).toBe(false);
  });

  it("rejects a body ratio outside (0, 1]", () => {
    const bar = candle(0, 10, 14, 10, 10.5);
    expect(() => isDoji(bar, 0)).toThrow(TypeError);
    expect(() => isDoji(bar, 1.1)).toThrow(TypeError);
    expect(() => isDoji(bar, Number.NaN)).toThrow(TypeError);
  });

  it("marks a majority body in the close direction as a trend bar", () => {
    const bull = candle(0, 10, 16, 10, 13);
    expect(body(bull) / barRange(bull)).toBe(TREND_BAR_BODY_RATIO);
    expect(isBullTrendBar(bull)).toBe(true);
    expect(isBearTrendBar(bull)).toBe(false);
    expect(isDoji(bull)).toBe(false);

    const bear = candle(1, 16, 16, 10, 13);
    expect(body(bear) / barRange(bear)).toBe(TREND_BAR_BODY_RATIO);
    expect(isBearTrendBar(bear)).toBe(true);
    expect(isBullTrendBar(bear)).toBe(false);

    const mid = candle(2, 10, 20, 10, 13);
    expect(body(mid) / barRange(mid)).toBeGreaterThan(DOJI_BODY_RATIO);
    expect(body(mid) / barRange(mid)).toBeLessThan(TREND_BAR_BODY_RATIO);
    expect(isDoji(mid)).toBe(false);
    expect(isBullTrendBar(mid)).toBe(false);
    expect(isBearTrendBar(mid)).toBe(false);
  });

  it("treats both zero tails as shaved", () => {
    const marubozu = candle(0, 10, 16, 10, 16);
    expect(isShaved(marubozu)).toBe(true);
    const wick = candle(1, 10, 16, 8, 14);
    expect(isShaved(wick)).toBe(false);
  });

  it("requires a stricter side for an inside bar and both sides beyond for an outside bar", () => {
    const previous = candle(0, 5, 10, 0, 5);
    const inside = candle(1, 4, 9, 1, 6);
    const equalHigh = candle(2, 4, 10, 1, 6);
    const identical = candle(3, 5, 10, 0, 5);
    const outside = candle(4, 4, 11, -1, 6);
    const equalLowOutsideHigh = candle(5, 4, 11, 0, 6);

    expect(isInsideBar(inside, previous)).toBe(true);
    expect(isOutsideBar(inside, previous)).toBe(false);
    expect(isInsideBar(equalHigh, previous)).toBe(true);
    expect(isOutsideBar(equalHigh, previous)).toBe(false);
    expect(isInsideBar(identical, previous)).toBe(false);
    expect(isOutsideBar(identical, previous)).toBe(false);
    expect(isInsideBar(outside, previous)).toBe(false);
    expect(isOutsideBar(outside, previous)).toBe(true);
    expect(isInsideBar(equalLowOutsideHigh, previous)).toBe(false);
    expect(isOutsideBar(equalLowOutsideHigh, previous)).toBe(false);
  });

  it("is false for the first bar, which has no previous bar", () => {
    const bar = candle(0, 4, 9, 1, 6);
    expect(isInsideBar(bar, undefined)).toBe(false);
    expect(isOutsideBar(bar, undefined)).toBe(false);
  });

  it("keeps same-direction runs and breaks them on a doji or the other direction", () => {
    const bars = [
      candle(0, 10, 16, 10, 16),
      candle(1, 16, 22, 16, 22),
      candle(2, 20, 24, 20, 20.5),
      candle(3, 20, 20, 14, 14),
      candle(4, 14, 14, 8, 8),
      candle(5, 8, 14, 8, 14),
    ];
    expect(consecutiveTrendBars(bars)).toEqual([
      { start: 0, end: 1, direction: "bull" },
      { start: 3, end: 4, direction: "bear" },
    ]);
    expect(consecutiveTrendBars(bars, 3)).toEqual([]);
    expect(consecutiveTrendBars([])).toEqual([]);
  });

  it("rejects a non-array series and a minBars below 2", () => {
    expect(() => consecutiveTrendBars(null as unknown as Bar[])).toThrow(TypeError);
    expect(() =>
      consecutiveTrendBars([candle(0, 10, 16, 10, 16)], 1),
    ).toThrow(TypeError);
    expect(CONSECUTIVE_TREND_BARS).toBe(2);
  });

  it("scans inside bars and skips index 0", () => {
    const bars = [
      candle(0, 5, 10, 0, 5),
      candle(1, 4, 9, 1, 6),
      candle(2, 4, 11, -1, 6),
    ];
    expect(
      matchingBars(bars, (bar, index, series) =>
        isInsideBar(bar, index === 0 ? undefined : series[index - 1]),
      ),
    ).toEqual([1]);
  });
});
