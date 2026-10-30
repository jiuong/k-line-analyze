import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { matchingBars, type BarPredicate } from "../utils/barPredicates.js";
import { toTimeString } from "../utils/time.js";

type LabelOf = AnalysisLabel | ((bar: Bar) => AnalysisLabel);

/**
 * One result per bar that matches `predicate`. Shared by the four shape analyzers.
 * Not a public analyzer.
 */
export function scanBarShapes<TEvidence>(
  functionId: string,
  bars: readonly Bar[],
  summaryTemplate: string,
  predicate: BarPredicate,
  label: LabelOf,
  evidence: (indexes: readonly number[]) => TEvidence,
): AnalysisResult<TEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError(`${functionId}: bars must be a non-empty array`);
  }
  const indexes = matchingBars(bars, predicate);
  if (indexes.length === 0) {
    return {
      functionId,
      results: [unclearResult(bars)],
      summary: fillSummary(summaryTemplate, { count: 0, lastName: "unclear" }),
      confidence: 1,
      evidence: evidence(indexes),
    };
  }
  const results = indexes.map((index) => shapeResult(bars[index]!, label));
  const last = results[results.length - 1]!;
  return {
    functionId,
    results,
    summary: fillSummary(summaryTemplate, {
      count: results.length,
      lastName: last.name,
    }),
    confidence: 1,
    evidence: evidence(indexes),
  };
}

function shapeResult(bar: Bar, label: LabelOf): AnalyzeResult {
  const time = toTimeString(bar.time);
  return {
    name: typeof label === "function" ? label(bar) : label,
    range: { start: time, end: time },
    levels: [
      { name: "BarHigh", price: bar.high, time },
      { name: "BarLow", price: bar.low, time },
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
