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
  swingSpan?: number;
  functionId?: string;
};

/**
 * H2/L2 from major trends + swing legs.
 * Each with-trend impulse opens a pullback window until the next with-trend
 * leg that makes a strict new extreme; adverse→with-trend hinges inside
 * that window are H1, H2, … — only the 2nd is returned.
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
  const swingSpan = resolveSwingSpan(options?.swingSpan);
  const tick = resolveTick(options?.tickSize);
  const legs = findSwingLegs(bars, swingSpan);
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

      const impulse = window.impulse;
      const direction = bull ? "up" : "down";
      const stop = stopBeyond(
        impulse.startPrice,
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
        p1Index: impulse.startIndex,
        p1Price: impulse.startPrice,
        p2Index: impulse.endIndex,
        p2Price: impulse.endPrice,
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

/**
 * After each with-trend impulse, collect following legs until (and including)
 * the next with-trend leg that prints a strict new extreme.
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
    const collected: SwingLeg[] = [];
    index += 1;
    while (index < legs.length) {
      const next = legs[index]!;
      collected.push(next);
      if (next.direction === withDir) {
        const newer = bull
          ? next.endPrice > impulse.endPrice
          : next.endPrice < impulse.endPrice;
        if (newer) {
          windows.push({ impulse, legs: collected });
          // Resume from this leg as the next impulse (do not advance past it).
          break;
        }
      }
      index += 1;
    }
    // If the loop exhausted without a newer extreme, do not emit an open window
    // (no H2 resume yet). When we `break` on newer, index still points at resume leg.
    if (index < legs.length && legs[index] === collected[collected.length - 1]) {
      // next iteration treats resume as impulse
      continue;
    }
  }
  return windows;
}

function resolveSwingSpan(swingSpan: number | undefined): number {
  if (swingSpan === undefined) return 2;
  if (!Number.isInteger(swingSpan) || swingSpan < 1) {
    throw new TypeError("findSecondEntriesFrom: swingSpan must be an integer >= 1");
  }
  return swingSpan;
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
