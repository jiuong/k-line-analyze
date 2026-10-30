import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { FOLLOW_THROUGH_BARS, isDoji } from "../utils/barPredicates.js";
import { fillSummary } from "../utils/summary.js";
import type { SwingLeg } from "../utils/swingLegs.js";
import { toTimeString } from "../utils/time.js";
import { walkSingleLegs } from "../utils/trendLeg.js";
import { readSwingLegs } from "./classifySwingLeg.js";
import { mergeLegsIntoTrends, type MergedSwingTrend } from "./classifySwingTrend.js";

const FUNCTION_ID = "classifyTradingRange";

const SUMMARY =
  "ranges={count}; broad={broad}; tight={tight}; barbwire={barbwire}; breakout={breakout}; last={lastName} from={from} to={to}";

export type ClassifyTradingRangeOptions = {
  swingSpan?: number;
  minBroadBars?: number;
  maxBoundaryDriftRatio?: number;
  legRatioMax?: number;
  followThroughBars?: number;
  tightHeightMult?: number;
  tightOverlapRatio?: number;
  pairOverlapRatio?: number;
  tightMinBars?: number;
  barbwireTailRatio?: number;
  dojiBodyRatio?: number;
  barbwireMinBars?: number;
  breakoutModeMinBars?: number;
};

type ResolvedOptions = Required<ClassifyTradingRangeOptions>;

export type TradingRangeSegmentEvidence = {
  testsHigh: number;
  testsLow: number;
  failedBreakouts: number;
  boundaryDriftHigh: number;
  boundaryDriftLow: number;
  height: number;
};

export type TradingRangeEvidence = {
  segments: TradingRangeSegmentEvidence[];
};

type Segment = {
  name: AnalysisLabel;
  start: number;
  end: number;
};

const LEVEL_BAND_RATIO = 0.15;
const TRUE_BREAK_DISTANCE = 1.5;

const TIGHT_LABELS = new Set<AnalysisLabel>([
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
]);

const DEFAULTS: ResolvedOptions = {
  swingSpan: 2,
  minBroadBars: 8,
  maxBoundaryDriftRatio: 0.2,
  legRatioMax: 2,
  followThroughBars: FOLLOW_THROUGH_BARS,
  tightHeightMult: 2.5,
  tightOverlapRatio: 0.7,
  pairOverlapRatio: 0.5,
  tightMinBars: 3,
  barbwireTailRatio: 0.5,
  dojiBodyRatio: 0.25,
  barbwireMinBars: 3,
  breakoutModeMinBars: 20,
};

export function classifyTradingRange(
  bars: Bar[],
  options?: ClassifyTradingRangeOptions,
): AnalysisResult<TradingRangeEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyTradingRange: bars must be a non-empty array");
  }
  const resolved = resolveOptions(options);
  const legs = readSwingLegs(bars, resolved.swingSpan);
  const broad = findBroadSegments(bars, legs, resolved);
  const tight = findTightSegments(bars, resolved);
  const rangedTight = tight.filter((segment) => keepTight(bars, segment, resolved));
  const tightKeys = new Set(rangedTight.map((segment) => keyOf(segment)));
  const keptBroad = broad.filter((segment) => !tightKeys.has(keyOf(segment)));
  const segments = resolveOverlaps(bars, [...keptBroad, ...rangedTight]);

  if (segments.length === 0) {
    return {
      functionId: FUNCTION_ID,
      results: [unclearResult(bars)],
      summary: fillSummary(SUMMARY, {
        count: 0,
        broad: 0,
        tight: 0,
        barbwire: 0,
        breakout: 0,
        lastName: "unclear",
        from: "-",
        to: "-",
      }),
      confidence: 1,
      evidence: { segments: [] },
    };
  }

  const results = segments.map((segment) => toAnalyzeResult(bars, segment));
  const evidence = segments.map((segment) => segmentEvidence(bars, legs, segment));
  const last = results[results.length - 1]!;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, {
      count: results.length,
      broad: countName(results, "broad_trading_range"),
      tight: countName(results, "tight_trading_range"),
      barbwire: countName(results, "barbwire"),
      breakout: countName(results, "breakout_mode"),
      lastName: last.name,
      from: last.range.start,
      to: last.range.end ?? "-",
    }),
    confidence: 1,
    evidence: { segments: evidence },
  };
}

function resolveOptions(options: ClassifyTradingRangeOptions | undefined): ResolvedOptions {
  const resolved = { ...DEFAULTS };
  if (!options) return resolved;
  for (const key of Object.keys(DEFAULTS) as (keyof ResolvedOptions)[]) {
    const value = options[key];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`classifyTradingRange: ${key} must be a finite number`);
    }
    resolved[key] = value;
  }
  assertInteger(resolved.swingSpan, "swingSpan");
  assertInteger(resolved.minBroadBars, "minBroadBars");
  assertInteger(resolved.followThroughBars, "followThroughBars");
  assertInteger(resolved.tightMinBars, "tightMinBars");
  assertInteger(resolved.barbwireMinBars, "barbwireMinBars");
  assertInteger(resolved.breakoutModeMinBars, "breakoutModeMinBars");
  assertPositive(resolved.maxBoundaryDriftRatio, "maxBoundaryDriftRatio");
  assertPositive(resolved.tightHeightMult, "tightHeightMult");
  assertPositive(resolved.tightOverlapRatio, "tightOverlapRatio");
  assertPositive(resolved.pairOverlapRatio, "pairOverlapRatio");
  assertPositive(resolved.barbwireTailRatio, "barbwireTailRatio");
  assertPositive(resolved.dojiBodyRatio, "dojiBodyRatio");
  if (resolved.legRatioMax < 1) {
    throw new TypeError("classifyTradingRange: legRatioMax must be >= 1");
  }
  return resolved;
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`classifyTradingRange: ${name} must be an integer >= 1`);
  }
}

function assertPositive(value: number, name: string): void {
  if (value <= 0) {
    throw new TypeError(`classifyTradingRange: ${name} must be > 0`);
  }
}

type Pivot = { index: number; price: number };

function findBroadSegments(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  options: ResolvedOptions,
): Segment[] {
  const blocked = blockedLegIndexes(mergeLegsIntoTrends(legs, bars));
  const found: Segment[] = [];
  for (const run of freeRuns(legs.length, blocked)) {
    found.push(...scanLegRun(bars, legs, run, options));
  }
  return found;
}

function blockedLegIndexes(trends: readonly MergedSwingTrend[]): Set<number> {
  const blocked = new Set<number>();
  const walk = (trend: MergedSwingTrend): void => {
    if (trend.endLegIndex > trend.startLegIndex) {
      for (let index = trend.startLegIndex; index <= trend.endLegIndex; index += 1) {
        blocked.add(index);
      }
    }
    for (const child of trend.nested) walk(child);
  };
  for (const trend of trends) walk(trend);
  return blocked;
}

function freeRuns(count: number, blocked: ReadonlySet<number>): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (blocked.has(index)) {
      if (current.length > 0) runs.push(current);
      current = [];
      continue;
    }
    current.push(index);
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

function scanLegRun(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  run: readonly number[],
  options: ResolvedOptions,
): Segment[] {
  const found: Segment[] = [];
  let cursor = 0;
  while (cursor < run.length) {
    let end = cursor;
    let validEnd = -1;
    while (end < run.length) {
      if (
        end > cursor &&
        followThroughBlocks(bars, legs, run[cursor]!, run[end - 1]!, run[end]!, options)
      ) {
        break;
      }
      const slice = legs.slice(run[cursor]!, run[end]! + 1);
      if (broadStructure(bars, slice, options)) validEnd = end;
      else if (validEnd >= 0) break;
      end += 1;
    }
    if (validEnd < 0) {
      cursor += 1;
      continue;
    }
    const startLeg = legs[run[cursor]!]!;
    const endLeg = legs[run[validEnd]!]!;
    found.push({
      name: "broad_trading_range",
      start: startLeg.startIndex,
      end: endLeg.endIndex,
    });
    const endBar = endLeg.endIndex;
    cursor = validEnd + 1;
    while (cursor < run.length && legs[run[cursor]!]!.startIndex <= endBar) cursor += 1;
  }
  return found;
}

function followThroughBlocks(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  startLeg: number,
  acceptedLeg: number,
  nextLeg: number,
  options: ResolvedOptions,
): boolean {
  const shelf = shelfOf(legs.slice(startLeg, acceptedLeg + 1));
  if (!shelf) return false;
  const from = legs[acceptedLeg]!.endIndex + 1;
  const until = legs[nextLeg]!.endIndex;
  const count = options.followThroughBars;
  for (let index = from; index + count - 1 <= until; index += 1) {
    if (followThroughStarts(bars, index, shelf.high, shelf.low, count)) return true;
  }
  return false;
}

function broadStructure(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  options: ResolvedOptions,
): boolean {
  if (legs.length === 0) return false;
  const start = legs[0]!.startIndex;
  const end = legs[legs.length - 1]!.endIndex;
  if (end - start + 1 < options.minBroadBars) return false;
  const { highs, lows } = pivotsOf(legs);
  if (highs.length < 2 || lows.length < 2) return false;
  if (!legs.some((leg) => leg.direction === "bull")) return false;
  if (!legs.some((leg) => leg.direction === "bear")) return false;
  const height = sliceHeight(bars, start, end);
  if (height <= 0) return false;
  if (!boundariesHold(highs, lows, height, options.maxBoundaryDriftRatio)) return false;
  return legSizesHold(legs, options.legRatioMax);
}

function boundariesHold(
  highs: readonly Pivot[],
  lows: readonly Pivot[],
  height: number,
  ratio: number,
): boolean {
  const openHigh = highs[0]!.price;
  const openLow = lows[0]!.price;
  const closeHigh = highs[highs.length - 1]!.price;
  const closeLow = lows[lows.length - 1]!.price;
  if (!(Math.abs(closeHigh - openHigh) / height < ratio)) return false;
  if (!(Math.abs(closeLow - openLow) / height < ratio)) return false;
  return (
    highs.every((pivot) => Math.abs(pivot.price - openHigh) / height < ratio) &&
    lows.every((pivot) => Math.abs(pivot.price - openLow) / height < ratio)
  );
}

function legSizesHold(legs: readonly SwingLeg[], legRatioMax: number): boolean {
  const ups = legs
    .filter((leg) => leg.direction === "bull")
    .map((leg) => leg.endPrice - leg.startPrice);
  const downs = legs
    .filter((leg) => leg.direction === "bear")
    .map((leg) => leg.startPrice - leg.endPrice);
  if (ups.length === 0 || downs.length === 0) return false;
  const up = median(ups);
  const down = median(downs);
  if (up <= 0 || down <= 0) return false;
  return Math.max(up, down) / Math.min(up, down) <= legRatioMax;
}

function pivotsOf(legs: readonly SwingLeg[]): { highs: Pivot[]; lows: Pivot[] } {
  const highs = new Map<number, number>();
  const lows = new Map<number, number>();
  for (const leg of legs) {
    if (leg.direction === "bull") {
      lows.set(leg.startIndex, leg.startPrice);
      highs.set(leg.endIndex, leg.endPrice);
    } else {
      highs.set(leg.startIndex, leg.startPrice);
      lows.set(leg.endIndex, leg.endPrice);
    }
  }
  return { highs: sortedPivots(highs), lows: sortedPivots(lows) };
}

function pivotsInside(
  legs: readonly SwingLeg[],
  start: number,
  end: number,
): { highs: Pivot[]; lows: Pivot[] } {
  const { highs, lows } = pivotsOf(legs);
  return {
    highs: highs.filter((pivot) => pivot.index >= start && pivot.index <= end),
    lows: lows.filter((pivot) => pivot.index >= start && pivot.index <= end),
  };
}

function sortedPivots(points: ReadonlyMap<number, number>): Pivot[] {
  return [...points.entries()]
    .map(([index, price]) => ({ index, price }))
    .sort((left, right) => left.index - right.index);
}

function shelfOf(legs: readonly SwingLeg[]): { high: number; low: number } | null {
  const { highs, lows } = pivotsOf(legs);
  if (highs.length === 0 || lows.length === 0) return null;
  return {
    high: Math.max(...highs.map((pivot) => pivot.price)),
    low: Math.min(...lows.map((pivot) => pivot.price)),
  };
}

function followThroughStarts(
  bars: readonly Bar[],
  index: number,
  shelfHigh: number,
  shelfLow: number,
  count: number,
): boolean {
  if (index + count > bars.length) return false;
  let above = true;
  let below = true;
  for (let i = index; i < index + count; i++) {
    const close = bars[i]!.close;
    if (close <= shelfHigh) above = false;
    if (close >= shelfLow) below = false;
  }
  return above || below;
}

function findTightSegments(bars: readonly Bar[], options: ResolvedOptions): Segment[] {
  const found: Segment[] = [];
  const min = options.tightMinBars;
  let i = 0;
  while (i < bars.length) {
    if (i + min - 1 >= bars.length || !isTight(bars, i, i + min - 1, options)) {
      i += 1;
      continue;
    }
    let end = i + min - 1;
    while (end + 1 < bars.length && canExtendTight(bars, i, end, options)) end += 1;
    found.push({ name: tightLabel(bars, i, end, options), start: i, end });
    i = end + 1;
  }
  return found;
}

function canExtendTight(
  bars: readonly Bar[],
  start: number,
  end: number,
  options: ResolvedOptions,
): boolean {
  const next = end + 1;
  const edges = separatedEdges(bars, start, end);
  if (edges && breaksEdge(bars[next]!, edges)) return falseBreak(bars, next, edges);
  if (closeInside(bars, start, end, next)) {
    return isTight(bars, start, next, options, true);
  }
  return isTight(bars, start, next, options, false);
}

function breaksEdge(bar: Bar, edges: RangeEdges): boolean {
  return bar.high > edges.high || bar.low < edges.low;
}

function falseBreak(bars: readonly Bar[], index: number, edges: RangeEdges): boolean {
  const height = edges.high - edges.low;
  if (height <= 0) return false;
  const bar = bars[index]!;
  const distance = Math.max(bar.high - edges.high, edges.low - bar.low) / height;
  if (distance >= TRUE_BREAK_DISTANCE) return false;
  const follow = bars.slice(index + 1, index + 3);
  return follow.some((item) => item.close <= edges.high && item.close >= edges.low);
}

function closeInside(
  bars: readonly Bar[],
  start: number,
  end: number,
  index: number,
): boolean {
  let high = bars[start]!.high;
  let low = bars[start]!.low;
  for (let i = start; i <= end; i++) {
    high = Math.max(high, bars[i]!.high);
    low = Math.min(low, bars[i]!.low);
  }
  const close = bars[index]!.close;
  return close <= high && close >= low;
}

function isTight(
  bars: readonly Bar[],
  start: number,
  end: number,
  options: ResolvedOptions,
  ignoreHeight = false,
): boolean {
  const length = end - start + 1;
  if (length < options.tightMinBars) return false;
  const ranges: number[] = [];
  for (let i = start; i <= end; i++) ranges.push(barHeight(bars[i]!));
  const height = sliceHeight(bars, start, end);
  const mid = median(ranges);
  if (mid <= 0) {
    if (height > 0) return false;
  } else if (!ignoreHeight && height > options.tightHeightMult * mid) {
    return false;
  }
  let pairs = 0;
  let overlapped = 0;
  for (let i = start; i < end; i++) {
    pairs += 1;
    if (pairOverlap(bars[i]!, bars[i + 1]!) >= options.pairOverlapRatio) overlapped += 1;
  }
  return pairs > 0 && overlapped / pairs >= options.tightOverlapRatio;
}

function tightLabel(
  bars: readonly Bar[],
  start: number,
  end: number,
  options: ResolvedOptions,
): AnalysisLabel {
  const length = end - start + 1;
  if (length >= options.breakoutModeMinBars) return "breakout_mode";
  if (length >= options.barbwireMinBars && isBarbwire(bars, start, end, options)) {
    return "barbwire";
  }
  return "tight_trading_range";
}

function isBarbwire(
  bars: readonly Bar[],
  start: number,
  end: number,
  options: ResolvedOptions,
): boolean {
  let doji = false;
  for (let i = start; i <= end; i++) {
    const bar = bars[i]!;
    const height = barHeight(bar);
    if (height <= 0) return false;
    const body = Math.abs(bar.close - bar.open);
    if (isDoji(bar, options.dojiBodyRatio)) doji = true;
    if ((height - body) / height < options.barbwireTailRatio) return false;
  }
  return doji;
}

function pairOverlap(left: Bar, right: Bar): number {
  const overlap = Math.min(left.high, right.high) - Math.max(left.low, right.low);
  const leftHeight = barHeight(left);
  const rightHeight = barHeight(right);
  const denom = Math.min(leftHeight, rightHeight);
  if (denom <= 0) {
    const point = leftHeight <= 0 ? left.close : right.close;
    const other = leftHeight <= 0 ? right : left;
    return point >= other.low && point <= other.high ? 1 : 0;
  }
  if (overlap <= 0) return 0;
  return overlap / denom;
}

function segmentEvidence(
  bars: readonly Bar[],
  legs: readonly SwingLeg[],
  segment: Segment,
): TradingRangeSegmentEvidence {
  const { highs, lows } = pivotsInside(legs, segment.start, segment.end);
  const shelfHigh = highs.length > 0 ? Math.max(...highs.map((pivot) => pivot.price)) : null;
  const shelfLow = lows.length > 0 ? Math.min(...lows.map((pivot) => pivot.price)) : null;
  let failedBreakouts = 0;
  if (shelfHigh !== null && shelfLow !== null) {
    for (let i = segment.start; i <= segment.end; i++) {
      const bar = bars[i]!;
      if (bar.high > shelfHigh && bar.close <= shelfHigh) failedBreakouts += 1;
      if (bar.low < shelfLow && bar.close >= shelfLow) failedBreakouts += 1;
    }
  }
  return {
    testsHigh: highs.length,
    testsLow: lows.length,
    failedBreakouts,
    boundaryDriftHigh:
      highs.length >= 2 ? highs[highs.length - 1]!.price - highs[0]!.price : 0,
    boundaryDriftLow: lows.length >= 2 ? lows[lows.length - 1]!.price - lows[0]!.price : 0,
    height: sliceHeight(bars, segment.start, segment.end),
  };
}

function toAnalyzeResult(bars: readonly Bar[], segment: Segment): AnalyzeResult {
  const levels = TIGHT_LABELS.has(segment.name)
    ? tightLevels(bars, segment.start, segment.end)
    : extremeLevels(bars, segment.start, segment.end);
  return {
    name: segment.name,
    range: {
      start: toTimeString(bars[segment.start]!.time),
      end: toTimeString(bars[segment.end]!.time),
    },
    levels,
  };
}

function extremeLevels(bars: readonly Bar[], start: number, end: number): Level[] {
  let highIndex = start;
  let lowIndex = start;
  for (let i = start; i <= end; i++) {
    if (bars[i]!.high > bars[highIndex]!.high) highIndex = i;
    if (bars[i]!.low < bars[lowIndex]!.low) lowIndex = i;
  }
  const high: Level = {
    name: "RangeHigh",
    price: bars[highIndex]!.high,
    time: toTimeString(bars[highIndex]!.time),
  };
  const low: Level = {
    name: "RangeLow",
    price: bars[lowIndex]!.low,
    time: toTimeString(bars[lowIndex]!.time),
  };
  return highIndex <= lowIndex ? [high, low] : [low, high];
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

function sliceHeight(bars: readonly Bar[], start: number, end: number): number {
  let high = bars[start]!.high;
  let low = bars[start]!.low;
  for (let i = start; i <= end; i++) {
    high = Math.max(high, bars[i]!.high);
    low = Math.min(low, bars[i]!.low);
  }
  return high - low;
}

function barHeight(bar: Bar): number {
  return bar.high - bar.low;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function countName(results: readonly AnalyzeResult[], name: AnalysisLabel): number {
  return results.filter((result) => result.name === name).length;
}

function keepTight(
  bars: readonly Bar[],
  segment: Segment,
  options: ResolvedOptions,
): boolean {
  if (!separatedEdges(bars, segment.start, segment.end)) return false;
  if (isBarbwire(bars, segment.start, segment.end, options)) return true;
  return oppositeLegs(bars.slice(segment.start, segment.end + 1));
}

function oppositeLegs(slice: readonly Bar[]): boolean {
  const directions = new Set<"bull" | "bear">();
  for (const run of walkSingleLegs(slice)) directions.add(run.direction);
  return directions.has("bull") && directions.has("bear");
}

type Edge = { price: number; time: number };
type RangeEdges = { high: number; highTime: number; low: number; lowTime: number };
type Touch = { index: number; price: number; time: number };

function separatedEdges(bars: readonly Bar[], start: number, end: number): RangeEdges | null {
  const slice = bars.slice(start, end + 1);
  const band = medianHeight(slice) * LEVEL_BAND_RATIO;
  const high = firstSeparated(slice, "high", band);
  const low = firstSeparated(slice, "low", band);
  if (!high || !low || high.price <= low.price) return null;
  return { high: high.price, highTime: high.time, low: low.price, lowTime: low.time };
}

function firstSeparated(
  slice: readonly Bar[],
  side: "high" | "low",
  band: number,
): Edge | null {
  const points = slice.map((bar, index) => ({
    index,
    price: side === "high" ? bar.high : bar.low,
    time: bar.time,
  }));
  const ordered = clusters(points, band).sort((left, right) => {
    const leftPrice = extremePrice(left, side);
    const rightPrice = extremePrice(right, side);
    return side === "high" ? rightPrice - leftPrice : leftPrice - rightPrice;
  });
  for (const group of ordered) {
    if (group.length >= 2 && hasGap(group)) return edgeOf(group, side);
  }
  return null;
}

function clusters(points: readonly Touch[], band: number): Touch[][] {
  const sorted = [...points].sort((a, b) => a.price - b.price || a.index - b.index);
  const groups: Touch[][] = [];
  for (const point of sorted) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    if (!group || !previous || point.price - previous.price > band) groups.push([point]);
    else group.push(point);
  }
  return groups;
}

function hasGap(group: readonly Touch[]): boolean {
  const indexes = group.map((point) => point.index).sort((a, b) => a - b);
  for (let i = 1; i < indexes.length; i += 1) {
    if (indexes[i]! - indexes[i - 1]! > 1) return true;
  }
  return false;
}

function extremePrice(group: readonly Touch[], side: "high" | "low"): number {
  const prices = group.map((point) => point.price);
  return side === "high" ? Math.max(...prices) : Math.min(...prices);
}

function edgeOf(group: readonly Touch[], side: "high" | "low"): Edge {
  const price = extremePrice(group, side);
  const earliest = group
    .filter((point) => point.price === price)
    .reduce((left, right) => (right.time < left.time ? right : left));
  return { price, time: earliest.time };
}

function tightLevels(bars: readonly Bar[], start: number, end: number): Level[] {
  const edges = separatedEdges(bars, start, end);
  const high: Level = {
    name: "RangeHigh",
    price: edges?.high ?? bars[start]!.high,
    time: toTimeString(edges?.highTime ?? bars[start]!.time),
  };
  const low: Level = {
    name: "RangeLow",
    price: edges?.low ?? bars[start]!.low,
    time: toTimeString(edges?.lowTime ?? bars[start]!.time),
  };
  return high.time <= low.time ? [high, low] : [low, high];
}

function medianHeight(slice: readonly Bar[]): number {
  return median(slice.map((bar) => barHeight(bar)));
}

function keyOf(segment: Segment): string {
  return `${segment.start}:${segment.end}`;
}

/** Keep the taller price span when bar indexes intersect, including a segment fully inside another. */
function resolveOverlaps(bars: readonly Bar[], segments: readonly Segment[]): Segment[] {
  const ranked = [...segments].sort((a, b) => {
    const heightDiff = sliceHeight(bars, b.start, b.end) - sliceHeight(bars, a.start, a.end);
    if (heightDiff !== 0) return heightDiff;
    const spanDiff = b.end - b.start - (a.end - a.start);
    if (spanDiff !== 0) return spanDiff;
    return a.start - b.start;
  });
  const kept: Segment[] = [];
  for (const segment of ranked) {
    if (kept.some((other) => indexesOverlap(segment, other))) continue;
    kept.push(segment);
  }
  return kept.sort((a, b) => a.start - b.start || b.end - a.end);
}

function indexesOverlap(left: Segment, right: Segment): boolean {
  return left.start <= right.end && right.start <= left.end;
}
