import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { barRange } from "../utils/barMetrics.js";
import { projectMeasuredMove, type MeasuredMoveDirection } from "../utils/measuredMove.js";
import { pricesWithin } from "../utils/priceCluster.js";
import { entryBeyond, stopBeyond, targetFrom, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import type { SwingLeg, SwingLegDirection } from "../utils/swingLegs.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifyFollowThrough } from "./classifyFollowThrough.js";
import { readSwingLegs } from "./classifySwingLeg.js";
import { classifyTradingRange } from "./classifyTradingRange.js";

const FUNCTION_ID = "classifyBreakoutPullback";

const SUMMARY = "breakoutPullbacks={count}; last={lastName}";

const TOLERANCE_RATIO = 0.25;

const RANGE_LABELS = new Set([
  "broad_trading_range",
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
]);

export type ClassifyBreakoutPullbackOptions = {
  swingSpan?: number;
  tickSize?: number;
  priceTolerance?: number;
};

type Pullback = {
  edge: Level;
  opposite: Level;
  leg: SwingLeg;
  resumeIndex: number;
  direction: MeasuredMoveDirection;
};

/** The first opposite leg back to a broken edge after follow-through. A miss is `unclear`. */
export function classifyBreakoutPullback(
  bars: Bar[],
  options?: ClassifyBreakoutPullbackOptions,
): AnalysisResult<{ directions: SetupDirection[] }> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyBreakoutPullback: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const tickSize = resolveTick(options);
  const tolerance = resolveTolerance(options) ?? TOLERANCE_RATIO * averageRange(bars);
  const legs = readSwingLegs(bars, swingSpan);
  const ranges = classifyTradingRange(bars).results;
  const found: Pullback[] = [];
  for (const item of classifyFollowThrough(bars).results) {
    if (item.name !== "follow_through" || item.range.end === undefined) continue;
    const edge = levelNamed(item, "BrokenEdge");
    if (edge === undefined) continue;
    const opposite = oppositeEdge(ranges, edge);
    if (opposite === undefined) continue;
    const pullback = pullbackOf(bars, legs, item, edge, opposite, tolerance);
    if (pullback !== undefined) found.push(pullback);
  }
  if (found.length === 0) return assemble([unclearResult(bars)], []);
  return assemble(
    found.map((item) => toResult(bars, item, tickSize)),
    found.map((item) => item.direction),
  );
}

function pullbackOf(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  follow: AnalyzeResult,
  edge: Level,
  opposite: Level,
  tolerance: number,
): Pullback | undefined {
  const up = opposite.name === "RangeLow";
  const direction: MeasuredMoveDirection = up ? "up" : "down";
  const counter: SwingLegDirection = up ? "bear" : "bull";
  const followEnd = barIndexAt(bars, follow.range.end ?? follow.range.start, FUNCTION_ID);
  const breakIndex = barIndexAt(bars, follow.range.start, FUNCTION_ID);
  const counters = legs.filter((leg) => leg.direction === counter && leg.startIndex >= followEnd);
  const leg = counters[0];
  if (leg === undefined || !pricesWithin(leg.endPrice, edge.price, tolerance)) return undefined;
  const next = counters[1];
  const windowEnd = next === undefined ? bars.length - 1 : next.startIndex - 1;
  const resumeIndex = firstResume(bars, leg, windowEnd, up);
  if (resumeIndex === undefined) return undefined;
  if (returnedInside(bars, breakIndex, resumeIndex, edge.price, up)) return undefined;
  return { edge, opposite, leg, resumeIndex, direction };
}

function firstResume(
  bars: readonly Bar[],
  leg: SwingLeg,
  windowEnd: number,
  up: boolean,
): number | undefined {
  for (let index = leg.endIndex + 1; index <= windowEnd; index += 1) {
    const close = bars[index]!.close;
    if (up ? close > leg.startPrice : close < leg.startPrice) return index;
  }
  return undefined;
}

function returnedInside(
  bars: readonly Bar[],
  breakIndex: number,
  resumeIndex: number,
  edge: number,
  up: boolean,
): boolean {
  for (let index = breakIndex + 1; index <= resumeIndex; index += 1) {
    const close = bars[index]!.close;
    if (up ? close <= edge : close >= edge) return true;
  }
  return false;
}

function oppositeEdge(ranges: readonly AnalyzeResult[], edge: Level): Level | undefined {
  for (const item of ranges) {
    if (!RANGE_LABELS.has(item.name)) continue;
    const high = levelNamed(item, "RangeHigh");
    const low = levelNamed(item, "RangeLow");
    if (high === undefined || low === undefined) continue;
    if (sameLevel(high, edge)) return low;
    if (sameLevel(low, edge)) return high;
  }
  return undefined;
}

function sameLevel(left: Level, right: Level): boolean {
  return left.price === right.price && left.time === right.time;
}

function toResult(
  bars: readonly Bar[],
  item: Pullback,
  tickSize: number | undefined,
): AnalyzeResult {
  const resume = bars[item.resumeIndex]!;
  const start = bars[item.leg.startIndex]!;
  const end = bars[item.leg.endIndex]!;
  const resumeTime = toTimeString(resume.time);
  const endTime = toTimeString(end.time);
  const signalPrice = item.direction === "up" ? resume.high : resume.low;
  const magnitude = Math.abs(item.opposite.price - item.edge.price);
  const entry = entryBeyond(item.leg.startPrice, item.direction, tickSize);
  return {
    name: "breakout_pullback",
    range: { start: toTimeString(start.time), end: resumeTime },
    levels: [
      item.edge,
      { name: "LegEnd", price: item.leg.endPrice, time: endTime },
      { name: "SignalBar", price: signalPrice, time: resumeTime },
      { name: "Entry", price: entry, time: resumeTime },
      {
        name: "Stop",
        price: stopBeyond(item.leg.endPrice, item.direction, tickSize),
        time: endTime,
      },
      {
        name: "Target",
        price: targetFrom(projectMeasuredMove(entry, magnitude, item.direction)),
        time: resumeTime,
      },
    ],
  };
}

function levelNamed(item: AnalyzeResult, name: Level["name"]): Level | undefined {
  return item.levels.find((level) => level.name === name);
}

function averageRange(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += barRange(bar);
  return sum / bars.length;
}

function resolveSwingSpan(options?: ClassifyBreakoutPullbackOptions): number {
  if (options === undefined) return 2;
  assertOptions(options);
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifyBreakoutPullback: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function resolveTick(options?: ClassifyBreakoutPullbackOptions): number | undefined {
  if (options === undefined) return undefined;
  assertOptions(options);
  if (options.tickSize === undefined) return undefined;
  if (!Number.isFinite(options.tickSize) || options.tickSize <= 0) {
    throw new TypeError("classifyBreakoutPullback: tickSize must be a finite number > 0");
  }
  return options.tickSize;
}

function resolveTolerance(options?: ClassifyBreakoutPullbackOptions): number | undefined {
  if (options === undefined) return undefined;
  assertOptions(options);
  if (options.priceTolerance === undefined) return undefined;
  if (!Number.isFinite(options.priceTolerance) || options.priceTolerance < 0) {
    throw new TypeError("classifyBreakoutPullback: priceTolerance must be a finite number >= 0");
  }
  return options.priceTolerance;
}

function assertOptions(options: ClassifyBreakoutPullbackOptions): void {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyBreakoutPullback: options must be an object");
  }
}

function unclearResult(bars: readonly Bar[]): AnalyzeResult {
  return {
    name: "unclear",
    range: {
      start: toTimeString(bars[0]!.time),
      end: toTimeString(bars[bars.length - 1]!.time),
    },
    levels: [],
  };
}

function assemble(
  results: AnalyzeResult[],
  directions: SetupDirection[],
): AnalysisResult<{ directions: SetupDirection[] }> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { directions },
  };
}
