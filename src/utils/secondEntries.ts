import type { Bar } from "../types/bars.js";
import type { AnalyzeResult } from "../types/analysis.js";
import { stopBeyond } from "./setupPrices.js";
import { findSwingLegs, type SwingLeg } from "./swingLegs.js";
import { barIndexAt } from "./time.js";

/** One pullback-scoped second entry (H2 / L2 only). */
export type SecondEntryHit = {
  bull: boolean;
  priorIndex: number;
  breakIndex: number;
  entryPrice: number;
  p1Index: number;
  p1Price: number;
  p2Index: number;
  p2Price: number;
  p3Price: number;
};

export type SecondEntryFromPartsOptions = {
  tickSize?: number;
  /**
   * Swing span for pullback-window / H1–H2 hinge legs.
   * Default `1`. Majors are supplied by the caller (often coarser).
   */
  entrySwingSpan?: number;
  /**
   * @deprecated Prefer `entrySwingSpan`. Used for legs when `entrySwingSpan`
   * is omitted (tests / older callers).
   */
  swingSpan?: number;
  functionId?: string;
};

/**
 * H2/L2 from major trends + swing legs.
 * Each with-trend impulse opens a pullback window until the next with-trend
 * leg that makes a strict new extreme; adverse→with-trend hinges inside
 * that window are H1, H2, … — only the 2nd is returned.
 *
 * Legs use `entrySwingSpan` (default 1); `majors` come from the caller
 * (typically `classifySwingTrend` at span 2).
 */
export function findSecondEntriesFrom(
  bars: readonly Bar[],
  majors: readonly AnalyzeResult[],
  _pullbacks: readonly AnalyzeResult[] | undefined,
  options?: SecondEntryFromPartsOptions,
): SecondEntryHit[] {
  if (!Array.isArray(bars)) {
    throw new TypeError("findSecondEntriesFrom: bars must be an array");
  }
  const id = options?.functionId ?? "findSecondEntriesFrom";
  const entrySpan = resolveEntrySwingSpan(options);
  const tick = resolveTick(options?.tickSize);
  const legs = findSwingLegs(bars, entrySpan);
  const majorSpans = majors
    .filter((item) => item.name === "bull_trend" || item.name === "bear_trend")
    .map((item) => ({
      bull: item.name === "bull_trend",
      start: barIndexAt(bars, item.range.start, id),
      end: barIndexAt(bars, item.range.end ?? item.range.start, id),
    }));
  const hits: SecondEntryHit[] = [];

  for (const bull of [true, false] as const) {
    for (const window of pullbackWindows(legs, bull)) {
      const hinges = withTrendHinges(window.legs, bull);
      const counted: Array<{
        priorIndex: number;
        breakIndex: number;
        entryPrice: number;
      }> = [];
      for (const hinge of hinges) {
        const hit = entryAtHinge(bars, hinge.withTrend, bull, tick);
        if (hit) counted.push(hit);
      }
      if (counted.length < 2) continue;
      const second = counted[1]!;
      // Impulse must sit on a matching major; break bar must still be inside that major.
      const parent = majorSpans.find(
        (major) =>
          major.bull === bull &&
          window.impulse.startIndex >= major.start &&
          window.impulse.endIndex <= major.end,
      );
      if (!parent) continue;
      if (second.breakIndex < parent.start || second.breakIndex > parent.end) continue;

      const protective = resolveProtectiveImpulse(
        bars,
        legs,
        window.impulse,
        bull,
        second.breakIndex,
      );
      const direction = bull ? "up" : "down";
      const stop = stopBeyond(
        protective.p1Price,
        direction,
        tick > 0 ? tick : undefined,
      );
      const stopOk = bull ? stop < second.entryPrice : stop > second.entryPrice;
      if (!stopOk) continue;

      const prior = bars[second.priorIndex]!;
      hits.push({
        bull,
        priorIndex: second.priorIndex,
        breakIndex: second.breakIndex,
        entryPrice: second.entryPrice,
        p1Index: protective.p1Index,
        p1Price: protective.p1Price,
        p2Index: protective.p2Index,
        p2Price: protective.p2Price,
        p3Price: bull ? prior.low : prior.high,
      });
    }
  }

  hits.sort((a, b) => a.breakIndex - b.breakIndex || a.priorIndex - b.priorIndex);
  return hits;
}

type PullbackWindow = {
  impulse: SwingLeg;
  legs: SwingLeg[];
};

type ProtectiveImpulse = {
  p1Index: number;
  p1Price: number;
  p2Index: number;
  p2Price: number;
};

/**
 * If the pullback after the fine impulse violates its start (bear: PB high >
 * start; bull: PB low < start), walk back to earlier same-direction leg starts
 * until the defense still holds. P2 stays the original impulse end.
 */
export function resolveProtectiveImpulse(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  impulse: SwingLeg,
  bull: boolean,
  breakIndex: number,
): ProtectiveImpulse {
  const withDir: SwingLeg["direction"] = bull ? "bull" : "bear";
  const p2Index = impulse.endIndex;
  const p2Price = impulse.endPrice;
  let p1Index = impulse.startIndex;
  let p1Price = impulse.startPrice;
  const pbExtreme = pullbackAdverseExtreme(
    bars,
    impulse.endIndex,
    breakIndex,
    bull,
  );

  while (pbExtreme !== undefined && startViolated(bull, pbExtreme, p1Price)) {
    const prev = priorWithTrendLeg(legs, withDir, p1Index);
    if (prev === undefined) break;
    p1Index = prev.startIndex;
    p1Price = prev.startPrice;
  }

  return { p1Index, p1Price, p2Index, p2Price };
}

function pullbackAdverseExtreme(
  bars: readonly Bar[],
  impulseEndIndex: number,
  breakIndex: number,
  bull: boolean,
): number | undefined {
  const from = impulseEndIndex + 1;
  if (from > breakIndex || from >= bars.length) return undefined;
  let extreme = bull ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const last = Math.min(breakIndex, bars.length - 1);
  for (let index = from; index <= last; index += 1) {
    const bar = bars[index]!;
    if (bull) {
      if (bar.low < extreme) extreme = bar.low;
    } else if (bar.high > extreme) {
      extreme = bar.high;
    }
  }
  return extreme;
}

function startViolated(bull: boolean, pbExtreme: number, startPrice: number): boolean {
  return bull ? pbExtreme < startPrice : pbExtreme > startPrice;
}

function priorWithTrendLeg(
  legs: readonly SwingLeg[],
  withDir: SwingLeg["direction"],
  currentStartIndex: number,
): SwingLeg | undefined {
  let prior: SwingLeg | undefined;
  for (const leg of legs) {
    if (leg.direction !== withDir) continue;
    if (leg.startIndex >= currentStartIndex) break;
    prior = leg;
  }
  return prior;
}

/**
 * After each with-trend impulse, collect following legs until (and including)
 * the next with-trend leg that prints a strict new extreme.
 * An impulse with no later new extreme is skipped (not emitted); scanning
 * continues at the next leg so an early deep swing cannot starve later windows.
 */
function pullbackWindows(legs: readonly SwingLeg[], bull: boolean): PullbackWindow[] {
  const withDir: SwingLeg["direction"] = bull ? "bull" : "bear";
  const windows: PullbackWindow[] = [];
  let index = 0;
  while (index < legs.length) {
    const leg = legs[index]!;
    if (leg.direction !== withDir) {
      index += 1;
      continue;
    }
    const impulse = leg;
    const impulseIndex = index;
    const collected: SwingLeg[] = [];
    let cursor = index + 1;
    let closed = false;
    while (cursor < legs.length) {
      const next = legs[cursor]!;
      collected.push(next);
      if (next.direction === withDir) {
        const newer = bull
          ? next.endPrice > impulse.endPrice
          : next.endPrice < impulse.endPrice;
        if (newer) {
          windows.push({ impulse, legs: collected });
          // Resume from this leg as the next impulse (do not advance past it).
          index = cursor;
          closed = true;
          break;
        }
      }
      cursor += 1;
    }
    if (closed) continue;
    // No newer extreme — skip this impulse only; do not consume the tail.
    index = impulseIndex + 1;
  }
  return windows;
}

function resolveEntrySwingSpan(options?: SecondEntryFromPartsOptions): number {
  const raw =
    options?.entrySwingSpan !== undefined
      ? options.entrySwingSpan
      : options?.swingSpan !== undefined
        ? options.swingSpan
        : 1;
  if (!Number.isInteger(raw) || raw < 1) {
    throw new TypeError(
      "findSecondEntriesFrom: entrySwingSpan must be an integer >= 1",
    );
  }
  return raw;
}

function resolveTick(tickSize: number | undefined): number {
  if (tickSize === undefined) return 0;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("findSecondEntriesFrom: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function withTrendHinges(
  legs: readonly SwingLeg[],
  bull: boolean,
): Array<{ adverse: SwingLeg; withTrend: SwingLeg }> {
  const adverseDir: SwingLeg["direction"] = bull ? "bear" : "bull";
  const withDir: SwingLeg["direction"] = bull ? "bull" : "bear";
  const hinges: Array<{ adverse: SwingLeg; withTrend: SwingLeg }> = [];
  for (let index = 0; index < legs.length - 1; index += 1) {
    const left = legs[index]!;
    const right = legs[index + 1]!;
    if (left.direction === adverseDir && right.direction === withDir) {
      hinges.push({ adverse: left, withTrend: right });
    }
  }
  return hinges;
}

/** First with-trend adjacent break on the with-trend leg (uncapped; hinge-local). */
function entryAtHinge(
  bars: readonly Bar[],
  withTrend: SwingLeg,
  bull: boolean,
  tick: number,
): { priorIndex: number; breakIndex: number; entryPrice: number } | undefined {
  const from = Math.max(withTrend.startIndex, 1);
  const to = withTrend.endIndex;
  for (let breakIndex = from; breakIndex <= to; breakIndex += 1) {
    const priorIndex = breakIndex - 1;
    const prior = bars[priorIndex]!;
    const broke = bars[breakIndex]!;
    if (bull) {
      if (broke.high >= prior.high + tick) {
        return {
          priorIndex,
          breakIndex,
          entryPrice: prior.high + tick,
        };
      }
    } else if (broke.low <= prior.low - tick) {
      return {
        priorIndex,
        breakIndex,
        entryPrice: prior.low - tick,
      };
    }
  }
  return undefined;
}
