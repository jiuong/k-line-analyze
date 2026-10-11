import type { Bar } from "../types/bars.js";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
} from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";
import { classifyReversalSignal } from "./classifyReversalSignal.js";

const FUNCTION_ID = "classifySwingTrend";

const SUMMARY_TEMPLATE =
  "trends={count}; last={lastName} from={from} to={to}";

/**
 * Trend segments between reversal K2 nodes.
 * Each kept reversal opens one segment. The last segment ends on the last bar.
 */
export function classifySwingTrend(
  bars: Bar[],
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifySwingTrend: bars must be a non-empty array");
  }

  const signals = classifyReversalSignal(bars).results.filter(
    (item) => item.name === "bull_reversal" || item.name === "bear_reversal",
  );
  if (signals.length === 0) {
    return assemble([windowResult(bars)]);
  }

  const lastBar = bars[bars.length - 1]!;
  const segments = signals.map((signal, index) => {
    const next = signals[index + 1];
    return next
      ? closedSegment(signal, next)
      : openSegment(signal, lastBar);
  });
  return assemble(segments);
}

function closedSegment(
  start: AnalyzeResult,
  end: AnalyzeResult,
): AnalyzeResult {
  return segment(start, k2Of(end));
}

function openSegment(start: AnalyzeResult, lastBar: Bar): AnalyzeResult {
  const bull = start.name === "bull_reversal";
  return segment(start, {
    name: bull ? "H1" : "L1",
    price: bull ? lastBar.high : lastBar.low,
    time: toTimeString(lastBar.time),
  });
}

function segment(start: AnalyzeResult, end: Level): AnalyzeResult {
  const opening = k2Of(start);
  const bull = start.name === "bull_reversal";
  return {
    name: bull ? "bull_trend" : "bear_trend",
    range: { start: opening.time, end: end.time },
    levels: [
      level(bull ? "L1" : "H1", opening.price, opening.time),
      level(bull ? "H1" : "L1", end.price, end.time),
    ],
  };
}

function k2Of(signal: AnalyzeResult): Level {
  const k2 = signal.levels.find((entry) => entry.name === "K2");
  if (!k2) {
    throw new Error("classifySwingTrend: reversal signal is missing K2");
  }
  return k2;
}

function level(name: "H1" | "L1", price: number, time: string): Level {
  return { name, price, time };
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

function assemble(
  results: AnalyzeResult[],
): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  const trendCount = results.filter(
    (item) => item.name === "bull_trend" || item.name === "bear_trend",
  ).length;
  const times = endpointTimes(last);

  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY_TEMPLATE, {
      count: trendCount,
      lastName: last.name,
      ...times,
    }),
    confidence: 1,
    evidence: {},
  };
}

function endpointTimes(item: AnalyzeResult): { from: string; to: string } {
  const byName = new Map(item.levels.map((entry) => [entry.name, entry.time]));
  if (item.name === "bull_trend") {
    return { from: byName.get("L1") ?? "-", to: byName.get("H1") ?? "-" };
  }
  if (item.name === "bear_trend") {
    return { from: byName.get("H1") ?? "-", to: byName.get("L1") ?? "-" };
  }
  return { from: "-", to: "-" };
}
