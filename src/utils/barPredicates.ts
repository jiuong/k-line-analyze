import type { Bar } from "../types/bars.js";
import { barRange, body, lowerTail, upperTail } from "./barMetrics.js";

/** |close − open| / (high − low). A zero-height bar is not a doji. */
export const DOJI_BODY_RATIO = 0.25;

/** Minimum body / range for a bull or bear trend bar. */
export const TREND_BAR_BODY_RATIO = 0.5;

/** Default shortest same-direction trend-bar run. */
export const CONSECUTIVE_TREND_BARS = 2;

/**
 * Bars required to call a move follow-through.
 * `classifyTradingRange` uses this as the default close count that ends a broad range.
 * `classifyFollowThrough` uses it as the minimum trend-bar prefix beyond the broken edge.
 */
export const FOLLOW_THROUGH_BARS = 2;

export type TrendBarDirection = "bull" | "bear";

export type TrendBarRun = {
  start: number;
  end: number;
  direction: TrendBarDirection;
};

export type BarPredicate = (
  bar: Bar,
  index: number,
  bars: readonly Bar[],
) => boolean;

function assertBodyRatio(bodyRatio: number): void {
  if (!Number.isFinite(bodyRatio) || bodyRatio <= 0 || bodyRatio > 1) {
    throw new TypeError("bodyRatio must be a finite number in (0, 1]");
  }
}

function assertBars(bars: readonly Bar[]): void {
  if (!Array.isArray(bars)) {
    throw new TypeError("bars must be an array");
  }
}

export function isDoji(bar: Bar, bodyRatio = DOJI_BODY_RATIO): boolean {
  assertBodyRatio(bodyRatio);
  const range = barRange(bar);
  if (range === 0) return false;
  return body(bar) / range <= bodyRatio;
}

export function isBullTrendBar(bar: Bar): boolean {
  const range = barRange(bar);
  if (range === 0) return false;
  return bar.close > bar.open && body(bar) / range >= TREND_BAR_BODY_RATIO;
}

export function isBearTrendBar(bar: Bar): boolean {
  const range = barRange(bar);
  if (range === 0) return false;
  return bar.close < bar.open && body(bar) / range >= TREND_BAR_BODY_RATIO;
}

export function isInsideBar(bar: Bar, previous: Bar | undefined): boolean {
  if (previous === undefined) return false;
  const contained = bar.high <= previous.high && bar.low >= previous.low;
  const tighter = bar.high < previous.high || bar.low > previous.low;
  return contained && tighter;
}

export function isOutsideBar(bar: Bar, previous: Bar | undefined): boolean {
  if (previous === undefined) return false;
  return bar.high > previous.high && bar.low < previous.low;
}

/** Both tails are zero. */
export function isShaved(bar: Bar): boolean {
  return upperTail(bar) === 0 && lowerTail(bar) === 0;
}

function directionOf(bar: Bar): TrendBarDirection | null {
  if (isBullTrendBar(bar)) return "bull";
  if (isBearTrendBar(bar)) return "bear";
  return null;
}

export function consecutiveTrendBars(
  bars: readonly Bar[],
  minBars = CONSECUTIVE_TREND_BARS,
): TrendBarRun[] {
  assertBars(bars);
  if (!Number.isInteger(minBars) || minBars < CONSECUTIVE_TREND_BARS) {
    throw new TypeError("minBars must be an integer >= 2");
  }
  const runs: TrendBarRun[] = [];
  let start = 0;
  while (start < bars.length) {
    const direction = directionOf(bars[start]!);
    if (direction === null) {
      start += 1;
      continue;
    }
    let end = start;
    while (end + 1 < bars.length && directionOf(bars[end + 1]!) === direction) {
      end += 1;
    }
    if (end - start + 1 >= minBars) {
      runs.push({ start, end, direction });
    }
    start = end + 1;
  }
  return runs;
}

export function matchingBars(
  bars: readonly Bar[],
  predicate: BarPredicate,
): number[] {
  assertBars(bars);
  const indexes: number[] = [];
  for (let index = 0; index < bars.length; index += 1) {
    if (predicate(bars[index]!, index, bars)) indexes.push(index);
  }
  return indexes;
}
