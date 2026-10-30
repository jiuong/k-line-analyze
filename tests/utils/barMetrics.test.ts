import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import {
  barRange,
  body,
  closeLocation,
  lowerTail,
  upperTail,
} from "../../src/utils/barMetrics.js";

function candle(
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: 1_700_000_000, open, high, low, close };
}

describe("barMetrics", () => {
  it("measures body and both tails of a bull bar", () => {
    const bar = candle(10, 16, 8, 14);
    expect(barRange(bar)).toBe(8);
    expect(body(bar)).toBe(4);
    expect(upperTail(bar)).toBe(2);
    expect(lowerTail(bar)).toBe(2);
  });

  it("measures a bear bar from the close down to the low", () => {
    const bar = candle(14, 16, 8, 10);
    expect(body(bar)).toBe(4);
    expect(upperTail(bar)).toBe(2);
    expect(lowerTail(bar)).toBe(2);
  });

  it("places the close at the high, the low, and the middle", () => {
    expect(closeLocation(candle(10, 20, 10, 20))).toBe(1);
    expect(closeLocation(candle(20, 20, 10, 10))).toBe(0);
    expect(closeLocation(candle(12, 20, 10, 15))).toBe(0.5);
  });

  it("returns a midpoint and zero body and tails for a zero-height bar", () => {
    const bar = candle(5, 5, 5, 5);
    expect(barRange(bar)).toBe(0);
    expect(body(bar)).toBe(0);
    expect(upperTail(bar)).toBe(0);
    expect(lowerTail(bar)).toBe(0);
    expect(closeLocation(bar)).toBe(0.5);
  });

  it("rejects a non-finite price and a high below the low", () => {
    expect(() => barRange(candle(Number.NaN, 1, 0, 1))).toThrow(TypeError);
    expect(() => body(candle(1, 0, 1, 0))).toThrow(TypeError);
  });
});
