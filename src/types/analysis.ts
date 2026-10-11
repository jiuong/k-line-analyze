import type { TimeString } from "./bars.js";

/**
 * Point / swing / pattern anchors.
 * Extend in skill types-contract + this file + the function docs/spec together.
 */
export type LevelName =
  | "H1"
  | "H2"
  | "H3"
  | "L1"
  | "L2"
  | "L3"
  | "Top1"
  | "Top2"
  | "Bottom1"
  | "Bottom2";

/**
 * One named geometric anchor.
 * `time` is the bar open as TimeString unless a function spec says otherwise.
 * Duplicate `name` values are allowed by the type; uniqueness is a function-spec concern.
 */
export type Level = {
  name: LevelName;
  price: number;
  time: TimeString;
};

/**
 * Machine-readable primary classification.
 * Extend per function; never overload an existing label with a new meaning.
 */
export type AnalysisLabel =
  | "bull_trend"
  | "bear_trend"
  | "trading_range"
  | "unclear";

/** One detected structure inside an analyzer output. */
export type AnalyzeResult = {
  /** Classification for this structure (formerly top-level `label`). */
  name: AnalysisLabel;
  /** Time span of this structure (not always the full input window). */
  range: { start: TimeString; end?: TimeString };
  levels: Level[];
};

/**
 * Unified analyzer output. No symbol/timeframe — caller holds instrument context.
 * `summary`, `confidence`, and `evidence` are shared across `results`.
 */
export type AnalysisResult<TEvidence = unknown> = {
  functionId: string;
  results: AnalyzeResult[];
  /** Filled from the function’s summary template only */
  summary: string;
  /** Deterministic code path — always 1 until product rules change */
  confidence: 1;
  /**
   * Extras not expressible as results/summary.
   * Always present; prefer minimal / empty when geometry fits elsewhere.
   */
  evidence: TEvidence;
};
