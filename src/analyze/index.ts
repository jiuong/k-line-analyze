/**
 * Analyze module — public analyzers live as `src/analyze/<functionId>.ts`.
 * Add new functions via skill `kline-analyze-fn`.
 *
 * Import chart packages only from `src/chart/` — never here.
 */
import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";

export { classifyBodyGap } from "./classifyBodyGap.js";
export { classifyBreakoutPullback } from "./classifyBreakoutPullback.js";
export { measureBreakoutPullback } from "./measureBreakoutPullback.js";
export { classifyChannel } from "./classifyChannel.js";
export { classifyTrendlineBreak } from "./classifyTrendlineBreak.js";
export { classifyExtremeRetest } from "./classifyExtremeRetest.js";
export { classifyFailedBreakout } from "./classifyFailedBreakout.js";
export { measureFailedBreakout } from "./measureFailedBreakout.js";
export { classifyFollowThrough } from "./classifyFollowThrough.js";
export { classifyDoji } from "./classifyDoji.js";
export { classifyInsideBar } from "./classifyInsideBar.js";
export { classifyOutsideBar } from "./classifyOutsideBar.js";
export { classifyPullback } from "./classifyPullback.js";
export { classifyRangeBreak } from "./classifyRangeBreak.js";
export { classifySecondEntry } from "./classifySecondEntry.js";
export { measureSecondEntry } from "./measureSecondEntry.js";
export { classifySignalBar } from "./classifySignalBar.js";
export { classifyClimax } from "./classifyClimax.js";
export { classifyDoubleTopBottom } from "./classifyDoubleTopBottom.js";
export { measureDoubleTopBottom } from "./measureDoubleTopBottom.js";
export { classifyMicroDouble } from "./classifyMicroDouble.js";
export { classifyWedge } from "./classifyWedge.js";
export { measureWedge } from "./measureWedge.js";
export { classifyMajorTrendReversal } from "./classifyMajorTrendReversal.js";
export { measureMajorTrendReversal } from "./measureMajorTrendReversal.js";
export { classifyTrendBar } from "./classifyTrendBar.js";
export { classifyTrendWithPullbacks } from "./classifyTrendWithPullbacks.js";
export { classifyReversalSignal } from "./classifyReversalSignal.js";
export { classifySwingLeg } from "./classifySwingLeg.js";
export {
  classifySwingTrend,
  type ClassifySwingTrendOptions,
} from "./classifySwingTrend.js";
export { classifyTradingRange } from "./classifyTradingRange.js";

export type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
  LevelName,
} from "../types/analysis.js";

/** Standard public analyzer signature (sync; no fetch). */
export type AnalyzerFn<TOptions = void, TEvidence = unknown> = (
  bars: Bar[],
  options?: TOptions,
) => AnalysisResult<TEvidence>;
