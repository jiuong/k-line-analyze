import type { Bar } from "../types/bars.js";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt } from "../utils/time.js";
import {
  classifyPullback,
  type ClassifyPullbackOptions,
  type PullbackFibPct,
  type PullbackRelation,
} from "./classifyPullback.js";
import { classifySwingTrend } from "./classifySwingTrend.js";

const FUNCTION_ID = "classifyTrendWithPullbacks";

const SUMMARY_TEMPLATE =
  "trends={count}; annotated={annotated}; pullbacks={pullbacks}; last={lastName} children={children}";

const MAJOR = new Set(["bull_trend", "bear_trend"]);

const INNER = new Set(["bar_pullback", "multi_leg_pullback", "leg_pullback"]);

export type TrendPullbackName =
  | "bar_pullback"
  | "multi_leg_pullback"
  | "leg_pullback";

export type TrendPullbackChild = {
  name: TrendPullbackName;
  range: { start: string; end?: string };
  levels: Level[];
  legCount: number;
  depthPct: number;
  nearestFibPct: PullbackFibPct;
  relation: PullbackRelation;
};

export type TrendWithPullbacksEvidence = {
  segments: { pullbacks: TrendPullbackChild[] }[];
};

type Span = { start: number; end: number };

/**
 * Copy each swing segment and attach pullbacks whose bars lie inside a major trend.
 * Consolidation between two trends is left on classifyPullback.
 */
export function classifyTrendWithPullbacks(
  bars: Bar[],
  options?: ClassifyPullbackOptions,
): AnalysisResult<TrendWithPullbacksEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError(
      "classifyTrendWithPullbacks: bars must be a non-empty array",
    );
  }

  const swingSpan =
    options?.swingSpan === undefined
      ? 2
      : options.swingSpan;
  if (
    options !== undefined &&
    options.swingSpan !== undefined &&
    (!Number.isInteger(options.swingSpan) || options.swingSpan < 1)
  ) {
    throw new TypeError(
      "classifyTrendWithPullbacks: swingSpan must be an integer >= 1",
    );
  }
  const swing = classifySwingTrend(bars, { swingSpan });
  const pullback = classifyPullback(bars, options);
  const results = swing.results.map(copyResult);
  const parents = results.flatMap((item, index) =>
    MAJOR.has(item.name) ? [{ index, span: spanOf(bars, item) }] : [],
  );
  const segments = results.map(() => ({ pullbacks: [] as TrendPullbackChild[] }));

  pullback.results.forEach((item, index) => {
    if (!INNER.has(item.name)) return;
    const span = spanOf(bars, item);
    const parent = parents.find(
      (candidate) => span.start >= candidate.span.start && span.end <= candidate.span.end,
    );
    if (!parent) return;
    const evidence = pullback.evidence.pullbacks[index];
    if (!evidence) {
      throw new Error("classifyTrendWithPullbacks: pullback evidence is missing");
    }
    segments[parent.index]!.pullbacks.push({
      name: item.name as TrendPullbackName,
      range: { start: item.range.start, end: item.range.end },
      levels: item.levels.map(copyLevel),
      legCount: evidence.legCount,
      depthPct: evidence.depthPct,
      nearestFibPct: evidence.nearestFibPct,
      relation: evidence.relation,
    });
  });

  return assemble(results, segments);
}

function copyResult(item: AnalyzeResult): AnalyzeResult {
  return {
    name: item.name,
    range: { start: item.range.start, end: item.range.end },
    levels: item.levels.map(copyLevel),
  };
}

function copyLevel(level: Level): Level {
  return { name: level.name, price: level.price, time: level.time };
}

function spanOf(bars: readonly Bar[], item: AnalyzeResult): Span {
  return {
    start: barIndexAt(bars, item.range.start, FUNCTION_ID),
    end: barIndexAt(bars, item.range.end ?? item.range.start, FUNCTION_ID),
  };
}

function assemble(
  results: AnalyzeResult[],
  segments: TrendWithPullbacksEvidence["segments"],
): AnalysisResult<TrendWithPullbacksEvidence> {
  const majors = results.flatMap((item, index) =>
    MAJOR.has(item.name) ? [{ item, pullbacks: segments[index]!.pullbacks }] : [],
  );
  const last = majors[majors.length - 1] ?? {
    item: results[results.length - 1]!,
    pullbacks: segments[segments.length - 1]!.pullbacks,
  };
  const pullbacks = segments.reduce((count, segment) => count + segment.pullbacks.length, 0);
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY_TEMPLATE, {
      count: majors.length,
      annotated: majors.filter((major) => major.pullbacks.length > 0).length,
      pullbacks,
      lastName: last.item.name,
      children: last.pullbacks.length,
    }),
    confidence: 1,
    evidence: { segments },
  };
}
