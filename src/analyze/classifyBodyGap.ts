import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { findBodyGaps, type BodyGap } from "../utils/bodyGaps.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifyBodyGap";

const SUMMARY = "gaps={count}; last={lastName}";

/** One `open_body_gap` or `filled_body_gap` per adjacent gap. A miss is `unclear`. */
export function classifyBodyGap(bars: Bar[]): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyBodyGap: bars must be a non-empty array");
  }
  const gaps = findBodyGaps(bars);
  if (gaps.length === 0) {
    return assemble([unclearResult(bars)], 0);
  }
  return assemble(gaps.map((gap) => toResult(bars, gap)), gaps.length);
}

function toResult(bars: readonly Bar[], gap: BodyGap): AnalyzeResult {
  const prev = bars[gap.index - 1]!;
  const bar = bars[gap.index]!;
  const start = toTimeString(bar.time);
  const nearTime = toTimeString(prev.time);
  const up = gap.direction === "up";
  const levels: Level[] = [
    { name: "GapNear", price: up ? prev.high : prev.low, time: nearTime },
    { name: "GapFar", price: up ? bar.low : bar.high, time: start },
  ];
  const range: AnalyzeResult["range"] = { start };
  if (gap.filledIndex !== undefined) {
    range.end = toTimeString(bars[gap.filledIndex]!.time);
  }
  return {
    name: gap.filledIndex === undefined ? "open_body_gap" : "filled_body_gap",
    range,
    levels,
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
