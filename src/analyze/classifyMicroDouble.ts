import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import { barRange } from "../utils/barMetrics.js";
import { isOutsideBar } from "../utils/barPredicates.js";
import { pricesWithin } from "../utils/priceCluster.js";
import { entryBeyond, stopBeyond, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifyMicroDouble";

const SUMMARY = "microDoubles={count}; last={lastName}";

/** Omitted `priceTolerance` is this fraction of the window's average bar range. */
const TOLERANCE_RATIO = 0.25;

export type ClassifyMicroDoubleOptions = {
  tickSize?: number;
  priceTolerance?: number;
};

type Side = "top" | "bottom";

type Pair = {
  side: Side;
  first: number;
  second: number;
};

/** Adjacent highs or lows inside the tolerance. A miss is a single `unclear` result. */
export function classifyMicroDouble(
  bars: Bar[],
  options?: ClassifyMicroDoubleOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyMicroDouble: bars must be a non-empty array");
  }
  const { tickSize, priceTolerance } = resolveOptions(options);
  const tolerance = priceTolerance ?? TOLERANCE_RATIO * averageRange(bars);
  const found = pairs(bars, tolerance);
  if (found.length === 0) {
    return assemble([unclearResult(bars)]);
  }
  return assemble(found.map((pair) => toResult(bars, pair, tickSize)));
}

function resolveOptions(options?: ClassifyMicroDoubleOptions): {
  tickSize?: number;
  priceTolerance?: number;
} {
  if (options === undefined) return {};
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyMicroDouble: options must be an object");
  }
  return {
    tickSize: resolveTick(options.tickSize),
    priceTolerance: resolveTolerance(options.priceTolerance),
  };
}

function resolveTick(tickSize: number | undefined): number | undefined {
  if (tickSize === undefined) return undefined;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("classifyMicroDouble: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function resolveTolerance(priceTolerance: number | undefined): number | undefined {
  if (priceTolerance === undefined) return undefined;
  if (!Number.isFinite(priceTolerance) || priceTolerance < 0) {
    throw new TypeError("classifyMicroDouble: priceTolerance must be a finite number >= 0");
  }
  return priceTolerance;
}

function averageRange(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += barRange(bar);
  return sum / bars.length;
}

function pairs(bars: readonly Bar[], tolerance: number): Pair[] {
  const found: Pair[] = [];
  for (let index = 0; index < bars.length - 1; index += 1) {
    const first = bars[index]!;
    const second = bars[index + 1]!;
    if (isOutsideBar(second, first)) continue;
    if (pricesWithin(first.high, second.high, tolerance)) {
      found.push({ side: "top", first: index, second: index + 1 });
    }
    if (pricesWithin(first.low, second.low, tolerance)) {
      found.push({ side: "bottom", first: index, second: index + 1 });
    }
  }
  return found;
}

function toResult(
  bars: readonly Bar[],
  pair: Pair,
  tickSize: number | undefined,
): AnalyzeResult {
  const left = bars[pair.first]!;
  const right = bars[pair.second]!;
  const top = pair.side === "top";
  const same = top ? Math.max(left.high, right.high) : Math.min(left.low, right.low);
  const opposite = top ? Math.min(left.low, right.low) : Math.max(left.high, right.high);
  const sameIndex = top
    ? (right.high >= left.high ? pair.second : pair.first)
    : (right.low <= left.low ? pair.second : pair.first);
  const levels: Level[] = top
    ? [
        level(bars, "Top1", left.high, pair.first),
        level(bars, "Top2", right.high, pair.second),
      ]
    : [
        level(bars, "Bottom1", left.low, pair.first),
        level(bars, "Bottom2", right.low, pair.second),
      ];
  const broken = breakIndex(bars, pair.second, opposite, top ? "down" : "up");
  if (broken !== undefined) {
    const time = toTimeString(bars[broken]!.time);
    const trade: SetupDirection = top ? "down" : "up";
    levels.push(
      { name: "Entry", price: entryBeyond(opposite, trade, tickSize), time },
      { name: "Stop", price: stopBeyond(same, trade, tickSize), time: toTimeString(bars[sameIndex]!.time) },
    );
  }
  return {
    name: top ? "micro_double_top" : "micro_double_bottom",
    range: {
      start: toTimeString(left.time),
      end: toTimeString(right.time),
    },
    levels,
  };
}

function breakIndex(
  bars: readonly Bar[],
  second: number,
  extreme: number,
  trade: SetupDirection,
): number | undefined {
  for (let index = second + 1; index < bars.length; index += 1) {
    const close = bars[index]!.close;
    const beyond = trade === "down" ? close < extreme : close > extreme;
    if (beyond) return index;
  }
  return undefined;
}

function level(
  bars: readonly Bar[],
  name: LevelName,
  price: number,
  index: number,
): Level {
  return { name, price, time: toTimeString(bars[index]!.time) };
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
