import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import {
  FOLLOW_THROUGH_BARS,
  consecutiveTrendBars,
  type TrendBarDirection,
} from "../utils/barPredicates.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifyRangeBreak, type RangeBreakSide } from "./classifyRangeBreak.js";

const FUNCTION_ID = "classifyFollowThrough";

const SUMMARY = "followThroughs={count}; last={lastName}";

type Follow = {
  breakTime: string;
  endIndex: number;
  breakBar: Level;
  edge: Level;
};

/** One follow-through run per range break that keeps going. A miss is `unclear`. */
export function classifyFollowThrough(bars: Bar[]): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyFollowThrough: bars must be a non-empty array");
  }
  const breaks = classifyRangeBreak(bars);
  const runs = consecutiveTrendBars(bars, FOLLOW_THROUGH_BARS);
  const found: Follow[] = [];
  breaks.results.forEach((item, index) => {
    if (item.name !== "range_break") return;
    const side = breaks.evidence.items[index]?.side;
    const edge = item.levels.find((level) => level.name === "BrokenEdge");
    const breakBar = item.levels.find((level) => level.name === "BreakBar");
    if (side === undefined || edge === undefined || breakBar === undefined) return;
    const follow = followOf(bars, runs, item.range.start, side, edge, breakBar);
    if (follow !== undefined) found.push(follow);
  });
  if (found.length === 0) return assemble([unclearResult(bars)]);
  return assemble(found.map((item) => toResult(bars, item)));
}

function followOf(
  bars: readonly Bar[],
  runs: readonly { start: number; end: number; direction: TrendBarDirection }[],
  breakTime: string,
  side: RangeBreakSide,
  edge: Level,
  breakBar: Level,
): Follow | undefined {
  const breakIndex = barIndexAt(bars, breakTime, FUNCTION_ID);
  const direction: TrendBarDirection = side === "up" ? "bull" : "bear";
  const run = runs.find((item) => item.start === breakIndex + 1 && item.direction === direction);
  if (run === undefined) return undefined;
  let end = run.start - 1;
  for (let index = run.start; index <= run.end; index++) {
    const close = bars[index]!.close;
    const beyond = side === "up" ? close > edge.price : close < edge.price;
    if (!beyond) break;
    end = index;
  }
  if (end - run.start + 1 < FOLLOW_THROUGH_BARS) return undefined;
  return { breakTime, endIndex: end, breakBar, edge };
}

function toResult(bars: readonly Bar[], item: Follow): AnalyzeResult {
  const last = bars[item.endIndex]!;
  return {
    name: "follow_through",
    range: { start: item.breakTime, end: toTimeString(last.time) },
    levels: [
      item.breakBar,
      { name: "FollowBar", price: last.close, time: toTimeString(last.time) },
      item.edge,
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

function assemble(results: AnalyzeResult[]): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: {},
  };
}
