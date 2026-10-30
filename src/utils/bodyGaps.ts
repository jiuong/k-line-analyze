import type { Bar } from "../types/bars.js";
import { withGapBody } from "./gapBody.js";

export type BodyGapDirection = "up" | "down";

/** One adjacent body gap. `index` is the bar after the gap. */
export type BodyGap = {
  direction: BodyGapDirection;
  index: number;
  /** First later bar that reaches the near edge. Omitted while the gap stays open. */
  filledIndex?: number;
};

/**
 * Adjacent gaps from `withGapBody`, plus the later bar that fills each one.
 * A touch or an overlap is not a gap.
 */
export function findBodyGaps(bars: readonly Bar[]): BodyGap[] {
  if (!Array.isArray(bars)) {
    throw new TypeError("findBodyGaps: bars must be an array");
  }
  const gaps: BodyGap[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!;
    const bar = bars[i]!;
    const adjusted = withGapBody(prev, bar);
    const direction = directionOf(bar, adjusted);
    if (direction === null) continue;
    const filledIndex = firstFill(bars, i, direction, nearEdge(direction, adjusted));
    gaps.push(
      filledIndex === undefined
        ? { direction, index: i }
        : { direction, index: i, filledIndex },
    );
  }
  return gaps;
}

/** Gap up rewrites `low`. Gap down rewrites `high`. The same object means no gap. */
function directionOf(bar: Bar, adjusted: Bar): BodyGapDirection | null {
  if (adjusted === bar) return null;
  if (adjusted.low !== bar.low) return "up";
  if (adjusted.high !== bar.high) return "down";
  return null;
}

function nearEdge(direction: BodyGapDirection, adjusted: Bar): number {
  return direction === "up" ? adjusted.low : adjusted.high;
}

function firstFill(
  bars: readonly Bar[],
  index: number,
  direction: BodyGapDirection,
  near: number,
): number | undefined {
  for (let j = index + 1; j < bars.length; j++) {
    const bar = bars[j]!;
    const reached = direction === "up" ? bar.low <= near : bar.high >= near;
    if (reached) return j;
  }
  return undefined;
}
