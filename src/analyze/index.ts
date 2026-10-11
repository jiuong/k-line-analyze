/**
 * Analyze module — public analyzers live as `src/analyze/<functionId>.ts`.
 * No concrete analyzers in this scaffold; add via skill `kline-analyze-fn`.
 *
 * Import chart packages only from `src/chart/` — never here.
 */
import type { Bar } from "../types/bars.js";
import type { AnalysisResult } from "../types/analysis.js";

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
