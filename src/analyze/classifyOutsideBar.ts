import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";
import { isOutsideBar } from "../utils/barPredicates.js";
import { scanBarShapes } from "./barShape.js";

const FUNCTION_ID = "classifyOutsideBar";

const SUMMARY = "outsideBars={count}; last={lastName}";

/** One `outside_bar` per bar that exceeds the previous high and low. No direction. */
export function classifyOutsideBar(
  bars: Bar[],
): AnalysisResult<Record<string, never>> {
  return scanBarShapes(
    FUNCTION_ID,
    bars,
    SUMMARY,
    (bar, index, series) =>
      isOutsideBar(bar, index === 0 ? undefined : series[index - 1]),
    "outside_bar",
    () => ({}),
  );
}
