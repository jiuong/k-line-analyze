import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { entryBeyond, stopBeyond, targetFrom, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifyFollowThrough } from "./classifyFollowThrough.js";
import { classifyRangeBreak, type RangeBreakSide } from "./classifyRangeBreak.js";
import { classifyTradingRange } from "./classifyTradingRange.js";

const FUNCTION_ID = "classifyFailedBreakout";

const SUMMARY = "failedBreakouts={count}; last={lastName}";

const RANGE_LABELS = new Set<AnalysisLabel>([
  "broad_trading_range",
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
]);

export type ClassifyFailedBreakoutOptions = {
  tickSize?: number;
};

type Failure = {
  side: RangeBreakSide;
  breakIndex: number;
  returnIndex: number;
  breakBar: Level;
  edge: Level;
  opposite: Level;
};

/** A range break with no follow-through that closes back inside. A miss is `unclear`. */
export function classifyFailedBreakout(
  bars: Bar[],
  options?: ClassifyFailedBreakoutOptions,
): AnalysisResult<{ directions: SetupDirection[] }> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyFailedBreakout: bars must be a non-empty array");
  }
  const tickSize = resolveTick(options);
  const breaks = classifyRangeBreak(bars);
  const follows = classifyFollowThrough(bars).results;
  const ranges = classifyTradingRange(bars).results;
  const found: Failure[] = [];
  breaks.results.forEach((item, index) => {
    if (item.name !== "range_break") return;
    const side = breaks.evidence.items[index]?.side;
    const edge = item.levels.find((level) => level.name === "BrokenEdge");
    const breakBar = item.levels.find((level) => level.name === "BreakBar");
    if (side === undefined || edge === undefined || breakBar === undefined) return;
    if (hasFollow(follows, breakBar, edge)) return;
    const opposite = oppositeEdge(ranges, edge);
    if (opposite === undefined) return;
    const breakIndex = barIndexAt(bars, item.range.start, FUNCTION_ID);
    const returnIndex = firstReturn(bars, breakIndex, side, edge.price);
    if (returnIndex === undefined) return;
    found.push({ side, breakIndex, returnIndex, breakBar, edge, opposite });
  });
  found.sort((a, b) => a.returnIndex - b.returnIndex || a.breakIndex - b.breakIndex);
  if (found.length === 0) return assemble([unclearResult(bars)], []);
  return assemble(
    found.map((item) => toResult(bars, item, tickSize)),
    found.map((item) => (item.side === "up" ? "down" : "up")),
  );
}

function resolveTick(options?: ClassifyFailedBreakoutOptions): number | undefined {
  if (options === undefined) return undefined;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyFailedBreakout: options must be an object");
  }
  if (options.tickSize === undefined) return undefined;
  if (!Number.isFinite(options.tickSize) || options.tickSize <= 0) {
    throw new TypeError("classifyFailedBreakout: tickSize must be a finite number > 0");
  }
  return options.tickSize;
}

function hasFollow(follows: readonly AnalyzeResult[], breakBar: Level, edge: Level): boolean {
  return follows.some((item) => {
    if (item.name !== "follow_through") return false;
    const followed = levelNamed(item, "BreakBar");
    const followedEdge = levelNamed(item, "BrokenEdge");
    return (
      followed?.time === breakBar.time &&
      followedEdge?.price === edge.price &&
      followedEdge?.time === edge.time
    );
  });
}

function oppositeEdge(ranges: readonly AnalyzeResult[], edge: Level): Level | undefined {
  for (const item of ranges) {
    if (!RANGE_LABELS.has(item.name)) continue;
    const high = levelNamed(item, "RangeHigh");
    const low = levelNamed(item, "RangeLow");
    if (high === undefined || low === undefined) continue;
    if (sameLevel(high, edge)) return low;
    if (sameLevel(low, edge)) return high;
  }
  return undefined;
}

function sameLevel(left: Level, right: Level): boolean {
  return left.price === right.price && left.time === right.time;
}

function firstReturn(
  bars: readonly Bar[],
  breakIndex: number,
  side: RangeBreakSide,
  edge: number,
): number | undefined {
  for (let index = breakIndex + 1; index < bars.length; index++) {
    const close = bars[index]!.close;
    const back = side === "up" ? close <= edge : close >= edge;
    if (back) return index;
  }
  return undefined;
}

function toResult(
  bars: readonly Bar[],
  item: Failure,
  tickSize: number | undefined,
): AnalyzeResult {
  const broke = bars[item.breakIndex]!;
  const returned = bars[item.returnIndex]!;
  const returnTime = toTimeString(returned.time);
  const breakTime = toTimeString(broke.time);
  const trade = item.side === "up" ? "down" : "up";
  const signalPrice = item.side === "up" ? returned.low : returned.high;
  const stopPrice = item.side === "up" ? broke.high : broke.low;
  const entry = entryBeyond(item.edge.price, trade, tickSize);
  return {
    name: "failed_breakout",
    range: { start: breakTime, end: returnTime },
    levels: [
      item.breakBar,
      item.edge,
      { name: "ReturnBar", price: returned.close, time: returnTime },
      { name: "SignalBar", price: signalPrice, time: returnTime },
      { name: "Entry", price: entry, time: returnTime },
      {
        name: "Stop",
        price: stopBeyond(stopPrice, trade, tickSize),
        time: breakTime,
      },
      {
        name: "Target",
        price: targetFrom(item.opposite.price),
        time: item.opposite.time,
      },
    ],
  };
}

function levelNamed(item: AnalyzeResult, name: Level["name"]): Level | undefined {
  return item.levels.find((level) => level.name === name);
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
  directions: SetupDirection[],
): AnalysisResult<{ directions: SetupDirection[] }> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { directions },
  };
}
