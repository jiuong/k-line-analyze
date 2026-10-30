import type { Bar } from "../types/bars.js";

const MAX_REVERSE_BARS = 3;

export type Direction = "bull" | "bear";

export type SingleLegOptions = {
  /** Skip a pair whose open-time gap is larger than `timeStep`. Default off. */
  ignoreTimeHoles?: boolean;
  /** Smallest positive open-time delta of the caller window. */
  timeStep?: number | null;
};

/** Smallest positive open-time delta, or null when every delta is missing or not positive. */
export function barStep(bars: readonly Bar[]): number | null {
  let step: number | null = null;
  for (let index = 1; index < bars.length; index += 1) {
    const delta = bars[index]!.time - bars[index - 1]!.time;
    if (delta > 0 && (step === null || delta < step)) step = delta;
  }
  return step;
}

export function isTimeHole(previous: Bar, bar: Bar, step: number | null): boolean {
  if (step === null) return false;
  return bar.time - previous.time > step;
}

/**
 * Direction of one leg, or null when the slice is not a single leg.
 * Inside bars are skipped. A pullback of at most three bars whose adverse
 * break is at most half the average bar height, followed by a bar in the
 * original direction, stays on that same leg.
 * With `ignoreTimeHoles`, a time hole is not a step. Direction resumes on the later bar.
 */
export function singleLegDirection(
  bars: readonly Bar[],
  options: SingleLegOptions = {},
): Direction | null {
  if (bars.length < 2) return null;
  const limit = averageHeight(bars) / 2;
  const step = options.ignoreTimeHoles
    ? options.timeStep === undefined
      ? barStep(bars)
      : options.timeStep
    : null;
  const hole = (index: number) =>
    options.ignoreTimeHoles === true &&
    isTimeHole(bars[index - 1]!, bars[index]!, step);
  let ref = 0;
  let direction: Direction | null = null;
  let index = 1;

  while (index < bars.length) {
    if (hole(index)) {
      ref = index;
      index += 1;
      continue;
    }
    const relation = relate(bars[ref]!, bars[index]!);
    if (relation === "inside") {
      index += 1;
      continue;
    }
    if (relation !== "bull" && relation !== "bear") return null;
    if (direction === null || relation === direction) {
      direction = relation;
      ref = index;
      index += 1;
      continue;
    }

    const anchor = ref;
    const opposite = relation;
    let reverseCount = 0;
    let adverse = 0;
    let crossedHole = false;
    while (index < bars.length && reverseCount < MAX_REVERSE_BARS) {
      if (hole(index)) {
        ref = index;
        index += 1;
        crossedHole = true;
        break;
      }
      const current = relate(bars[ref]!, bars[index]!);
      if (current === "inside") {
        index += 1;
        continue;
      }
      if (current !== opposite) break;
      reverseCount += 1;
      adverse = Math.max(adverse, adverseBreak(bars[anchor]!, bars[index]!, direction));
      ref = index;
      index += 1;
    }
    if (crossedHole) continue;
    if (reverseCount === 0 || adverse > limit) return null;

    while (index < bars.length && !hole(index) && relate(bars[ref]!, bars[index]!) === "inside") {
      index += 1;
    }
    if (index >= bars.length) return null;
    if (hole(index)) {
      ref = index;
      index += 1;
      continue;
    }
    if (relate(bars[ref]!, bars[index]!) !== direction) return null;
    ref = index;
    index += 1;
  }

  return direction;
}

/** One directional leg. See `singleLegDirection`. */
export function isSingleLegTrend(
  bars: readonly Bar[],
  options?: SingleLegOptions,
): boolean {
  return singleLegDirection(bars, options) !== null;
}

export type SingleLegRun = {
  direction: Direction;
  /** Inclusive start index into `bars` (absolute when `offset` is applied). */
  startIndex: number;
  /** Inclusive end index into `bars`. */
  endIndex: number;
};

/**
 * Left-to-right maximal `singleLegDirection` runs on `bars`.
 * Same walk as trading-range opposite-leg structure.
 * Indexes are relative to `bars` unless `offset` is set.
 */
export function walkSingleLegs(
  bars: readonly Bar[],
  offset = 0,
): SingleLegRun[] {
  const runs: SingleLegRun[] = [];
  let index = 0;
  while (index < bars.length) {
    let direction: Direction | null = null;
    let end = index;
    for (let next = index + 1; next < bars.length; next += 1) {
      const found = singleLegDirection(bars.slice(index, next + 1));
      if (!found) break;
      direction = found;
      end = next;
    }
    if (direction) {
      runs.push({
        direction,
        startIndex: offset + index,
        endIndex: offset + end,
      });
      index = end + 1;
    } else {
      index += 1;
    }
  }
  return runs;
}

function relate(ref: Bar, bar: Bar): Direction | "inside" | "other" {
  if (bar.high <= ref.high && bar.low >= ref.low) return "inside";
  if (bar.high > ref.high && bar.low > ref.low) return "bull";
  if (bar.high < ref.high && bar.low < ref.low) return "bear";
  return "other";
}

function adverseBreak(anchor: Bar, bar: Bar, direction: Direction): number {
  if (direction === "bull") return Math.max(0, anchor.low - bar.low);
  return Math.max(0, bar.high - anchor.high);
}

function averageHeight(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += bar.high - bar.low;
  return sum / bars.length;
}
