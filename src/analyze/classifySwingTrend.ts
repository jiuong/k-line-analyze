import type { Bar } from "../types/bars.js";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { findSecondEntriesFrom } from "../utils/secondEntries.js";
import { findSwingLegs, type SwingLeg, type SwingLegDirection } from "../utils/swingLegs.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { isSingleLegTrend, barStep } from "../utils/trendLeg.js";

const FUNCTION_ID = "classifySwingTrend";

const SUMMARY_TEMPLATE =
  "trends={count}; minor={minor}; ranges={ranges}; last={lastName} from={from} to={to}";

const RANGE_SPAN_FACTOR = 1.5;
const MINOR_BAR_LIMIT = 3;
const RANGE_MIN_BARS = 3;

export type ClassifySwingTrendOptions = {
  swingSpan?: number;
  /**
   * Span for H2/L2 hinge legs when attaching marks.
   * Default `1` (majors still use `swingSpan`, default 2).
   */
  entrySwingSpan?: number;
  /** When false, skip H2/L2 mark attachment (avoids pullback re-entry). Default true. */
  attachEntryMarks?: boolean;
};

type TrendEndpoint =
  | "BullTrendStart"
  | "BullTrendEnd"
  | "BearTrendStart"
  | "BearTrendEnd";

type IndexedSegment = AnalyzeResult & {
  startIndex: number;
  endIndex: number;
};

type NestedMinor = {
  parentStart: string;
  item: AnalyzeResult;
};

/** One merged trend over swing legs (impulse indices inclusive). */
export type MergedSwingTrend = {
  direction: SwingLegDirection;
  startLegIndex: number;
  endLegIndex: number;
  nested: MergedSwingTrend[];
};

/**
 * Trend segments from findSwingLegs: same-direction impulses chain on
 * pullback + new extreme; a covering opposite leg opens a reverse trend.
 */
export function classifySwingTrend(
  bars: Bar[],
  options?: ClassifySwingTrendOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifySwingTrend: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const entrySwingSpan = resolveEntrySwingSpan(options);
  const attachMarks = options?.attachEntryMarks !== false;
  const legs = findSwingLegs(bars, swingSpan);
  if (legs.length === 0) {
    return assemble([windowResult(bars)]);
  }

  const merged = mergeLegsIntoTrends(legs, bars);
  const segments = merged.flatMap((trend) => toSegments(bars, legs, trend));
  return assemble(
    refineSegments(bars, segments, entrySwingSpan, attachMarks),
  );
}

/** Greedy left-to-right merge. Exported for unit tests of the cut rules. */
export function mergeLegsIntoTrends(
  legs: readonly SwingLeg[],
  bars: readonly Bar[],
): MergedSwingTrend[] {
  const out: MergedSwingTrend[] = [];
  let index = 0;
  while (index < legs.length) {
    const parsed = parseTrend(legs, bars, index);
    out.push(parsed.trend);
    index = parsed.nextIndex > index ? parsed.nextIndex : index + 1;
  }
  return out;
}

function parseTrend(
  legs: readonly SwingLeg[],
  bars: readonly Bar[],
  start: number,
): { trend: MergedSwingTrend; nextIndex: number } {
  const dir = legs[start]!.direction;
  let end = start;
  let guard = legs[start]!.startPrice;
  let lastExtreme = legs[start]!.endPrice;
  const nested: MergedSwingTrend[] = [];
  let cursor = start + 1;

  while (cursor < legs.length) {
    if (legs[cursor]!.direction === dir) break;

    const opposite = parseTrend(legs, bars, cursor);
    const oppFirst = legs[cursor]!;
    const oppLast = legs[opposite.trend.endLegIndex]!;
    const adverse = adverseExtreme(
      bars,
      oppFirst.startIndex,
      oppLast.endIndex,
      dir,
    );

    if (coversGuard(dir, guard, adverse)) {
      return {
        trend: { direction: dir, startLegIndex: start, endLegIndex: end, nested },
        nextIndex: cursor,
      };
    }

    const afterOpp = opposite.trend.endLegIndex + 1;
    if (afterOpp >= legs.length || legs[afterOpp]!.direction !== dir) {
      return {
        trend: { direction: dir, startLegIndex: start, endLegIndex: end, nested },
        nextIndex: cursor,
      };
    }

    const nextImpulse = legs[afterOpp]!;
    if (!makesNewExtreme(dir, lastExtreme, nextImpulse.endPrice)) {
      return {
        trend: { direction: dir, startLegIndex: start, endLegIndex: end, nested },
        nextIndex: cursor,
      };
    }

    if (opposite.trend.endLegIndex > cursor) {
      nested.push(opposite.trend);
      nested.push(...opposite.trend.nested);
    }

    end = afterOpp;
    guard = nextImpulse.startPrice;
    lastExtreme = nextImpulse.endPrice;
    cursor = afterOpp + 1;
  }

  return {
    trend: { direction: dir, startLegIndex: start, endLegIndex: end, nested },
    nextIndex: end + 1,
  };
}

function adverseExtreme(
  bars: readonly Bar[],
  fromIndex: number,
  toIndex: number,
  parentDir: SwingLegDirection,
): number {
  let extreme = parentDir === "bull" ? Infinity : -Infinity;
  const lo = Math.min(fromIndex, toIndex);
  const hi = Math.max(fromIndex, toIndex);
  for (let i = lo; i <= hi; i += 1) {
    const bar = bars[i];
    if (!bar) continue;
    if (parentDir === "bull") {
      if (bar.low < extreme) extreme = bar.low;
    } else if (bar.high > extreme) {
      extreme = bar.high;
    }
  }
  return extreme;
}

function coversGuard(
  parentDir: SwingLegDirection,
  guard: number,
  adverse: number,
): boolean {
  return parentDir === "bull" ? adverse <= guard : adverse >= guard;
}

function makesNewExtreme(
  dir: SwingLegDirection,
  priorEnd: number,
  nextEnd: number,
): boolean {
  return dir === "bull" ? nextEnd > priorEnd : nextEnd < priorEnd;
}

function toSegments(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  trend: MergedSwingTrend,
): AnalyzeResult[] {
  const parent = trendToResult(bars, legs, trend);
  const nested = trend.nested.map((child) => {
    const item = trendToResult(bars, legs, child);
    if (shouldEmitAsMinor(bars, parent, item)) {
      return asMinor(withIndices(bars, item));
    }
    return item;
  });
  return [parent, ...nested];
}

function shouldEmitAsMinor(
  bars: readonly Bar[],
  parent: AnalyzeResult,
  child: AnalyzeResult,
): boolean {
  const p = withIndices(bars, parent);
  const c = withIndices(bars, child);
  if (barCount(c) > MINOR_BAR_LIMIT) return false;
  if (!isMajorTrend(parent.name) || !isMajorTrend(child.name)) return false;
  if (parent.name === child.name) return false;
  const outer = priceSpan(bars.slice(p.startIndex, p.endIndex + 1));
  const inner = priceSpan(bars.slice(c.startIndex, c.endIndex + 1));
  return inner.low >= outer.low && inner.high <= outer.high;
}

function trendToResult(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  trend: MergedSwingTrend,
): AnalyzeResult {
  const first = legs[trend.startLegIndex]!;
  const last = legs[trend.endLegIndex]!;
  const bull = trend.direction === "bull";
  const startTime = toTimeString(bars[first.startIndex]!.time);
  const endTime = toTimeString(bars[last.endIndex]!.time);
  return {
    name: bull ? "bull_trend" : "bear_trend",
    range: { start: startTime, end: endTime },
    levels: [
      level(
        bull ? "BullTrendStart" : "BearTrendStart",
        first.startPrice,
        startTime,
      ),
      level(bull ? "BullTrendEnd" : "BearTrendEnd", last.endPrice, endTime),
    ],
  };
}

function resolveSwingSpan(options?: ClassifySwingTrendOptions): number {
  if (options === undefined) return 2;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifySwingTrend: options must be an object");
  }
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifySwingTrend: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function resolveEntrySwingSpan(options?: ClassifySwingTrendOptions): number {
  if (options === undefined || options.entrySwingSpan === undefined) return 1;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifySwingTrend: options must be an object");
  }
  if (!Number.isInteger(options.entrySwingSpan) || options.entrySwingSpan < 1) {
    throw new TypeError(
      "classifySwingTrend: entrySwingSpan must be an integer >= 1",
    );
  }
  return options.entrySwingSpan;
}

function refineSegments(
  bars: Bar[],
  segments: AnalyzeResult[],
  entrySwingSpan: number,
  attachMarks: boolean,
): AnalyzeResult[] {
  const step = barStep(bars);
  const ranged = segments.map((segment) => markTradingRange(bars, segment, step));
  const nested = nestMinorTrends(bars, ranged);
  return attachMarks ? markEntryLevels(bars, nested, entrySwingSpan) : nested;
}

function markEntryLevels(
  bars: Bar[],
  results: AnalyzeResult[],
  entrySwingSpan: number,
): AnalyzeResult[] {
  const primaries = results.filter(
    (item) => item.name === "bull_trend" || item.name === "bear_trend",
  );
  if (primaries.length === 0) return results;

  const hits = findSecondEntriesFrom(bars, results, undefined, {
    entrySwingSpan,
    functionId: FUNCTION_ID,
  });

  const byStart = new Map<string, Level[]>();
  for (const hit of hits) {
    const broke = bars[hit.breakIndex]!;
    const time = toTimeString(broke.time);
    const host = primaries.find((item) => {
      const end = item.range.end ?? item.range.start;
      return time >= item.range.start && time <= end;
    });
    if (host === undefined) continue;
    const levelMark: Level = {
      name: hit.bull ? "H2" : "L2",
      price: hit.entryPrice,
      time,
    };
    const list = byStart.get(host.range.start);
    if (list) list.push(levelMark);
    else byStart.set(host.range.start, [levelMark]);
  }
  if (byStart.size === 0) return results;
  return results.map((item) => {
    const extras = byStart.get(item.range.start);
    if (extras === undefined) return item;
    return { ...item, levels: [...item.levels, ...extras] };
  });
}

function markTradingRange(
  bars: Bar[],
  segment: AnalyzeResult,
  step: number | null,
): IndexedSegment {
  const indexed = withIndices(bars, segment);
  if (!isMajorTrend(indexed.name) || barCount(indexed) < RANGE_MIN_BARS) {
    return indexed;
  }

  const slice = bars.slice(indexed.startIndex, indexed.endIndex + 1);
  const span = priceSpan(slice);
  if (
    span.high - span.low <= RANGE_SPAN_FACTOR * span.avgHeight &&
    !isSingleLegTrend(slice, { ignoreTimeHoles: true, timeStep: step })
  ) {
    return { ...indexed, ...tradingRange(indexed, slice) };
  }
  return indexed;
}

function tradingRange(segment: IndexedSegment, slice: readonly Bar[]): AnalyzeResult {
  const high = extreme(slice, "high");
  const low = extreme(slice, "low");
  const rangeHigh = level("RangeHigh", high.price, toTimeString(high.time));
  const rangeLow = level("RangeLow", low.price, toTimeString(low.time));
  return {
    name: "trading_range",
    range: segment.range,
    levels: high.time <= low.time ? [rangeHigh, rangeLow] : [rangeLow, rangeHigh],
  };
}

function nestMinorTrends(
  bars: Bar[],
  segments: IndexedSegment[],
): AnalyzeResult[] {
  const primaries = segments.filter(
    (item) =>
      item.name === "bull_trend" ||
      item.name === "bear_trend" ||
      item.name === "trading_range" ||
      item.name === "unclear",
  );
  const alreadyMinor = segments.filter(
    (item) =>
      item.name === "minor_bull_trend" || item.name === "minor_bear_trend",
  );
  const working = [...primaries];
  const minors: NestedMinor[] = alreadyMinor.map((item) => ({
    parentStart: findParentStart(working, item) ?? item.range.start,
    item: toResult(item),
  }));
  let changed = true;

  while (changed) {
    changed = false;
    for (let index = 1; index < working.length - 1; index += 1) {
      const mid = working[index]!;
      const left = working[index - 1]!;
      const right = working[index + 1]!;
      if (!canNest(bars, left, mid, right)) continue;

      const parent = mergeTrends(left, right);
      minors.push({ parentStart: parent.range.start, item: asMinor(mid) });
      working.splice(index - 1, 3, parent);
      changed = true;
      break;
    }
  }

  const results: AnalyzeResult[] = [];
  for (const primary of working) {
    results.push(toResult(primary));
    for (const minor of minors) {
      if (minor.parentStart === primary.range.start) {
        results.push(minor.item);
      }
    }
  }
  return results;
}

function findParentStart(
  primaries: readonly IndexedSegment[],
  child: IndexedSegment,
): string | undefined {
  const host = primaries.find((item) => {
    if (!isMajorTrend(item.name)) return false;
    const end = item.range.end ?? item.range.start;
    const childEnd = child.range.end ?? child.range.start;
    return child.range.start >= item.range.start && childEnd <= end;
  });
  return host?.range.start;
}

function canNest(
  bars: Bar[],
  left: IndexedSegment,
  mid: IndexedSegment,
  right: IndexedSegment,
): boolean {
  if (!isMajorTrend(left.name) || !isMajorTrend(mid.name) || !isMajorTrend(right.name)) {
    return false;
  }
  if (barCount(mid) > MINOR_BAR_LIMIT) return false;
  if (left.name !== right.name || left.name === mid.name) return false;
  const parentBars = right.endIndex - left.startIndex + 1;
  if (parentBars <= barCount(mid)) return false;
  return priceContained(bars, left, mid, right);
}

function priceContained(
  bars: Bar[],
  left: IndexedSegment,
  mid: IndexedSegment,
  right: IndexedSegment,
): boolean {
  const outer = priceSpan([
    ...bars.slice(left.startIndex, left.endIndex + 1),
    ...bars.slice(right.startIndex, right.endIndex + 1),
  ]);
  const inner = priceSpan(bars.slice(mid.startIndex, mid.endIndex + 1));
  return inner.low >= outer.low && inner.high <= outer.high;
}

function mergeTrends(left: IndexedSegment, right: IndexedSegment): IndexedSegment {
  const bull = left.name === "bull_trend";
  return {
    name: left.name,
    range: { start: left.range.start, end: right.range.end },
    levels: bull
      ? [
          levelNamed(left, "BullTrendStart"),
          levelNamed(right, "BullTrendEnd"),
        ]
      : [
          levelNamed(left, "BearTrendStart"),
          levelNamed(right, "BearTrendEnd"),
        ],
    startIndex: left.startIndex,
    endIndex: right.endIndex,
  };
}

function asMinor(segment: IndexedSegment | AnalyzeResult): AnalyzeResult {
  const name =
    segment.name === "bull_trend" || segment.name === "minor_bull_trend"
      ? "minor_bull_trend"
      : "minor_bear_trend";
  return {
    name,
    range: segment.range,
    levels: segment.levels,
  };
}

function level(name: LevelName, price: number, time: string): Level {
  return { name, price, time };
}

function levelNamed(item: AnalyzeResult, name: TrendEndpoint): Level {
  const found = item.levels.find((entry) => entry.name === name);
  if (!found) {
    throw new Error(`classifySwingTrend: trend is missing ${name}`);
  }
  return found;
}

function windowResult(bars: Bar[]): AnalyzeResult {
  return {
    name: "unclear",
    range: {
      start: toTimeString(bars[0]!.time),
      end: toTimeString(bars[bars.length - 1]!.time),
    },
    levels: [],
  };
}

function withIndices(bars: Bar[], segment: AnalyzeResult): IndexedSegment {
  return {
    ...segment,
    startIndex: barIndexAt(bars, segment.range.start, FUNCTION_ID),
    endIndex: barIndexAt(bars, segment.range.end ?? segment.range.start, FUNCTION_ID),
  };
}

function barCount(segment: IndexedSegment): number {
  return segment.endIndex - segment.startIndex + 1;
}

function isMajorTrend(name: string): boolean {
  return name === "bull_trend" || name === "bear_trend";
}

function priceSpan(bars: readonly Bar[]): { high: number; low: number; avgHeight: number } {
  let high = -Infinity;
  let low = Infinity;
  let heightSum = 0;
  for (const bar of bars) {
    if (bar.high > high) high = bar.high;
    if (bar.low < low) low = bar.low;
    heightSum += bar.high - bar.low;
  }
  return { high, low, avgHeight: bars.length === 0 ? 0 : heightSum / bars.length };
}

function extreme(
  bars: readonly Bar[],
  side: "high" | "low",
): { price: number; time: number } {
  let chosen = bars[0]!;
  for (const bar of bars) {
    const better =
      side === "high" ? bar.high > chosen.high : bar.low < chosen.low;
    if (better) chosen = bar;
  }
  return { price: chosen[side], time: chosen.time };
}

function toResult(segment: IndexedSegment): AnalyzeResult {
  return {
    name: segment.name,
    range: segment.range,
    levels: segment.levels,
  };
}

function assemble(results: AnalyzeResult[]): AnalysisResult<Record<string, never>> {
  const last = closingItem(results);
  const times = endpointTimes(last);

  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY_TEMPLATE, {
      count: countNamed(results, ["bull_trend", "bear_trend"]),
      minor: countNamed(results, ["minor_bull_trend", "minor_bear_trend"]),
      ranges: countNamed(results, ["trading_range"]),
      lastName: last.name,
      ...times,
    }),
    confidence: 1,
    evidence: {},
  };
}

function closingItem(results: AnalyzeResult[]): AnalyzeResult {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const item = results[index]!;
    if (item.name !== "minor_bull_trend" && item.name !== "minor_bear_trend") {
      return item;
    }
  }
  return results[results.length - 1]!;
}

function countNamed(results: readonly AnalyzeResult[], names: readonly string[]): number {
  return results.filter((item) => names.includes(item.name)).length;
}

function endpointTimes(item: AnalyzeResult): { from: string; to: string } {
  const byName = new Map(item.levels.map((entry) => [entry.name, entry.time]));
  if (item.name === "bull_trend" || item.name === "minor_bull_trend") {
    return {
      from: byName.get("BullTrendStart") ?? "-",
      to: byName.get("BullTrendEnd") ?? "-",
    };
  }
  if (item.name === "bear_trend" || item.name === "minor_bear_trend") {
    return {
      from: byName.get("BearTrendStart") ?? "-",
      to: byName.get("BearTrendEnd") ?? "-",
    };
  }
  if (item.name === "trading_range") {
    return { from: item.range.start, to: item.range.end ?? "-" };
  }
  return { from: "-", to: "-" };
}
