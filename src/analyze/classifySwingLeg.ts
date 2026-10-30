import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult } from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { findSwingLegs, type SwingLeg } from "../utils/swingLegs.js";
import { barIndexAt, toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifySwingLeg";

const SUMMARY = "legs={count}; last={lastName}";

export type ClassifySwingLegOptions = {
  swingSpan?: number;
};

/** One `bull_leg` or `bear_leg` per swing pair. A miss is a single `unclear` result. */
export function classifySwingLeg(
  bars: Bar[],
  options?: ClassifySwingLegOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifySwingLeg: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const legs = findSwingLegs(bars, swingSpan);
  if (legs.length === 0) {
    return assemble([unclearResult(bars)], 0);
  }
  return assemble(legs.map((leg) => toResult(bars, leg)), legs.length);
}

/** Legs already emitted by `classifySwingLeg`, with bar indexes restored. */
export function readSwingLegs(bars: Bar[], swingSpan = 2): SwingLeg[] {
  const result = classifySwingLeg(bars, { swingSpan });
  const legs: SwingLeg[] = [];
  for (const item of result.results) {
    if (item.name !== "bull_leg" && item.name !== "bear_leg") continue;
    const start = item.levels.find((level) => level.name === "LegStart");
    const end = item.levels.find((level) => level.name === "LegEnd");
    if (!start || !end) continue;
    legs.push({
      direction: item.name === "bull_leg" ? "bull" : "bear",
      startIndex: barIndexAt(bars, start.time, FUNCTION_ID),
      endIndex: barIndexAt(bars, end.time, FUNCTION_ID),
      startPrice: start.price,
      endPrice: end.price,
    });
  }
  return legs;
}

function resolveSwingSpan(options?: ClassifySwingLegOptions): number {
  if (options === undefined) return 2;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifySwingLeg: options must be an object");
  }
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifySwingLeg: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function toResult(bars: readonly Bar[], leg: SwingLeg): AnalyzeResult {
  const start = bars[leg.startIndex]!;
  const end = bars[leg.endIndex]!;
  const startTime = toTimeString(start.time);
  const endTime = toTimeString(end.time);
  return {
    name: leg.direction === "bull" ? "bull_leg" : "bear_leg",
    range: { start: startTime, end: endTime },
    levels: [
      { name: "LegStart", price: leg.startPrice, time: startTime },
      { name: "LegEnd", price: leg.endPrice, time: endTime },
    ],
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
  count: number,
): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: {},
  };
}
