import type { Bar } from "../types/bars.js";
import type { AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import {
  measureReport,
  tradeRangeFrom,
  type SetupCandidate,
  type SetupReport,
} from "../utils/setupMeasure.js";
import type { SetupDirection } from "../utils/setupPrices.js";
import {
  classifyMajorTrendReversal,
  type ClassifyMajorTrendReversalOptions,
} from "./classifyMajorTrendReversal.js";

const FUNCTION_ID = "measureMajorTrendReversal";

/** Measure triggered major-trend-reversal setups from `classifyMajorTrendReversal`. */
export function measureMajorTrendReversal(
  bars: Bar[],
  options?: ClassifyMajorTrendReversalOptions,
): SetupReport {
  const classified = classifyMajorTrendReversal(bars, options);
  const candidates: SetupCandidate[] = [];
  for (const item of classified.results) {
    const candidate = toCandidate(item);
    if (candidate) candidates.push(candidate);
  }
  return measureReport(FUNCTION_ID, bars, candidates);
}

function toCandidate(item: AnalyzeResult): SetupCandidate | undefined {
  if (item.name !== "bull_major_reversal" && item.name !== "bear_major_reversal") {
    return undefined;
  }
  const entry = levelByName(item.levels, "Entry");
  const stop = levelByName(item.levels, "Stop");
  const target = levelByName(item.levels, "Target");
  const retest = levelByName(item.levels, "Retest");
  if (!entry || !stop || !target || !retest) return undefined;

  const direction: SetupDirection = item.name === "bull_major_reversal" ? "up" : "down";
  return {
    basis: item.name,
    direction,
    signalTime: entry.time,
    signalPrice: retest.price,
    entry: entry.price,
    stop: stop.price,
    target: target.price,
    entryTime: entry.time,
    range: tradeRangeFrom(item.range),
  };
}

function levelByName(levels: readonly Level[], name: LevelName): Level | undefined {
  return levels.find((level) => level.name === name);
}
