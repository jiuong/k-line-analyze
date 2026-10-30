import type { Bar } from "../types/bars.js";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
  LevelName,
} from "../types/analysis.js";
import { withGapBody } from "../utils/gapBody.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifyReversalSignal";

const SUMMARY_TEMPLATE =
  "reversals={count}; last={lastName} K1@{K1} K2@{K2} confirm@{Confirm}";

type Direction = "bull" | "bear";

/**
 * Reversal scan over adjacent windows.
 * A gap is the next bar's body: gap up opens at the previous high, gap down at the previous low.
 * Bull/bear pivots use K1+K2+K3. When K3 engulfs K2, a large color-side excess uses that bar's color; a small excess reads the next bar's one-sided break.
 * After a confirm, the next search starts at that K2.
 */
export function classifyReversalSignal(
  bars: Bar[],
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError(
      "classifyReversalSignal: bars must be a non-empty array",
    );
  }

  if (bars.length < 3) {
    return assemble([windowResult("unclear", bars)]);
  }

  const signals = keepFirstOfEachRun(scanSignals(bars));
  if (signals.length === 0) {
    return assemble([windowResult("no_reversal", bars)]);
  }
  return assemble(signals);
}

function scanSignals(bars: Bar[]): AnalyzeResult[] {
  const signals: AnalyzeResult[] = [];
  let i = 0;

  while (i <= bars.length - 3) {
    const resolved = resolveWindow(bars, i);
    if (resolved === null) {
      i += 1;
      continue;
    }
    for (const direction of resolved.directions) {
      signals.push(toSignal(direction, bars[i]!, bars[i + 1]!, resolved.confirm));
    }
    i += 1;
  }

  return signals;
}

/** Adjacent signals with the same name collapse to the earlier one. */
function keepFirstOfEachRun(signals: AnalyzeResult[]): AnalyzeResult[] {
  const kept: AnalyzeResult[] = [];
  for (const signal of signals) {
    const previous = kept[kept.length - 1];
    if (previous && previous.name === signal.name) continue;
    kept.push(signal);
  }
  return kept;
}

/**
 * Engulf skips bull/bear pivots. A color-side excess above half the covered bar's range
 * uses that bar's color. A smaller excess reads the next bar, or repeats when
 * that next bar also engulfs. Otherwise a bull pivot is bull and a bear pivot is bear.
 */
function resolveWindow(
  bars: Bar[],
  i: number,
): { directions: Direction[]; confirm: Bar } | null {
  const k1 = withGapBody(bars[i - 1], bars[i]!);
  const k2 = withGapBody(bars[i], bars[i + 1]!);
  const k3 = withGapBody(bars[i + 1], bars[i + 2]!);
  if (engulfs(k3, k2)) return resolveEngulf(bars, i + 2);

  const directions = matchWindow(k1, k2, k3);
  if (directions.length === 0) return null;
  return { directions, confirm: bars[i + 2]! };
}

/**
 * `index` is the engulfing bar. Its color picks which side of the covered bar
 * counts. A doji cannot pick a side.
 */
function resolveEngulf(
  bars: Bar[],
  index: number,
): { directions: Direction[]; confirm: Bar } | null {
  const outer = withGapBody(bars[index - 1], bars[index]!);
  const inner = withGapBody(bars[index - 2], bars[index - 1]!);
  const direction = candleDirection(outer);
  if (direction === null) return null;

  const excess =
    direction === "bull" ? outer.high - inner.high : inner.low - outer.low;
  const length = inner.high - inner.low;
  if (excess > length * 0.5) {
    return { directions: [direction], confirm: bars[index]! };
  }

  const nextBar = bars[index + 1];
  if (!nextBar) return null;
  const next = withGapBody(bars[index], nextBar);
  if (engulfs(next, outer)) return resolveEngulf(bars, index + 1);

  const breakHigh = next.high > outer.high;
  const breakLow = next.low < outer.low;
  if (breakHigh === breakLow) return null;
  return { directions: [breakHigh ? "bull" : "bear"], confirm: nextBar };
}

/** Bullish close is bull. Bearish close is bear. A doji is not a signal. */
function candleDirection(bar: Bar): Direction | null {
  if (bar.close > bar.open) return "bull";
  if (bar.close < bar.open) return "bear";
  return null;
}

/** Strict cover on both sides. */
function engulfs(outer: Bar, inner: Bar): boolean {
  return outer.high > inner.high && outer.low < inner.low;
}

/** Bull pivot is bull. Bear pivot is bear. Called only when K3 does not engulf K2. */
function matchWindow(k1: Bar, k2: Bar, k3: Bar): Direction[] {
  const directions: Direction[] = [];
  if (k1.high > k2.high && k3.high > k2.high) directions.push("bull");
  if (k1.low < k2.low && k3.low < k2.low) directions.push("bear");
  return directions;
}

/*
Suspended geometry. Kept for reference; the scan uses matchWindow only.

function matchTriple(k1: Bar, k2: Bar, k3: Bar): Direction | null {
  return agree(
    legacyDirection(k1, k2, k3),
    insideDirection(k1, k2, k3),
    engulfDirection(k1, k2, k3),
  );
}

function agree(
  ...directions: Array<Direction | null>
): Direction | null {
  let chosen: Direction | null = null;
  for (const direction of directions) {
    if (direction === null) continue;
    if (chosen === null) {
      chosen = direction;
      continue;
    }
    if (chosen !== direction) return null;
  }
  return chosen;
}

// K1 color is suspended. Direction is whichever K2/K3 geometry matches.
function legacyDirection(k1: Bar, k2: Bar, k3: Bar): Direction | null {
  return agree(
    legacyGeometry("bull", k1, k2, k3),
    legacyGeometry("bear", k1, k2, k3),
  );
}

function legacyGeometry(
  direction: Direction,
  k1: Bar,
  k2: Bar,
  k3: Bar,
): Direction | null {
  if (!isValidK2(direction, k1, k2)) return null;
  if (!confirms(direction, k2, k3)) return null;
  return direction;
}

function insideDirection(k1: Bar, k2: Bar, k3: Bar): Direction | null {
  if (!isInside(k2, k1)) return null;
  return breakoutDirection(k3.high > k1.high, k3.low < k1.low);
}

function engulfDirection(k1: Bar, k2: Bar, k3: Bar): Direction | null {
  if (!isEngulf(k2, k1)) return null;
  return breakoutDirection(k3.high > k2.high, k3.low < k2.low);
}

// One side only. Breaking both extremes, or neither, is not a signal.
function breakoutDirection(breakHigh: boolean, breakLow: boolean): Direction | null {
  if (breakHigh === breakLow) return null;
  return breakHigh ? "bull" : "bear";
}

function isValidK2(direction: Direction, k1: Bar, k2: Bar): boolean {
  if (direction === "bull") {
    return k2.low < k1.low && k2.high <= k1.high;
  }
  return k2.high > k1.high && k2.low >= k1.low;
}

function confirms(direction: Direction, k2: Bar, bar: Bar): boolean {
  if (direction === "bull") {
    return bar.high > k2.high && bar.low > k2.low;
  }
  return bar.high < k2.high && bar.low < k2.low;
}

function isInside(inner: Bar, outer: Bar): boolean {
  return inner.high <= outer.high && inner.low >= outer.low;
}

function isEngulf(outer: Bar, inner: Bar): boolean {
  const covers = outer.high >= inner.high && outer.low <= inner.low;
  const wider = outer.high > inner.high || outer.low < inner.low;
  return covers && wider;
}
*/

function toSignal(
  direction: Direction,
  k1: Bar,
  k2: Bar,
  confirm: Bar,
): AnalyzeResult {
  const bull = direction === "bull";
  return {
    name: bull ? "bull_reversal" : "bear_reversal",
    range: {
      start: toTimeString(k1.time),
      end: toTimeString(confirm.time),
    },
    levels: [
      level("K1", k1, bull ? k1.high : k1.low),
      level("K2", k2, bull ? k2.high : k2.low),
      level("Confirm", confirm, bull ? confirm.high : confirm.low),
    ],
  };
}

function level(name: LevelName, bar: Bar, price: number): Level {
  return { name, price, time: toTimeString(bar.time) };
}

function windowResult(
  name: "unclear" | "no_reversal",
  bars: Bar[],
): AnalyzeResult {
  return {
    name,
    range: {
      start: toTimeString(bars[0]!.time),
      end: toTimeString(bars[bars.length - 1]!.time),
    },
    levels: [],
  };
}

function assemble(results: AnalyzeResult[]): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  const reversalCount = results.filter(
    (item) => item.name === "bull_reversal" || item.name === "bear_reversal",
  ).length;
  const times = levelTimes(last);

  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY_TEMPLATE, {
      count: reversalCount,
      lastName: last.name,
      ...times,
    }),
    confidence: 1,
    evidence: {},
  };
}

function levelTimes(item: AnalyzeResult): { K1: string; K2: string; Confirm: string } {
  const byName = new Map(item.levels.map((entry) => [entry.name, entry.time]));
  return {
    K1: byName.get("K1") ?? "-",
    K2: byName.get("K2") ?? "-",
    Confirm: byName.get("Confirm") ?? "-",
  };
}
