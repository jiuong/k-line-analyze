import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";
import { isInsideBar } from "../utils/barPredicates.js";
import { scanBarShapes } from "./barShape.js";

const FUNCTION_ID = "classifyInsideBar";

const SUMMARY = "insideBars={count}; last={lastName}";

/** One `inside_bar` per contained bar. Consecutive insides stay separate results. */
export function classifyInsideBar(
  bars: Bar[],
): AnalysisResult<Record<string, never>> {
  return scanBarShapes(
    FUNCTION_ID,
    bars,
    SUMMARY,
    (bar, index, series) =>
      isInsideBar(bar, index === 0 ? undefined : series[index - 1]),
    "inside_bar",
    () => ({}),
  );
}
