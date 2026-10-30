import type { Bar } from "../types/bars.js";

function assertBar(bar: Bar): void {
  if (
    !Number.isFinite(bar.open) ||
    !Number.isFinite(bar.high) ||
    !Number.isFinite(bar.low) ||
    !Number.isFinite(bar.close)
  ) {
    throw new TypeError("bar prices must be finite");
  }
  if (bar.high < bar.low) {
    throw new TypeError("bar high must be >= low");
  }
}

/** high − low */
export function barRange(bar: Bar): number {
  assertBar(bar);
  return bar.high - bar.low;
}

/** |close − open| */
export function body(bar: Bar): number {
  assertBar(bar);
  return Math.abs(bar.close - bar.open);
}

/** high − max(open, close) */
export function upperTail(bar: Bar): number {
  assertBar(bar);
  return bar.high - Math.max(bar.open, bar.close);
}

/** min(open, close) − low */
export function lowerTail(bar: Bar): number {
  assertBar(bar);
  return Math.min(bar.open, bar.close) - bar.low;
}

/**
 * (close − low) / range. The midpoint when the range is zero.
 */
export function closeLocation(bar: Bar): number {
  const range = barRange(bar);
  if (range === 0) return 0.5;
  return (bar.close - bar.low) / range;
}
