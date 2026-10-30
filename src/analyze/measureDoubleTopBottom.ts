import type { Bar } from "../types/bars.js";
import type { AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import { projectMeasuredMove } from "../utils/measuredMove.js";
import {
  measureReport,
  tradeRangeFrom,
  type SetupCandidate,
  type SetupReport,
} from "../utils/setupMeasure.js";
import type { SetupDirection } from "../utils/setupPrices.js";
import {
  classifyDoubleTopBottom,
  type ClassifyDoubleTopBottomOptions,
} from "./classifyDoubleTopBottom.js";

const FUNCTION_ID = "measureDoubleTopBottom";

/** Measure triggered double tops/bottoms with a 1x neckline measured move. */
export function measureDoubleTopBottom(
  bars: Bar[],
  options?: ClassifyDoubleTopBottomOptions,
): SetupReport {
  const classified = classifyDoubleTopBottom(bars, options);
  const candidates: SetupCandidate[] = [];
  for (const item of classified.results) {
    const candidate = toCandidate(item);
    if (candidate) candidates.push(candidate);
  }
  return measureReport(FUNCTION_ID, bars, candidates);
}

function toCandidate(item: AnalyzeResult): SetupCandidate | undefined {
  if (item.name !== "double_top" && item.name !== "double_bottom") return undefined;
  const entry = levelByName(item.levels, "Entry");
  const stop = levelByName(item.levels, "Stop");
  const neck = levelByName(item.levels, "Neckline");
  if (!entry || !stop || !neck) return undefined;

  const direction: SetupDirection = item.name === "double_top" ? "down" : "up";
  const height = patternHeight(item, neck.price, direction);
  if (height === undefined) return undefined;

  const target = projectMeasuredMove(neck.price, height, direction);
  return {
    basis: item.name,
    direction,
    signalTime: entry.time,
    signalPrice: neck.price,
    entry: entry.price,
    stop: stop.price,
    target,
    entryTime: entry.time,
    range: tradeRangeFrom(item.range),
  };
}

function patternHeight(
  item: AnalyzeResult,
  neck: number,
  direction: SetupDirection,
): number | undefined {
  if (direction === "down") {
    const top1 = levelByName(item.levels, "Top1");
    const top2 = levelByName(item.levels, "Top2");
    if (!top1 || !top2) return undefined;
    return Math.abs(Math.max(top1.price, top2.price) - neck);
  }
  const bottom1 = levelByName(item.levels, "Bottom1");
  const bottom2 = levelByName(item.levels, "Bottom2");
  if (!bottom1 || !bottom2) return undefined;
  return Math.abs(neck - Math.min(bottom1.price, bottom2.price));
}

function levelByName(levels: readonly Level[], name: LevelName): Level | undefined {
  return levels.find((level) => level.name === name);
}
