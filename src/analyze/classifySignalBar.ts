import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult } from "../types/analysis.js";
import { barRange, closeLocation, lowerTail, upperTail } from "../utils/barMetrics.js";
import {
  isBearTrendBar,
  isBullTrendBar,
  isDoji,
  isInsideBar,
  isOutsideBar,
} from "../utils/barPredicates.js";
import { entryBeyond, stopBeyond, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { findSwings, type Swing, type SwingKind } from "../utils/swings.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifySignalBar";

const SUMMARY = "signalBars={count}; last={lastName}";

const CLOSE_EDGE = 2 / 3;

const TAIL_RATIO = 0.25;

export type SignalBarItemEvidence = {
  inside: boolean;
  outside: boolean;
};

export type SignalBarEvidence = {
  items: SignalBarItemEvidence[];
};

export type ClassifySignalBarOptions = {
  swingSpan?: number;
  tickSize?: number;
};

type Hit = {
  index: number;
  direction: SetupDirection;
  inside: boolean;
  outside: boolean;
};

/** Qualified swing-extreme signal bars. A miss is `unclear`. */
export function classifySignalBar(
  bars: Bar[],
  options?: ClassifySignalBarOptions,
): AnalysisResult<SignalBarEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifySignalBar: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const tickSize = resolveTick(options);
  const found = hits(bars, findSwings(bars, swingSpan));
  if (found.length === 0) return assemble([unclearResult(bars)], []);
  const items = found.map((hit) => ({ inside: hit.inside, outside: hit.outside }));
  return assemble(
    found.map((hit) => toResult(bars, hit, tickSize)),
    items,
  );
}

function hits(bars: readonly Bar[], swings: readonly Swing[]): Hit[] {
  const byIndex = new Map<number, SwingKind[]>();
  for (const swing of swings) {
    const kinds = byIndex.get(swing.index) ?? [];
    kinds.push(swing.kind);
    byIndex.set(swing.index, kinds);
  }
  const found: Hit[] = [];
  for (const [index, kinds] of byIndex) {
    if (kinds.includes("high") && kinds.includes("low")) continue;
    const kind = kinds[0]!;
    const bar = bars[index]!;
    const previous = bars[index - 1];
    const inside = isInsideBar(bar, previous);
    const outside = isOutsideBar(bar, previous);
    if (!qualified(bar, kind, inside, outside)) continue;
    found.push({
      index,
      direction: kind === "low" ? "up" : "down",
      inside,
      outside,
    });
  }
  found.sort((left, right) => left.index - right.index);
  return found;
}

function qualified(
  bar: Bar,
  kind: SwingKind,
  inside: boolean,
  outside: boolean,
): boolean {
  if (isDoji(bar) || inside || outside) return false;
  const range = barRange(bar);
  if (range === 0) return false;
  const location = closeLocation(bar);
  if (kind === "low") {
    return (
      isBullTrendBar(bar) &&
      location >= CLOSE_EDGE &&
      lowerTail(bar) / range <= TAIL_RATIO
    );
  }
  return (
    isBearTrendBar(bar) &&
    location <= 1 - CLOSE_EDGE &&
    upperTail(bar) / range <= TAIL_RATIO
  );
}

function toResult(
  bars: readonly Bar[],
  hit: Hit,
  tickSize: number | undefined,
): AnalyzeResult {
  const bar = bars[hit.index]!;
  const time = toTimeString(bar.time);
  const price = hit.direction === "up" ? bar.low : bar.high;
  return {
    name: hit.direction === "up" ? "bull_signal_bar" : "bear_signal_bar",
    range: { start: time, end: time },
    levels: [
      { name: "SignalBar", price, time },
      { name: "Entry", price: entryBeyond(price, hit.direction, tickSize), time },
      { name: "Stop", price: stopBeyond(price, hit.direction, tickSize), time },
    ],
  };
}

function resolveSwingSpan(options?: ClassifySignalBarOptions): number {
  if (options === undefined) return 2;
  assertOptions(options);
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifySignalBar: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function resolveTick(options?: ClassifySignalBarOptions): number | undefined {
  if (options === undefined) return undefined;
  assertOptions(options);
  if (options.tickSize === undefined) return undefined;
  if (!Number.isFinite(options.tickSize) || options.tickSize <= 0) {
    throw new TypeError("classifySignalBar: tickSize must be a finite number > 0");
  }
  return options.tickSize;
}

function assertOptions(options: ClassifySignalBarOptions): void {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifySignalBar: options must be an object");
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

function assemble(
  results: AnalyzeResult[],
  items: SignalBarItemEvidence[],
): AnalysisResult<SignalBarEvidence> {
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
