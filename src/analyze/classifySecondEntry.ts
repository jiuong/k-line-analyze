import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { projectFibExtension } from "../utils/fibonacci.js";
import { countedEntryLabel, findSecondEntriesFrom } from "../utils/secondEntries.js";
import { stopBeyond, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";
import { classifySwingTrend } from "./classifySwingTrend.js";

const FUNCTION_ID = "classifySecondEntry";

const SUMMARY = "entries={count}; last={lastName}";

const TP_RATIOS = [1, 1.272, 1.414, 1.618] as const;
const TP_NAMES = ["TP1", "TP2", "TP3", "TP4"] as const;

export type ClassifySecondEntryOptions = {
  tickSize?: number;
  /**
   * Which hinge to emit in each pullback window.
   * Integer `>= 1`. Default `2` (`high2` / `low2`).
   */
  entryCount?: number;
  /** Span for `classifySwingTrend` majors. Default `2`. */
  majorSwingSpan?: number;
  /** Span for pullback-window hinge legs. Default `1`. */
  entrySwingSpan?: number;
  /**
   * Alias for `majorSwingSpan` when that field is omitted (backward compat).
   * Does not change `entrySwingSpan` default.
   */
  swingSpan?: number;
};

/**
 * Pullback-scoped counted entries (`highN` / `lowN`) with fib-extension targets.
 * Default N is 2. A miss is `unclear`.
 *
 * Majors use a coarser span (default 2); entry hinges use a finer span
 * (default 1).
 */
export function classifySecondEntry(
  bars: Bar[],
  options?: ClassifySecondEntryOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifySecondEntry: bars must be a non-empty array");
  }
  const tickSize = resolveTick(options);
  const entryCount = resolveEntryCount(options);
  const majorSwingSpan = resolveMajorSwingSpan(options);
  const entrySwingSpan = resolveEntrySwingSpan(options);
  const swing = classifySwingTrend(bars, {
    swingSpan: majorSwingSpan,
    attachEntryMarks: false,
  });
  const hits = findSecondEntriesFrom(bars, swing.results, undefined, {
    tickSize,
    entryCount,
    entrySwingSpan,
    functionId: FUNCTION_ID,
  });
  if (hits.length === 0) return assemble([unclearResult(bars)]);
  return assemble(hits.map((hit) => toResult(bars, hit, tickSize, entryCount)));
}

function toResult(
  bars: readonly Bar[],
  hit: ReturnType<typeof findSecondEntriesFrom>[number],
  tickSize: number | undefined,
  entryCount: number,
): AnalyzeResult {
  const prior = bars[hit.priorIndex]!;
  const broke = bars[hit.breakIndex]!;
  const breakTime = toTimeString(broke.time);
  const priorTime = toTimeString(prior.time);
  const direction: SetupDirection = hit.bull ? "up" : "down";
  const signalPrice = hit.bull ? broke.high : broke.low;
  const p1Time = toTimeString(bars[hit.p1Index]!.time);
  const tps = projectFibExtension(hit.p1Price, hit.p2Price, hit.p3Price, TP_RATIOS);
  const levels: Level[] = [
    { name: "SignalBar", price: signalPrice, time: breakTime },
    { name: "Entry", price: hit.entryPrice, time: breakTime },
    {
      name: "Stop",
      price: stopBeyond(hit.p1Price, direction, tickSize),
      time: p1Time,
    },
    {
      name: "P1",
      price: hit.p1Price,
      time: p1Time,
    },
    {
      name: "P2",
      price: hit.p2Price,
      time: toTimeString(bars[hit.p2Index]!.time),
    },
    { name: "P3", price: hit.p3Price, time: priorTime },
  ];
  for (let index = 0; index < TP_NAMES.length; index += 1) {
    const level = tps[index]!;
    levels.push({
      name: TP_NAMES[index]!,
      price: level.price,
      time: breakTime,
    });
  }
  return {
    name: countedEntryLabel(hit.bull, entryCount),
    range: { start: priorTime, end: breakTime },
    levels,
  };
}

function resolveTick(options?: ClassifySecondEntryOptions): number | undefined {
  if (options === undefined) return undefined;
  assertOptions(options);
  if (options.tickSize === undefined) return undefined;
  if (!Number.isFinite(options.tickSize) || options.tickSize <= 0) {
    throw new TypeError("classifySecondEntry: tickSize must be a finite number > 0");
  }
  return options.tickSize;
}

function resolveEntryCount(options?: ClassifySecondEntryOptions): number {
  if (options === undefined || options.entryCount === undefined) return 2;
  assertOptions(options);
  if (!Number.isInteger(options.entryCount) || options.entryCount < 1) {
    throw new TypeError(
      "classifySecondEntry: entryCount must be an integer >= 1",
    );
  }
  return options.entryCount;
}

function resolveMajorSwingSpan(options?: ClassifySecondEntryOptions): number {
  if (options === undefined) return 2;
  assertOptions(options);
  const raw =
    options.majorSwingSpan !== undefined
      ? options.majorSwingSpan
      : options.swingSpan !== undefined
        ? options.swingSpan
        : 2;
  if (!Number.isInteger(raw) || raw < 1) {
    throw new TypeError(
      "classifySecondEntry: majorSwingSpan must be an integer >= 1",
    );
  }
  return raw;
}

function resolveEntrySwingSpan(options?: ClassifySecondEntryOptions): number {
  if (options === undefined || options.entrySwingSpan === undefined) return 1;
  assertOptions(options);
  if (!Number.isInteger(options.entrySwingSpan) || options.entrySwingSpan < 1) {
    throw new TypeError(
      "classifySecondEntry: entrySwingSpan must be an integer >= 1",
    );
  }
  return options.entrySwingSpan;
}

function assertOptions(options: ClassifySecondEntryOptions): void {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifySecondEntry: options must be an object");
  }
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
