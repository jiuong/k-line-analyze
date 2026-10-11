import type { Bar } from "../types/bars.js";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
  LevelName,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";

const FUNCTION_ID = "classifyReversalSignal";

const SUMMARY_TEMPLATE =
  "reversals={count}; last={lastName} K1@{K1} K2@{K2} confirm@{Confirm}";

type Direction = "bull" | "bear";

type ScanAction =
  | { kind: "slide" }
  | { kind: "jump"; index: number };

/**
 * Bull and bear reversal scan.
 * K1 and K2 are adjacent. After a confirm, the next search starts at the following bar.
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

  const signals = keepLatestOfEachRun(scanSignals(bars));
  if (signals.length === 0) {
    return assemble([windowResult("no_reversal", bars)]);
  }
  return assemble(signals);
}

function scanSignals(bars: Bar[]): AnalyzeResult[] {
  const signals: AnalyzeResult[] = [];
  let i = 0;

  while (i <= bars.length - 2) {
    const k1 = bars[i]!;
    const direction = setupDirection(k1);
    if (direction === null) {
      i += 1;
      continue;
    }

    const k2 = bars[i + 1]!;
    if (!isValidK2(direction, k1, k2)) {
      i += 1;
      continue;
    }

    const action = scanAfterK2(bars, i, direction, k2, signals);
    i = action.kind === "slide" ? i + 1 : action.index;
  }

  return signals;
}

/** Adjacent signals with the same name collapse to the later one. */
function keepLatestOfEachRun(signals: AnalyzeResult[]): AnalyzeResult[] {
  const kept: AnalyzeResult[] = [];
  for (const signal of signals) {
    const previous = kept[kept.length - 1];
    if (previous && previous.name === signal.name) {
      kept[kept.length - 1] = signal;
      continue;
    }
    kept.push(signal);
  }
  return kept;
}

function scanAfterK2(
  bars: Bar[],
  k1Index: number,
  direction: Direction,
  k2: Bar,
  signals: AnalyzeResult[],
): ScanAction {
  const k1 = bars[k1Index]!;

  for (let j = k1Index + 2; j < bars.length; j += 1) {
    const bar = bars[j]!;
    if (breaksExtreme(direction, k2, bar)) {
      return { kind: "jump", index: j - 1 };
    }
    if (isInsideBar(bar, bars[j - 1]!)) {
      continue;
    }
    if (confirms(direction, k2, bar)) {
      signals.push(toSignal(direction, k1, k2, bar));
      return { kind: "jump", index: j + 1 };
    }
  }

  return { kind: "slide" };
}

/** Bearish K1 starts a bull reversal. Bullish K1 starts a bear reversal. */
function setupDirection(bar: Bar): Direction | null {
  if (bar.close < bar.open) return "bull";
  if (bar.close > bar.open) return "bear";
  return null;
}

function isValidK2(direction: Direction, k1: Bar, k2: Bar): boolean {
  if (direction === "bull") {
    return k2.low < k1.low && k2.high <= k1.high;
  }
  return k2.high > k1.high && k2.low >= k1.low;
}

function breaksExtreme(direction: Direction, k2: Bar, bar: Bar): boolean {
  if (direction === "bull") return bar.low < k2.low;
  return bar.high > k2.high;
}

function isInsideBar(bar: Bar, prev: Bar): boolean {
  return bar.high <= prev.high && bar.low >= prev.low;
}

function confirms(direction: Direction, k2: Bar, bar: Bar): boolean {
  if (direction === "bull") {
    return bar.high > k2.high && bar.low > k2.low;
  }
  return bar.high < k2.high && bar.low < k2.low;
}

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
      level("K2", k2, bull ? k2.low : k2.high),
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
