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
  | "BullTrendStart"
  | "BullTrendEnd"
  | "BearTrendStart"
  | "BearTrendEnd"
  | "Top1"
  | "Top2"
  | "Bottom1"
  | "Bottom2"
  | "Neckline"
  | "K1"
  | "K2"
  | "Confirm"
  | "RangeHigh"
  | "RangeLow"
  | "PullbackStart"
  | "PullbackExtreme"
  | "BarHigh"
  | "BarLow"
  | "LegStart"
  | "LegEnd"
  | "GapNear"
  | "GapFar"
  | "ChannelHigh1"
  | "ChannelHigh2"
  | "ChannelLow1"
  | "ChannelLow2"
  | "PriorExtreme"
  | "Retest"
  | "BreakBar"
  | "BrokenEdge"
  | "FollowBar"
  | "ReturnBar"
  | "SignalBar"
  | "Entry"
  | "Stop"
  | "Target"
  | "P1"
  | "P2"
  | "P3"
  | "TP1"
  | "TP2"
  | "TP3"
  | "TP4"
  | "Push1"
  | "Push2"
  | "Push3";

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
  | "minor_bull_trend"
  | "minor_bear_trend"
  | "trading_range"
  | "unclear"
  | "bull_reversal"
  | "bear_reversal"
  | "no_reversal"
  | "broad_trading_range"
  | "tight_trading_range"
  | "barbwire"
  | "breakout_mode"
  | "consolidation_pullback"
  | "bar_pullback"
  | "multi_leg_pullback"
  | "leg_pullback"
  | "bull_trend_bar"
  | "bear_trend_bar"
  | "doji"
  | "inside_bar"
  | "outside_bar"
  | "bull_leg"
  | "bear_leg"
  | "open_body_gap"
  | "filled_body_gap"
  | "bull_channel"
  | "bear_channel"
  | "higher_low"
  | "lower_high"
  | "bull_line_break"
  | "bear_line_break"
  | "range_break"
  | "follow_through"
  | "failed_breakout"
  | "high1"
  | "high2"
  | "high3"
  | "low1"
  | "low2"
  | "low3"
  /** Pullback-window entry of any ordinal: `high1`, `high4`, `low2`, … */
  | `high${number}`
  | `low${number}`
  | "bull_signal_bar"
  | "bear_signal_bar"
  | "buy_climax"
  | "sell_climax"
  | "breakout_pullback"
  | "micro_double_top"
  | "micro_double_bottom"
  | "double_top"
  | "double_bottom"
  | "wedge_top"
  | "wedge_bottom"
  | "bull_major_reversal"
  | "bear_major_reversal";

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
