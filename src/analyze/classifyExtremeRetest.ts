import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { barRange } from "../utils/barMetrics.js";
import { pricesWithin } from "../utils/priceCluster.js";
import { fillSummary } from "../utils/summary.js";
import type { SwingLeg } from "../utils/swingLegs.js";
import { toTimeString } from "../utils/time.js";
import { readSwingLegs } from "./classifySwingLeg.js";

const FUNCTION_ID = "classifyExtremeRetest";

const SUMMARY = "retests={count}; last={lastName}";

/** Omitted `priceTolerance` is this fraction of the window's average bar range. */
const TOLERANCE_RATIO = 0.25;

export type ClassifyExtremeRetestOptions = {
  swingSpan?: number;
  priceTolerance?: number;
};

type Extreme = {
  index: number;
  price: number;
};

type Retest = {
  name: "higher_low" | "lower_high";
  prior: Extreme;
  later: Extreme;
};

/** One inside retest per adjacent same-side swing. A miss is a single `unclear` result. */
export function classifyExtremeRetest(
  bars: Bar[],
  options?: ClassifyExtremeRetestOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyExtremeRetest: bars must be a non-empty array");
  }
  const { swingSpan, priceTolerance } = resolveOptions(options);
  const tolerance = priceTolerance ?? TOLERANCE_RATIO * averageRange(bars);
  const legs = readSwingLegs(bars, swingSpan);
  const found = [
    ...retests(extremes(legs, "low"), "higher_low", tolerance),
    ...retests(extremes(legs, "high"), "lower_high", tolerance),
  ];
  found.sort((a, b) => a.later.index - b.later.index || a.name.localeCompare(b.name));
  if (found.length === 0) {
    return assemble([unclearResult(bars)]);
  }
  return assemble(found.map((item) => toResult(bars, item)));
}

function resolveOptions(options?: ClassifyExtremeRetestOptions): {
  swingSpan: number;
  priceTolerance?: number;
} {
  if (options === undefined) return { swingSpan: 2 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyExtremeRetest: options must be an object");
  }
  return {
    swingSpan: resolveSwingSpan(options.swingSpan),
    priceTolerance: resolveTolerance(options.priceTolerance),
  };
}

function resolveSwingSpan(swingSpan: number | undefined): number {
  if (swingSpan === undefined) return 2;
  if (!Number.isInteger(swingSpan) || swingSpan < 1) {
    throw new TypeError("classifyExtremeRetest: swingSpan must be an integer >= 1");
  }
  return swingSpan;
}

function resolveTolerance(priceTolerance: number | undefined): number | undefined {
  if (priceTolerance === undefined) return undefined;
  if (!Number.isFinite(priceTolerance) || priceTolerance < 0) {
    throw new TypeError("classifyExtremeRetest: priceTolerance must be a finite number >= 0");
  }
  return priceTolerance;
}

function averageRange(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += barRange(bar);
  return sum / bars.length;
}

function extremes(legs: readonly SwingLeg[], side: "high" | "low"): Extreme[] {
  const points: Extreme[] = [];
  for (const leg of legs) {
    const useStart = side === "low" ? leg.direction === "bull" : leg.direction === "bear";
    points.push(
      useStart
        ? { index: leg.startIndex, price: leg.startPrice }
        : { index: leg.endIndex, price: leg.endPrice },
    );
  }
  points.sort((a, b) => a.index - b.index);
  const unique: Extreme[] = [];
  for (const point of points) {
    const prev = unique[unique.length - 1];
    if (prev && prev.index === point.index) continue;
    unique.push(point);
  }
  return unique;
}

function retests(
  points: readonly Extreme[],
  name: Retest["name"],
  tolerance: number,
): Retest[] {
  const found: Retest[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const prior = points[i]!;
    const later = points[i + 1]!;
    const inside = name === "higher_low" ? later.price > prior.price : later.price < prior.price;
    if (inside && !pricesWithin(later.price, prior.price, tolerance)) {
      found.push({ name, prior, later });
    }
  }
  return found;
}

function toResult(bars: readonly Bar[], item: Retest): AnalyzeResult {
  return {
    name: item.name,
    range: {
      start: toTimeString(bars[item.prior.index]!.time),
      end: toTimeString(bars[item.later.index]!.time),
    },
    levels: [
      level(bars, "PriorExtreme", item.prior),
      level(bars, "Retest", item.later),
    ],
  };
}

function level(
  bars: readonly Bar[],
  name: "PriorExtreme" | "Retest",
  point: Extreme,
): Level {
  return { name, price: point.price, time: toTimeString(bars[point.index]!.time) };
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

function assemble(results: AnalyzeResult[]): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: {},
  };
}
