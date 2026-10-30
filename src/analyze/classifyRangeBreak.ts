import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifyTradingRange } from "./classifyTradingRange.js";

const FUNCTION_ID = "classifyRangeBreak";

const SUMMARY = "rangeBreaks={count}; last={lastName}";

const RANGE_LABELS = new Set<AnalysisLabel>([
  "broad_trading_range",
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
]);

export type RangeBreakSide = "up" | "down";

export type RangeBreakItemEvidence = {
  side: RangeBreakSide;
};

export type RangeBreakEvidence = {
  items: RangeBreakItemEvidence[];
};

type RangeView = {
  endIndex: number;
  high: Level;
  low: Level;
};

type Break = {
  index: number;
  side: RangeBreakSide;
  edge: Level;
};

/** First close beyond each trading-range edge. A miss is a single `unclear` result. */
export function classifyRangeBreak(bars: Bar[]): AnalysisResult<RangeBreakEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyRangeBreak: bars must be a non-empty array");
  }
  const ranges = readRanges(bars, classifyTradingRange(bars));
  const found = ranges
    .map((range) => firstBreak(bars, range))
    .filter((item): item is Break => item !== undefined);
  found.sort((a, b) => a.index - b.index || a.edge.time.localeCompare(b.edge.time));
  if (found.length === 0) return assemble([unclearResult(bars)], []);
  return assemble(
    found.map((item) => toResult(bars, item)),
    found.map((item) => ({ side: item.side })),
  );
}

function readRanges(bars: readonly Bar[], ranged: AnalysisResult): RangeView[] {
  const views: RangeView[] = [];
  for (const item of ranged.results) {
    if (!RANGE_LABELS.has(item.name) || item.range.end === undefined) continue;
    const high = item.levels.find((level) => level.name === "RangeHigh");
    const low = item.levels.find((level) => level.name === "RangeLow");
    if (high === undefined || low === undefined) continue;
    views.push({
      endIndex: barIndexAt(bars, item.range.end, FUNCTION_ID),
      high,
      low,
    });
  }
  return views;
}

function firstBreak(bars: readonly Bar[], range: RangeView): Break | undefined {
  for (let index = range.endIndex + 1; index < bars.length; index++) {
    const close = bars[index]!.close;
    if (close > range.high.price) {
      return { index, side: "up", edge: range.high };
    }
    if (close < range.low.price) {
      return { index, side: "down", edge: range.low };
    }
  }
  return undefined;
}

function toResult(bars: readonly Bar[], item: Break): AnalyzeResult {
  const bar = bars[item.index]!;
  const time = toTimeString(bar.time);
  return {
    name: "range_break",
    range: { start: time },
    levels: [
      { name: "BreakBar", price: bar.close, time },
      { name: "BrokenEdge", price: item.edge.price, time: item.edge.time },
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

function assemble(
  results: AnalyzeResult[],
  items: RangeBreakItemEvidence[],
): AnalysisResult<RangeBreakEvidence> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { items },
  };
}
