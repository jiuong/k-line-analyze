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
   * Which with-trend hinge to emit inside each pullback window.
   * `1` is the first, `2` the second. Integer `>= 1`. Default `2`.
   */
  entryCount?: number;
  /**
   * Swing span for pullback-window hinge legs.
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

const COUNTED_ENTRY = /^(high|low)([1-9]\d*)$/;

/** Result label for the Nth pullback-window entry (`high2`, `low4`, …). */
export function countedEntryLabel(
  bull: boolean,
  count: number,
): `high${number}` | `low${number}` {
  return bull ? `high${count}` : `low${count}`;
}

/** `high` / `low` when `name` is a counted entry label; otherwise undefined. */
export function countedEntrySide(name: string): "high" | "low" | undefined {
  const match = COUNTED_ENTRY.exec(name);
  if (!match) return undefined;
  return match[1] === "high" ? "high" : "low";
}

/** Overlay shorthand: `high4` → `H4`, `low2` → `L2`. */
export function countedEntryShort(name: string): string | undefined {
  const match = COUNTED_ENTRY.exec(name);
  if (!match) return undefined;
  return `${match[1] === "high" ? "H" : "L"}${match[2]}`;
}

/**
 * Pullback-window entries from major trends + swing legs.
 * Each with-trend impulse opens a pullback window until the next with-trend
 * leg that makes a strict new extreme; adverse→with-trend hinges inside
 * that window are counted in order. Only hinge number `entryCount`
 * (default 2) is returned.
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
  const entryCount = resolveEntryCount(options);
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
      if (counted.length < entryCount) continue;
      const chosen = counted[entryCount - 1]!;
      // Impulse must sit on a matching major; break bar must still be inside that major.
      const parent = majorSpans.find(
        (major) =>
          major.bull === bull &&
          window.impulse.startIndex >= major.start &&
          window.impulse.endIndex <= major.end,
      );
      if (!parent) continue;
      if (chosen.breakIndex < parent.start || chosen.breakIndex > parent.end) continue;

      const protective = resolveProtectiveImpulse(
        bars,
        legs,
        window.impulse,
        bull,
        chosen.breakIndex,
      );
      const direction = bull ? "up" : "down";
      const stop = stopBeyond(
        protective.p1Price,
        direction,
        tick > 0 ? tick : undefined,
      );
      const stopOk = bull ? stop < chosen.entryPrice : stop > chosen.entryPrice;
      if (!stopOk) continue;

      const prior = bars[chosen.priorIndex]!;
      hits.push({
        bull,
        priorIndex: chosen.priorIndex,
        breakIndex: chosen.breakIndex,
        entryPrice: chosen.entryPrice,
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

function resolveEntryCount(options?: SecondEntryFromPartsOptions): number {
  const raw = options?.entryCount ?? 2;
  if (!Number.isInteger(raw) || raw < 1) {
    throw new TypeError(
      "findSecondEntriesFrom: entryCount must be an integer >= 1",
    );
  }
  return raw;
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
