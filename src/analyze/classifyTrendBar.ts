import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";
import {
  isBearTrendBar,
  isBullTrendBar,
  isShaved,
} from "../utils/barPredicates.js";
import { scanBarShapes } from "./barShape.js";

const FUNCTION_ID = "classifyTrendBar";

const SUMMARY = "trendBars={count}; last={lastName}";

export type TrendBarItemEvidence = {
  shaved: boolean;
};

export type TrendBarEvidence = {
  items: TrendBarItemEvidence[];
};

/** One bull or bear trend bar per hit. A miss is a single `unclear` result. */
export function classifyTrendBar(bars: Bar[]): AnalysisResult<TrendBarEvidence> {
  return scanBarShapes(
    FUNCTION_ID,
    bars,
    SUMMARY,
    (bar) => isBullTrendBar(bar) || isBearTrendBar(bar),
    (bar) => (isBullTrendBar(bar) ? "bull_trend_bar" : "bear_trend_bar"),
    (indexes) => ({
      items: indexes.map((index) => ({ shaved: isShaved(bars[index]!) })),
    }),
  );
}
