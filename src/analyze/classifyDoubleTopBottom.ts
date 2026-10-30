import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import { barRange } from "../utils/barMetrics.js";
import { pricesWithin } from "../utils/priceCluster.js";
import { entryBeyond, stopBeyond, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { findSwings, type Swing, type SwingKind } from "../utils/swings.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifyDoubleTopBottom";

const SUMMARY = "doubles={count}; last={lastName}";

/** Omitted `priceTolerance` is this fraction of the window's average bar range. */
const TOLERANCE_RATIO = 0.25;

export type ClassifyDoubleTopBottomOptions = {
  swingSpan?: number;
  tickSize?: number;
  priceTolerance?: number;
};

type Pair = {
  side: SwingKind;
  first: Swing;
  neck: Swing;
  second: Swing;
};

/** Two swing highs or lows in one price band. A miss is a single `unclear` result. */
export function classifyDoubleTopBottom(
  bars: Bar[],
  options?: ClassifyDoubleTopBottomOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyDoubleTopBottom: bars must be a non-empty array");
  }
  const { swingSpan, tickSize, priceTolerance } = resolveOptions(options);
  const tolerance = priceTolerance ?? TOLERANCE_RATIO * averageRange(bars);
  const swings = findSwings(bars, swingSpan);
  const found = [
    ...pairs(swings, "high", tolerance),
    ...pairs(swings, "low", tolerance),
  ];
  found.sort((a, b) => a.second.index - b.second.index || sideOrder(a.side) - sideOrder(b.side));
  if (found.length === 0) {
    return assemble([unclearResult(bars)]);
  }
  return assemble(found.map((pair) => toResult(bars, pair, tickSize)));
}

function resolveOptions(options?: ClassifyDoubleTopBottomOptions): {
  swingSpan: number;
  tickSize?: number;
  priceTolerance?: number;
} {
  if (options === undefined) return { swingSpan: 2 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyDoubleTopBottom: options must be an object");
  }
  return {
    swingSpan: resolveSwingSpan(options.swingSpan),
    tickSize: resolveTick(options.tickSize),
    priceTolerance: resolveTolerance(options.priceTolerance),
  };
}

function resolveSwingSpan(swingSpan: number | undefined): number {
  if (swingSpan === undefined) return 2;
  if (!Number.isInteger(swingSpan) || swingSpan < 1) {
    throw new TypeError("classifyDoubleTopBottom: swingSpan must be an integer >= 1");
  }
  return swingSpan;
}

function resolveTick(tickSize: number | undefined): number | undefined {
  if (tickSize === undefined) return undefined;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("classifyDoubleTopBottom: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function resolveTolerance(priceTolerance: number | undefined): number | undefined {
  if (priceTolerance === undefined) return undefined;
  if (!Number.isFinite(priceTolerance) || priceTolerance < 0) {
    throw new TypeError("classifyDoubleTopBottom: priceTolerance must be a finite number >= 0");
  }
  return priceTolerance;
}

function averageRange(bars: readonly Bar[]): number {
  let sum = 0;
  for (const bar of bars) sum += barRange(bar);
  return sum / bars.length;
}

function pairs(swings: readonly Swing[], side: SwingKind, tolerance: number): Pair[] {
  const opposite: SwingKind = side === "high" ? "low" : "high";
  const found: Pair[] = [];
  let after = -1;
  for (let index = 0; index + 2 < swings.length; index += 1) {
    const first = swings[index]!;
    const neck = swings[index + 1]!;
    const second = swings[index + 2]!;
    if (first.kind !== side || neck.kind !== opposite || second.kind !== side) continue;
    if (first.index <= after) continue;
    if (!pricesWithin(first.price, second.price, tolerance)) continue;
    found.push({ side, first, neck, second });
    after = second.index;
  }
  return found;
}

function sideOrder(side: SwingKind): number {
  return side === "high" ? 0 : 1;
}

function toResult(
  bars: readonly Bar[],
  pair: Pair,
  tickSize: number | undefined,
): AnalyzeResult {
  const top = pair.side === "high";
  const trade: SetupDirection = top ? "down" : "up";
  const levels: Level[] = top
    ? [
        level(bars, "Top1", pair.first),
        level(bars, "Top2", pair.second),
      ]
    : [
        level(bars, "Bottom1", pair.first),
        level(bars, "Bottom2", pair.second),
      ];
  levels.push(level(bars, "Neckline", pair.neck));
  const broken = breakIndex(bars, pair.second.index, pair.neck.price, trade);
  if (broken !== undefined) {
    levels.push(
      {
        name: "Entry",
        price: entryBeyond(pair.neck.price, trade, tickSize),
        time: toTimeString(bars[broken]!.time),
      },
      {
        name: "Stop",
        price: stopBeyond(pair.second.price, trade, tickSize),
        time: toTimeString(bars[pair.second.index]!.time),
      },
    );
  }
  return {
    name: top ? "double_top" : "double_bottom",
    range: {
      start: toTimeString(bars[pair.first.index]!.time),
      end: toTimeString(bars[pair.second.index]!.time),
    },
    levels,
  };
}

function breakIndex(
  bars: readonly Bar[],
  second: number,
  neck: number,
  trade: SetupDirection,
): number | undefined {
  for (let index = second + 1; index < bars.length; index += 1) {
    const close = bars[index]!.close;
    const beyond = trade === "down" ? close < neck : close > neck;
    if (beyond) return index;
  }
  return undefined;
}

function level(bars: readonly Bar[], name: LevelName, swing: Swing): Level {
  return { name, price: swing.price, time: toTimeString(bars[swing.index]!.time) };
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
