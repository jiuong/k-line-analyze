import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { barRange } from "../utils/barMetrics.js";
import { projectMeasuredMove } from "../utils/measuredMove.js";
import { pricesWithin } from "../utils/priceCluster.js";
import { entryBeyond, stopBeyond, targetFrom, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import type { SwingLeg, SwingLegDirection } from "../utils/swingLegs.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { readSwingLegs } from "./classifySwingLeg.js";
import { classifySwingTrend } from "./classifySwingTrend.js";

const FUNCTION_ID = "classifyWedge";

const SUMMARY = "wedges={count}; last={lastName}";

/** Omitted `priceTolerance` is this fraction of the window's average bar range. */
const TOLERANCE_RATIO = 0.25;

export type WedgeRole = "flag" | "reversal";

export type WedgeEvidence = {
  items: { role: WedgeRole }[];
};

export type ClassifyWedgeOptions = {
  swingSpan?: number;
  tickSize?: number;
  priceTolerance?: number;
};

type Wedge = {
  direction: SwingLegDirection;
  pushes: [SwingLeg, SwingLeg, SwingLeg];
  role: WedgeRole;
};

/** Three same-direction pushes. A miss is a single `unclear` result. */
export function classifyWedge(
  bars: Bar[],
  options?: ClassifyWedgeOptions,
): AnalysisResult<WedgeEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyWedge: bars must be a non-empty array");
  }
  const { swingSpan, tickSize, priceTolerance } = resolveOptions(options);
  const tolerance = priceTolerance ?? TOLERANCE_RATIO * averageRange(bars);
  const legs = readSwingLegs(bars, swingSpan);
  const trend = classifySwingTrend(bars);
  const found = [
    ...wedges(legs, "bull", tolerance),
    ...wedges(legs, "bear", tolerance),
  ];
  for (const wedge of found) {
    wedge.role = roleOf(bars, trend, wedge);
  }
  found.sort(
    (a, b) =>
      a.pushes[2].endIndex - b.pushes[2].endIndex ||
      directionOrder(a.direction) - directionOrder(b.direction),
  );
  if (found.length === 0) {
    return assemble([unclearResult(bars)], []);
  }
  return assemble(
    found.map((wedge) => toResult(bars, wedge, tickSize)),
    found.map((wedge) => ({ role: wedge.role })),
  );
}

function resolveOptions(options?: ClassifyWedgeOptions): {
  swingSpan: number;
  tickSize?: number;
  priceTolerance?: number;
} {
  if (options === undefined) return { swingSpan: 2 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyWedge: options must be an object");
  }
  return {
    swingSpan: resolveSwingSpan(options.swingSpan),
    tickSize: resolveTick(options.tickSize),
    priceTolerance: resolveTolerance(options.priceTolerance),
  };
}

function resolveSwingSpan(swingSpan: number | undefined): number {
  if (swingSpan === undefined) return 2;
  if (!Number.isInteger(swingSpan) || swingSpan < 1) {
    throw new TypeError("classifyWedge: swingSpan must be an integer >= 1");
  }
  return swingSpan;
}

function resolveTick(tickSize: number | undefined): number | undefined {
  if (tickSize === undefined) return undefined;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("classifyWedge: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function resolveTolerance(priceTolerance: number | undefined): number | undefined {
  if (priceTolerance === undefined) return undefined;
  if (!Number.isFinite(priceTolerance) || priceTolerance < 0) {
    throw new TypeError("classifyWedge: priceTolerance must be a finite number >= 0");
  }
  return priceTolerance;
}

function averageRange(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += barRange(bar);
  return sum / bars.length;
}

function wedges(
  legs: readonly SwingLeg[],
  direction: SwingLegDirection,
  tolerance: number,
): Wedge[] {
  const same = legs.filter((leg) => leg.direction === direction);
  const found: Wedge[] = [];
  let index = 0;
  while (index + 2 < same.length) {
    const pushes: [SwingLeg, SwingLeg, SwingLeg] = [
      same[index]!,
      same[index + 1]!,
      same[index + 2]!,
    ];
    if (isWedge(pushes, direction, tolerance)) {
      found.push({ direction, pushes, role: "reversal" });
      index += 3;
    } else {
      index += 1;
    }
  }
  return found;
}

function isWedge(
  pushes: readonly [SwingLeg, SwingLeg, SwingLeg],
  direction: SwingLegDirection,
  tolerance: number,
): boolean {
  const [first, second, third] = pushes;
  const prices = [first.endPrice, second.endPrice, third.endPrice];
  if (!stepHolds(prices[0]!, prices[1]!, direction, tolerance)) return false;
  if (!stepHolds(prices[1]!, prices[2]!, direction, tolerance)) return false;
  const earlier = Math.abs(prices[1]! - prices[0]!);
  const later = Math.abs(prices[2]! - prices[1]!);
  return pricesWithin(later, Math.min(later, earlier), tolerance);
}

function stepHolds(
  previous: number,
  next: number,
  direction: SwingLegDirection,
  tolerance: number,
): boolean {
  const progressed = direction === "bull" ? next >= previous : next <= previous;
  return progressed || pricesWithin(next, previous, tolerance);
}

function roleOf(
  bars: readonly Bar[],
  trend: AnalysisResult<Record<string, never>>,
  wedge: Wedge,
): WedgeRole {
  const opposite = wedge.direction === "bull" ? "bear_trend" : "bull_trend";
  const from = wedge.pushes[0].startIndex;
  const to = wedge.pushes[2].endIndex;
  for (const item of trend.results) {
    if (item.name !== opposite || item.range.end === undefined) continue;
    const start = barIndexAt(bars, item.range.start, FUNCTION_ID);
    const end = barIndexAt(bars, item.range.end, FUNCTION_ID);
    if (from >= start && to <= end) return "flag";
  }
  return "reversal";
}

function directionOrder(direction: SwingLegDirection): number {
  return direction === "bull" ? 0 : 1;
}

function toResult(
  bars: readonly Bar[],
  wedge: Wedge,
  tickSize: number | undefined,
): AnalyzeResult {
  const [first, second, third] = wedge.pushes;
  const trade: SetupDirection = wedge.direction === "bull" ? "down" : "up";
  const levels: Level[] = [
    pushLevel(bars, "Push1", first),
    pushLevel(bars, "Push2", second),
    pushLevel(bars, "Push3", third),
  ];
  const broken = breakIndex(bars, third.endIndex, third.startPrice, trade);
  if (broken !== undefined) {
    const entry = entryBeyond(third.startPrice, trade, tickSize);
    const magnitude = Math.abs(third.endPrice - first.endPrice);
    const time = toTimeString(bars[broken]!.time);
    levels.push(
      { name: "Entry", price: entry, time },
      {
        name: "Stop",
        price: stopBeyond(third.endPrice, trade, tickSize),
        time: toTimeString(bars[third.endIndex]!.time),
      },
      {
        name: "Target",
        price: targetFrom(projectMeasuredMove(entry, magnitude, trade)),
        time,
      },
    );
  }
  return {
    name: wedge.direction === "bull" ? "wedge_top" : "wedge_bottom",
    range: {
      start: toTimeString(bars[first.startIndex]!.time),
      end: toTimeString(bars[third.endIndex]!.time),
    },
    levels,
  };
}

function breakIndex(
  bars: readonly Bar[],
  pushIndex: number,
  neck: number,
  trade: SetupDirection,
): number | undefined {
  for (let index = pushIndex + 1; index < bars.length; index += 1) {
    const close = bars[index]!.close;
    const beyond = trade === "down" ? close < neck : close > neck;
    if (beyond) return index;
  }
  return undefined;
}

function pushLevel(
  bars: readonly Bar[],
  name: "Push1" | "Push2" | "Push3",
  leg: SwingLeg,
): Level {
  return {
    name,
    price: leg.endPrice,
    time: toTimeString(bars[leg.endIndex]!.time),
  };
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
  items: WedgeEvidence["items"],
): AnalysisResult<WedgeEvidence> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { items },
  };
}
