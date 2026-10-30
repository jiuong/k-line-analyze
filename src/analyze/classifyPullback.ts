import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifySwingTrend } from "./classifySwingTrend.js";
import { classifyTradingRange } from "./classifyTradingRange.js";

const FUNCTION_ID = "classifyPullback";

const SUMMARY_TEMPLATE =
  "pullbacks={count}; consolidation={consolidation}; bars={bars}; multi={multi}; legs={legs}; last={lastName} depth={depth} fib={fib} relation={relation}";

const DEFAULT_TOLERANCE = 0.01;

const FIBS = [
  { ratio: 0.236, pct: 23.6 },
  { ratio: 0.382, pct: 38.2 },
  { ratio: 0.5, pct: 50 },
  { ratio: 0.618, pct: 61.8 },
  { ratio: 0.786, pct: 78.6 },
  { ratio: 1, pct: 100 },
] as const;

const RANGE_LABELS = new Set<AnalysisLabel>([
  "broad_trading_range",
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
  "trading_range",
]);

type Direction = "bull" | "bear";

export type PullbackRelation = "not_reached" | "touched" | "exceeded";

export type PullbackFibPct = (typeof FIBS)[number]["pct"];

export type PullbackItemEvidence = {
  legCount: number;
  pullbackDistance: number;
  trendDistance: number;
  depthPct: number;
  nearestFibPct: PullbackFibPct;
  relation: PullbackRelation;
};

export type PullbackEvidence = {
  pullbacks: PullbackItemEvidence[];
};

export type ClassifyPullbackOptions = {
  fibTouchTolerance?: number;
  /** Forwarded into `classifySwingTrend` / `findSwingLegs`. Default `2`. */
  swingSpan?: number;
  /**
   * When set, skips the inner `classifySwingTrend` call.
   * Used by `classifySwingTrend` mark attachment to avoid re-entry.
   */
  swingResults?: readonly AnalyzeResult[];
};

type Span = {
  name: AnalysisLabel;
  start: number;
  end: number;
};

type Found = {
  name: AnalysisLabel;
  direction: Direction;
  start: number;
  end: number;
  refIndex: number;
  extremeIndex: number;
  legCount: number;
  pullbackDistance: number;
  trendDistance: number;
};

/**
 * Pullbacks inside a trend, and horizontal pauses between two legs of the same trend.
 * Depth is this episode's adverse move divided by the parent trend's high-low span.
 */
export function classifyPullback(
  bars: Bar[],
  options?: ClassifyPullbackOptions,
): AnalysisResult<PullbackEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyPullback: bars must be a non-empty array");
  }
  const tolerance = resolveTolerance(options);
  const swingSpan = resolveSwingSpan(options);
  const swingSource =
    options?.swingResults ??
    classifySwingTrend(bars, { swingSpan, attachEntryMarks: false }).results;
  const swing = swingSource.map((item) => spanOf(bars, item));
  const ranges = classifyTradingRange(bars).results.map((item) => spanOf(bars, item));
  const found = [
    ...consolidations(bars, swing, ranges),
    ...insideTrends(bars, swing),
  ];
  found.sort((left, right) => left.start - right.start || left.end - right.end);
  if (found.length === 0) return assemble([windowResult(bars)], []);
  const results = found.map((item) => toResult(bars, item));
  const evidence = found.map((item) => toEvidence(item, tolerance));
  return assemble(results, evidence);
}

function consolidations(
  bars: readonly Bar[],
  swing: readonly Span[],
  ranges: readonly Span[],
): Found[] {
  const majors = swing.filter((item) => isMajor(item.name));
  const pauses = [...swing, ...ranges].filter((item) => RANGE_LABELS.has(item.name));
  const found: Found[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < majors.length - 1; index += 1) {
    const left = majors[index]!;
    const right = majors[index + 1]!;
    if (directionOf(left.name) !== directionOf(right.name)) continue;
    if (left.end + 1 > right.start - 1) continue;
    const gap = { start: left.end + 1, end: right.start - 1 };
    for (const pause of pauses) {
      const clip = intersection(pause, gap);
      if (!clip) continue;
      const key = `${clip.start}:${clip.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const item = consolidationPullback(bars, left, right, clip);
      if (item) found.push(item);
    }
  }
  return found;
}

function insideTrends(bars: readonly Bar[], swing: readonly Span[]): Found[] {
  const majors = swing.filter((item) => isMajor(item.name));
  const minors = swing.filter((item) => isMinor(item.name));
  const found: Found[] = [];
  for (const trend of majors) {
    const direction = directionOf(trend.name);
    const nested = minors.filter(
      (minor) => minor.start >= trend.start && minor.end <= trend.end,
    );
    for (const minor of nested) {
      const item = minorPullback(bars, trend, minor, direction);
      if (item) found.push(item);
    }
    const limit = scanLimit(trend, majors);
    for (const run of subtract(trend.start, limit, nested)) {
      found.push(...scanRun(bars, trend, run, direction));
    }
  }
  return found;
}

function consolidationPullback(
  bars: readonly Bar[],
  left: Span,
  right: Span,
  clip: { start: number; end: number },
): Found | null {
  const direction = directionOf(left.name);
  const prior = referenceBefore(bars, left.start, left.end + 1, direction);
  if (!prior) return null;
  return measure(
    bars,
    "consolidation_pullback",
    direction,
    clip.start,
    clip.end,
    prior,
    { start: left.start, end: right.end },
    adverseLegs(bars, clip.start, clip.end, direction),
  );
}

function minorPullback(
  bars: readonly Bar[],
  parent: Span,
  minor: Span,
  direction: Direction,
): Found | null {
  const prior = referenceBefore(bars, parent.start, minor.start, direction);
  const ref = prior ?? {
    index: minor.start,
    price: trendSide(bars[minor.start]!, direction),
  };
  const legs = adverseLegs(bars, minor.start, minor.end, direction);
  return measure(
    bars,
    legs >= 2 ? "multi_leg_pullback" : "leg_pullback",
    direction,
    minor.start,
    minor.end,
    ref,
    parent,
    legs >= 2 ? legs : 1,
  );
}

function scanRun(
  bars: readonly Bar[],
  parent: Span,
  run: { start: number; end: number },
  direction: Direction,
): Found[] {
  const found: Found[] = [];
  let index = run.start;
  while (index <= run.end) {
    if (!isAdverse(bars[index]!, direction)) {
      index += 1;
      continue;
    }
    const prior = referenceBefore(bars, parent.start, index, direction);
    if (prior && breaksReference(bars[index]!, direction, prior.price)) {
      index += 1;
      continue;
    }
    const ref = prior ?? {
      index,
      price: trendSide(bars[index]!, direction),
    };
    let end = index;
    let legs = 1;
    let inLeg = true;
    for (let cursor = index + 1; cursor <= run.end; cursor += 1) {
      if (breaksReference(bars[cursor]!, direction, ref.price)) break;
      end = cursor;
      if (isAdverse(bars[cursor]!, direction)) {
        if (!inLeg) legs += 1;
        inLeg = true;
      } else {
        inLeg = false;
      }
    }
    const item = measure(
      bars,
      legs >= 2 ? "multi_leg_pullback" : "bar_pullback",
      direction,
      index,
      end,
      ref,
      parent,
      legs,
    );
    if (item) found.push(item);
    index = end + 1;
  }
  return found;
}

function measure(
  bars: readonly Bar[],
  name: AnalysisLabel,
  direction: Direction,
  start: number,
  end: number,
  ref: { index: number; price: number },
  parent: { start: number; end: number },
  legCount: number,
): Found | null {
  const extreme = adverseExtreme(bars, start, end, direction);
  const trendDistance = spanDistance(bars, parent.start, parent.end);
  if (trendDistance === 0) return null;
  const pullbackDistance = Math.max(
    0,
    direction === "bull" ? ref.price - extreme.price : extreme.price - ref.price,
  );
  return {
    name,
    direction,
    start,
    end,
    refIndex: ref.index,
    extremeIndex: extreme.index,
    legCount,
    pullbackDistance,
    trendDistance,
  };
}

function scanLimit(trend: Span, majors: readonly Span[]): number {
  const sharesClose = majors.some(
    (major) =>
      major.start === trend.end && directionOf(major.name) !== directionOf(trend.name),
  );
  return sharesClose ? trend.end - 1 : trend.end;
}

function subtract(
  start: number,
  end: number,
  blocked: readonly Span[],
): Array<{ start: number; end: number }> {
  if (start > end) return [];
  const cuts = blocked
    .map((item) => ({
      start: Math.max(item.start, start),
      end: Math.min(item.end, end),
    }))
    .filter((item) => item.start <= item.end)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const runs: Array<{ start: number; end: number }> = [];
  let cursor = start;
  for (const cut of cuts) {
    if (cut.start > cursor) runs.push({ start: cursor, end: cut.start - 1 });
    cursor = Math.max(cursor, cut.end + 1);
  }
  if (cursor <= end) runs.push({ start: cursor, end });
  return runs;
}

function intersection(
  range: Span,
  gap: { start: number; end: number },
): { start: number; end: number } | null {
  const start = Math.max(range.start, gap.start);
  const end = Math.min(range.end, gap.end);
  return start <= end ? { start, end } : null;
}

function referenceBefore(
  bars: readonly Bar[],
  from: number,
  toExclusive: number,
  direction: Direction,
): { index: number; price: number } | null {
  if (toExclusive <= from) return null;
  let index = from;
  let price = trendSide(bars[from]!, direction);
  for (let cursor = from + 1; cursor < toExclusive; cursor += 1) {
    const next = trendSide(bars[cursor]!, direction);
    const better = direction === "bull" ? next > price : next < price;
    if (better) {
      price = next;
      index = cursor;
    }
  }
  return { index, price };
}

function adverseExtreme(
  bars: readonly Bar[],
  start: number,
  end: number,
  direction: Direction,
): { index: number; price: number } {
  let index = start;
  let price = adverseSide(bars[start]!, direction);
  for (let cursor = start + 1; cursor <= end; cursor += 1) {
    const next = adverseSide(bars[cursor]!, direction);
    if (direction === "bull" ? next < price : next > price) {
      price = next;
      index = cursor;
    }
  }
  return { index, price };
}

function adverseLegs(
  bars: readonly Bar[],
  start: number,
  end: number,
  direction: Direction,
): number {
  let legs = 0;
  let inLeg = false;
  for (let index = start; index <= end; index += 1) {
    if (isAdverse(bars[index]!, direction)) {
      if (!inLeg) legs += 1;
      inLeg = true;
    } else {
      inLeg = false;
    }
  }
  return legs;
}

function spanDistance(bars: readonly Bar[], start: number, end: number): number {
  let high = -Infinity;
  let low = Infinity;
  for (let index = start; index <= end; index += 1) {
    high = Math.max(high, bars[index]!.high);
    low = Math.min(low, bars[index]!.low);
  }
  return high - low;
}

function isAdverse(bar: Bar, direction: Direction): boolean {
  if (bar.close === bar.open) return false;
  return direction === "bull" ? bar.close < bar.open : bar.close > bar.open;
}

function breaksReference(bar: Bar, direction: Direction, price: number): boolean {
  return direction === "bull" ? bar.high > price : bar.low < price;
}

function trendSide(bar: Bar, direction: Direction): number {
  return direction === "bull" ? bar.high : bar.low;
}

function adverseSide(bar: Bar, direction: Direction): number {
  return direction === "bull" ? bar.low : bar.high;
}

function directionOf(name: AnalysisLabel): Direction {
  return name === "bull_trend" || name === "minor_bull_trend" ? "bull" : "bear";
}

function isMajor(name: AnalysisLabel): boolean {
  return name === "bull_trend" || name === "bear_trend";
}

function isMinor(name: AnalysisLabel): boolean {
  return name === "minor_bull_trend" || name === "minor_bear_trend";
}

function toEvidence(item: Found, tolerance: number): PullbackItemEvidence {
  const depth = item.pullbackDistance / item.trendDistance;
  let nearest: (typeof FIBS)[number] = FIBS[0]!;
  let best = Math.abs(depth - nearest.ratio);
  for (const fib of FIBS) {
    const diff = Math.abs(depth - fib.ratio);
    if (diff < best) {
      best = diff;
      nearest = fib;
    }
  }
  let relation: PullbackRelation;
  if (best <= tolerance) relation = "touched";
  else if (depth < nearest.ratio) relation = "not_reached";
  else relation = "exceeded";
  return {
    legCount: item.legCount,
    pullbackDistance: item.pullbackDistance,
    trendDistance: item.trendDistance,
    depthPct: Math.round(depth * 1000) / 10,
    nearestFibPct: nearest.pct,
    relation,
  };
}

function toResult(bars: readonly Bar[], item: Found): AnalyzeResult {
  const start = level(bars, "PullbackStart", item.refIndex, trendSide(bars[item.refIndex]!, item.direction));
  const extreme = level(
    bars,
    "PullbackExtreme",
    item.extremeIndex,
    adverseSide(bars[item.extremeIndex]!, item.direction),
  );
  return {
    name: item.name,
    range: {
      start: toTimeString(bars[item.start]!.time),
      end: toTimeString(bars[item.end]!.time),
    },
    levels: [start, extreme],
  };
}

function level(bars: readonly Bar[], name: "PullbackStart" | "PullbackExtreme", index: number, price: number): Level {
  return { name, price, time: toTimeString(bars[index]!.time) };
}

function spanOf(bars: readonly Bar[], item: AnalyzeResult): Span {
  return {
    name: item.name,
    start: barIndexAt(bars, item.range.start, FUNCTION_ID),
    end: barIndexAt(bars, item.range.end ?? item.range.start, FUNCTION_ID),
  };
}

function windowResult(bars: readonly Bar[]): AnalyzeResult {
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
  pullbacks: PullbackItemEvidence[],
): AnalysisResult<PullbackEvidence> {
  const last = results[results.length - 1]!;
  const lastEvidence = pullbacks[pullbacks.length - 1];
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY_TEMPLATE, {
      count: pullbacks.length,
      consolidation: countNamed(results, "consolidation_pullback"),
      bars: countNamed(results, "bar_pullback"),
      multi: countNamed(results, "multi_leg_pullback"),
      legs: countNamed(results, "leg_pullback"),
      lastName: last.name,
      depth: lastEvidence ? formatPct(lastEvidence.depthPct) : "-",
      fib: lastEvidence ? formatPct(lastEvidence.nearestFibPct) : "-",
      relation: lastEvidence ? lastEvidence.relation : "-",
    }),
    confidence: 1,
    evidence: { pullbacks },
  };
}

function countNamed(results: readonly AnalyzeResult[], name: AnalysisLabel): number {
  return results.filter((item) => item.name === name).length;
}

function formatPct(value: number): string {
  const text = (Math.round(value * 10) / 10).toFixed(1);
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

function resolveTolerance(options?: ClassifyPullbackOptions): number {
  if (options === undefined) return DEFAULT_TOLERANCE;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyPullback: options must be an object");
  }
  const tolerance = options.fibTouchTolerance;
  if (tolerance === undefined) return DEFAULT_TOLERANCE;
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance <= 0) {
    throw new TypeError(
      "classifyPullback: fibTouchTolerance must be a finite number greater than 0",
    );
  }
  return tolerance;
}

function resolveSwingSpan(options?: ClassifyPullbackOptions): number {
  if (options === undefined || options.swingSpan === undefined) return 2;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyPullback: options must be an object");
  }
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifyPullback: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}
