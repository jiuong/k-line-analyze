import type { HostChildRenderer } from "@trading-playback/kline-chart";
import type {
  AnalysisResult,
  AnalyzeResult,
  Level,
  LevelName,
} from "../types/analysis.js";
import type { SetupReport } from "../utils/setupMeasure.js";
import { countedEntryShort, countedEntrySide } from "../utils/secondEntries.js";
import { toEast8TimeString } from "../utils/time.js";

export const ANALYSIS_OVERLAY_ID = "analysis-levels";

export type LevelMark = {
  functionId: string;
  resultName: string;
  name: LevelName;
  price: number;
  time: string;
};

type PlotArea = { x: number; y: number; width: number; height: number };

export type OverlayCoords = {
  timeToX(time: string): number;
  priceToY(price: number): number;
  getPlotArea(): PlotArea;
  getBarSlotWidth(): number;
};

type OverlayCanvas = {
  save(): void;
  restore(): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  globalAlpha: number;
  textAlign: CanvasTextAlign;
};

export type OverlayInputs = {
  results: readonly AnalysisResult[];
  reports?: readonly SetupReport[];
};

/** One mark per `results[].levels` entry. Time is East-8 bar open. */
export function collectLevelMarks(
  results: readonly AnalysisResult[],
): LevelMark[] {
  const marks: LevelMark[] = [];
  for (const result of results) {
    for (const item of result.results) {
      pushLevels(marks, result.functionId, item);
    }
    for (const item of attachedPullbacks(result)) {
      pushLevels(marks, result.functionId, item);
    }
  }
  return marks;
}

export function createAnalysisRenderer(
  getInputs: () => OverlayInputs,
): HostChildRenderer {
  return {
    id: ANALYSIS_OVERLAY_ID,
    render(ctx, cs) {
      const { results, reports = [] } = getInputs();
      drawAnalysisOverlay(ctx, cs, results);
      drawSetupReports(ctx, cs, reports);
    },
  };
}

export function drawAnalysisOverlay(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  results: readonly AnalysisResult[],
): void {
  const plot = cs.getPlotArea();
  ctx.save();
  ctx.font = "12px sans-serif";

  for (const result of results) {
    for (const item of result.results) {
      if (result.functionId === "classifyTradingRange") {
        drawRangeLines(ctx, cs, item);
      } else if (result.functionId === "classifyBodyGap") {
        drawGapLines(ctx, cs, item);
      } else if (result.functionId === "classifyTrendlineBreak") {
        drawBrokenRail(ctx, cs, item);
      } else {
        drawRange(ctx, cs, plot, item);
      }
    }
    for (const item of attachedPullbacks(result)) {
      drawRange(ctx, cs, plot, item);
    }
  }

  for (const mark of collectLevelMarks(results)) {
    if (!isDrawnMark(mark)) continue;
    const x = cs.timeToX(mark.time);
    const y = cs.priceToY(mark.price);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.fillStyle = markColor(mark);
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e6edf3";
    ctx.fillText(displayMarkText(mark), x + 6, y - 6);
  }

  ctx.restore();
}

/**
 * Horizontal Entry / Stop / Target segments over each trade and each Fail
 * signal's pattern range (half a bar-slot past each end), with same-color
 * labels at both ends. A Fail mark sits at the signal price.
 */
export function drawSetupReports(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  reports: readonly SetupReport[],
): void {
  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  const halfSlot = cs.getBarSlotWidth() / 2;
  for (const report of reports) {
    for (const trade of report.trades) {
      drawPlanLines(
        ctx,
        cs,
        halfSlot,
        trade.range,
        trade.entry,
        trade.stop,
        trade.target,
        trade.targets,
      );
    }
    for (const signal of report.invalid) {
      drawPlanLines(
        ctx,
        cs,
        halfSlot,
        signal.range,
        signal.entry,
        signal.stop,
        signal.target,
        signal.targets,
      );
      const x = cs.timeToX(toEast8TimeString(signal.signalTime));
      const y = cs.priceToY(signal.signalPrice);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      ctx.beginPath();
      ctx.fillStyle = RED;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.textAlign = "left";
      ctx.fillText("Fail", x + 6, y - 6);
    }
  }

  ctx.restore();
}

function drawPlanLines(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  halfSlot: number,
  range: { start: string; end?: string },
  entry: number,
  stop: number,
  target: number,
  targets?: readonly { name: string; price: number }[],
): void {
  const startX = cs.timeToX(toEast8TimeString(range.start));
  const endX = range.end ? cs.timeToX(toEast8TimeString(range.end)) : startX;
  if (!Number.isFinite(startX) || !Number.isFinite(endX)) return;
  const left = Math.min(startX, endX) - halfSlot;
  const right = Math.max(startX, endX) + halfSlot;
  drawSetupLine(ctx, left, right, cs.priceToY(entry), "Entry", ENTRY);
  drawSetupLine(ctx, left, right, cs.priceToY(stop), "Stop", RED);
  if (targets !== undefined && targets.length > 0) {
    for (const level of targets) {
      drawSetupLine(ctx, left, right, cs.priceToY(level.price), level.name, GREEN);
    }
  } else {
    drawSetupLine(ctx, left, right, cs.priceToY(target), "Target", GREEN);
  }
}

function drawSetupLine(
  ctx: OverlayCanvas,
  left: number,
  right: number,
  y: number,
  label: string,
  color: string,
): void {
  if (!Number.isFinite(y)) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(label, left + 6, y - 6);
  ctx.textAlign = "right";
  ctx.fillText(label, right - 6, y - 6);
  ctx.textAlign = "left";
}

function pushLevels(
  marks: LevelMark[],
  functionId: string,
  item: { name: string; levels: readonly Level[] },
): void {
  for (const level of item.levels) {
    marks.push({
      functionId,
      resultName: item.name,
      name: level.name,
      price: level.price,
      time: toEast8TimeString(level.time),
    });
  }
}

/** Pullbacks stored on a trend segment. Other analyzers have none. */
function attachedPullbacks(result: AnalysisResult): AnalyzeResult[] {
  if (result.functionId !== "classifyTrendWithPullbacks") return [];
  const segments = (
    result.evidence as { segments?: { pullbacks?: AnalyzeResult[] }[] }
  ).segments;
  if (!Array.isArray(segments)) return [];
  return segments.flatMap((segment) => segment.pullbacks ?? []);
}

const TREND_ENDPOINTS = new Set<LevelName>([
  "BullTrendStart",
  "BullTrendEnd",
  "BearTrendStart",
  "BearTrendEnd",
]);

function isDrawnMark(mark: LevelMark): boolean {
  if (mark.functionId === "classifyReversalSignal") return mark.name === "K2";
  if (mark.functionId === "classifyTradingRange") return false;
  if (mark.functionId === "classifyBodyGap") return false;
  if (mark.functionId === "classifyTrendlineBreak") return mark.name === "BreakBar";
  if (mark.functionId === "classifySwingTrend") {
    return !TREND_ENDPOINTS.has(mark.name);
  }
  return true;
}

function drawRangeLines(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  item: AnalyzeResult,
): void {
  drawHorizontalLevels(
    ctx,
    cs,
    item,
    (name) => name === "RangeHigh" || name === "RangeLow",
    (name) => (name === "RangeHigh" ? RED : GREEN),
  );
}

function drawBrokenRail(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  item: AnalyzeResult,
): void {
  if (item.name !== "bull_line_break" && item.name !== "bear_line_break") return;
  const touches = item.levels.filter((level) => level.name !== "BreakBar");
  const breakBar = item.levels.find((level) => level.name === "BreakBar");
  if (touches.length < 2 || !breakBar) return;
  const [first, second] = touches;
  const x1 = cs.timeToX(toEast8TimeString(first!.time));
  const y1 = cs.priceToY(first!.price);
  const x2 = cs.timeToX(toEast8TimeString(second!.time));
  const y2 = cs.priceToY(second!.price);
  const xBreak = cs.timeToX(toEast8TimeString(breakBar.time));
  if (![x1, y1, x2, y2, xBreak].every(Number.isFinite) || x1 === x2) return;
  const yBreak = y1 + ((y2 - y1) * (xBreak - x1)) / (x2 - x1);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.strokeStyle = item.name === "bull_line_break" ? RED : GREEN;
  ctx.moveTo(x1, y1);
  ctx.lineTo(xBreak, yBreak);
  ctx.stroke();
}

function drawGapLines(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  item: AnalyzeResult,
): void {
  drawHorizontalLevels(
    ctx,
    cs,
    item,
    (name) => name === "GapNear" || name === "GapFar",
    () => RANGE_NEUTRAL,
  );
}

function drawHorizontalLevels(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  item: AnalyzeResult,
  accept: (name: LevelName) => boolean,
  color: (name: LevelName) => string,
): void {
  const startX = cs.timeToX(toEast8TimeString(item.range.start));
  const endX = item.range.end
    ? cs.timeToX(toEast8TimeString(item.range.end))
    : startX;
  if (!Number.isFinite(startX) || !Number.isFinite(endX)) return;
  const halfSlot = cs.getBarSlotWidth() / 2;
  const left = Math.min(startX, endX) - halfSlot;
  const right = Math.max(startX, endX) + halfSlot;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  for (const level of item.levels) {
    if (!accept(level.name)) continue;
    const y = cs.priceToY(level.price);
    if (!Number.isFinite(y)) continue;
    ctx.beginPath();
    ctx.strokeStyle = color(level.name);
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = "#e6edf3";
    ctx.fillText(level.name, right + 6, y - 6);
  }
}

function drawRange(
  ctx: OverlayCanvas,
  cs: OverlayCoords,
  plot: PlotArea,
  item: AnalyzeResult,
): void {
  const startX = cs.timeToX(toEast8TimeString(item.range.start));
  const endX = item.range.end
    ? cs.timeToX(toEast8TimeString(item.range.end))
    : startX;
  if (!Number.isFinite(startX) || !Number.isFinite(endX)) {
    return;
  }
  const left = Math.min(startX, endX);
  const width = Math.max(2, Math.abs(endX - startX));
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = rangeColor(item.name);
  ctx.fillRect(left, plot.y, width, plot.height);
}

const GREEN = "#3fb950";
const RED = "#f85149";
const ENTRY = "#8b949e";

const RANGE_NEUTRAL = "#d2a8ff";

const NEUTRAL_RANGES = new Set([
  "trading_range",
  "bar_pullback",
  "multi_leg_pullback",
  "leg_pullback",
]);

/** Bull marks are red; bear marks are green, matching the candle colors. */
function rangeColor(name: string): string {
  if (name === "bull_reversal") return RED;
  if (name === "bear_reversal") return GREEN;
  if (NEUTRAL_RANGES.has(name)) return RANGE_NEUTRAL;
  if (name === "bull_trend" || name === "minor_bull_trend") return RED;
  if (name === "bear_trend" || name === "minor_bear_trend") return GREEN;
  if (countedEntrySide(name) === "high") return RED;
  if (countedEntrySide(name) === "low") return GREEN;
  return name.includes("bear") || name.includes("low") ? GREEN : RED;
}

function markColor(mark: LevelMark): string {
  if (mark.resultName === "bull_reversal" || mark.resultName === "bull_line_break") return RED;
  if (mark.resultName === "bear_reversal" || mark.resultName === "bear_line_break") return GREEN;
  if (countedEntrySide(mark.resultName) === "high") return RED;
  if (countedEntrySide(mark.resultName) === "low") return GREEN;
  return levelColor(mark.name);
}

function levelColor(name: LevelName): string {
  if (
    name.startsWith("H") ||
    name.startsWith("Top") ||
    name === "RangeHigh" ||
    name.startsWith("BullTrend")
  ) {
    return RED;
  }
  if (
    name.startsWith("L") ||
    name.startsWith("Bottom") ||
    name === "RangeLow" ||
    name.startsWith("BearTrend")
  ) {
    return GREEN;
  }
  return "#d2a8ff";
}

/** Overlay shorthand: H1–H3 / L1–L3 as-is; SignalBar on highN/lowN becomes HN/LN. */
export function displayMarkText(mark: LevelMark): string {
  if (
    mark.name === "H1" ||
    mark.name === "H2" ||
    mark.name === "H3" ||
    mark.name === "L1" ||
    mark.name === "L2" ||
    mark.name === "L3"
  ) {
    return mark.name;
  }
  if (mark.name === "SignalBar") {
    const short = countedEntryShort(mark.resultName);
    if (short !== undefined) return short;
  }
  return mark.name;
}
