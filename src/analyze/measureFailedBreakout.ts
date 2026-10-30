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
  classifyFailedBreakout,
  type ClassifyFailedBreakoutOptions,
} from "./classifyFailedBreakout.js";

const FUNCTION_ID = "measureFailedBreakout";

/** Measure failed-breakout setups from `classifyFailedBreakout`. */
export function measureFailedBreakout(
  bars: Bar[],
  options?: ClassifyFailedBreakoutOptions,
): SetupReport {
  const classified = classifyFailedBreakout(bars, options);
  const candidates: SetupCandidate[] = [];
  classified.results.forEach((item, index) => {
    const direction = classified.evidence.directions[index];
    const candidate = toCandidate(item, direction);
    if (candidate) candidates.push(candidate);
  });
  return measureReport(FUNCTION_ID, bars, candidates);
}

function toCandidate(
  item: AnalyzeResult,
  direction: SetupDirection | undefined,
): SetupCandidate | undefined {
  if (item.name !== "failed_breakout" || direction === undefined) return undefined;
  const entry = levelByName(item.levels, "Entry");
  const stop = levelByName(item.levels, "Stop");
  const target = levelByName(item.levels, "Target");
  const signal = levelByName(item.levels, "SignalBar");
  if (!entry || !stop || !target || !signal) return undefined;

  return {
    basis: "failed_breakout",
    direction,
    signalTime: entry.time,
    signalPrice: signal.price,
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
