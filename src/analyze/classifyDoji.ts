import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";
import { isDoji } from "../utils/barPredicates.js";
import { scanBarShapes } from "./barShape.js";

const FUNCTION_ID = "classifyDoji";

const SUMMARY = "dojis={count}; last={lastName}";

/** One `doji` per small-body bar. A miss is a single `unclear` result. */
export function classifyDoji(
  bars: Bar[],
): AnalysisResult<Record<string, never>> {
  return scanBarShapes(
    FUNCTION_ID,
    bars,
    SUMMARY,
    (bar) => isDoji(bar),
    "doji",
    () => ({}),
  );
}
