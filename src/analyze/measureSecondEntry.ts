import type { Bar } from "../types/bars.js";
import type { AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import {
  measureReport,
  tradeRangeFrom,
  type SetupCandidate,
  type SetupReport,
  type SetupTargetLevel,
} from "../utils/setupMeasure.js";
import type { SetupDirection } from "../utils/setupPrices.js";
import { countedEntrySide } from "../utils/secondEntries.js";
import {
  classifySecondEntry,
  type ClassifySecondEntryOptions,
} from "./classifySecondEntry.js";

const FUNCTION_ID = "measureSecondEntry";

const TP_NAMES = ["TP1", "TP2", "TP3", "TP4"] as const;

/** Measure counted entries from `classifySecondEntry` (win-rate target = TP1). */
export function measureSecondEntry(
  bars: Bar[],
  options?: ClassifySecondEntryOptions,
): SetupReport {
  const classified = classifySecondEntry(bars, options);
  const candidates: SetupCandidate[] = [];
  for (const item of classified.results) {
    const candidate = toCandidate(item);
    if (candidate) candidates.push(candidate);
  }
  return measureReport(FUNCTION_ID, bars, candidates);
}

function toCandidate(item: AnalyzeResult): SetupCandidate | undefined {
  const side = countedEntrySide(item.name);
  if (!side) return undefined;
  const entry = levelByName(item.levels, "Entry");
  const stop = levelByName(item.levels, "Stop");
  const target = levelByName(item.levels, "TP1");
  const signal = levelByName(item.levels, "SignalBar");
  if (!entry || !stop || !target || !signal) return undefined;

  const targets: SetupTargetLevel[] = [];
  for (const name of TP_NAMES) {
    const level = levelByName(item.levels, name);
    if (level) targets.push({ name, price: level.price });
  }

  const direction: SetupDirection = side === "high" ? "up" : "down";

  return {
    basis: item.name,
    direction,
    signalTime: entry.time,
    signalPrice: signal.price,
    entry: entry.price,
    stop: stop.price,
    target: target.price,
    entryTime: entry.time,
    range: tradeRangeFrom(item.range),
    tradeSpan: true,
    targets,
  };
}

function levelByName(levels: readonly Level[], name: LevelName): Level | undefined {
  return levels.find((level) => level.name === name);
}
