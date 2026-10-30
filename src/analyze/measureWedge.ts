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
  classifyWedge,
  type ClassifyWedgeOptions,
  type WedgeRole,
} from "./classifyWedge.js";

const FUNCTION_ID = "measureWedge";

/** Measure triggered wedge setups from `classifyWedge`. */
export function measureWedge(bars: Bar[], options?: ClassifyWedgeOptions): SetupReport {
  const classified = classifyWedge(bars, options);
  const candidates: SetupCandidate[] = [];
  for (let index = 0; index < classified.results.length; index += 1) {
    const item = classified.results[index]!;
    const role = classified.evidence.items[index]?.role;
    const candidate = toCandidate(item, role);
    if (candidate) candidates.push(candidate);
  }
  return measureReport(FUNCTION_ID, bars, candidates);
}

function toCandidate(
  item: AnalyzeResult,
  role: WedgeRole | undefined,
): SetupCandidate | undefined {
  if (item.name !== "wedge_top" && item.name !== "wedge_bottom") return undefined;
  const entry = levelByName(item.levels, "Entry");
  const stop = levelByName(item.levels, "Stop");
  const target = levelByName(item.levels, "Target");
  if (!entry || !stop || !target) return undefined;

  const direction: SetupDirection = item.name === "wedge_top" ? "down" : "up";
  return {
    basis: item.name,
    direction,
    signalTime: entry.time,
    signalPrice: entry.price,
    entry: entry.price,
    stop: stop.price,
    target: target.price,
    entryTime: entry.time,
    range: tradeRangeFrom(item.range),
    context: role === undefined ? undefined : { role },
  };
}

function levelByName(levels: readonly Level[], name: LevelName): Level | undefined {
  return levels.find((level) => level.name === name);
}
