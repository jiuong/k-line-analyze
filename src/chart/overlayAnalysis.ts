import type { HostChildRenderer } from "@trading-playback/kline-chart";
import type {
  AnalysisResult,
  AnalyzeResult,
  LevelName,
} from "../types/analysis.js";
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
};

type OverlayCanvas = {
  save(): void;
  restore(): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  globalAlpha: number;
};

/** One mark per `results[].levels` entry. Time is East-8 bar open. */
export function collectLevelMarks(
  results: readonly AnalysisResult[],
): LevelMark[] {
  const marks: LevelMark[] = [];
  for (const result of results) {
    for (const item of result.results) {
      for (const level of item.levels) {
        marks.push({
          functionId: result.functionId,
          resultName: item.name,
          name: level.name,
          price: level.price,
          time: toEast8TimeString(level.time),
        });
      }
    }
  }
  return marks;
}

export function createAnalysisRenderer(
  getResults: () => readonly AnalysisResult[],
): HostChildRenderer {
  return {
    id: ANALYSIS_OVERLAY_ID,
    render(ctx, cs) {
      drawAnalysisOverlay(ctx, cs, getResults());
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
      drawRange(ctx, cs, plot, item);
    }
  }

  for (const mark of collectLevelMarks(results)) {
    const x = cs.timeToX(mark.time);
    const y = cs.priceToY(mark.price);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.fillStyle = levelColor(mark.name);
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e6edf3";
    ctx.fillText(mark.name, x + 6, y - 6);
  }

  ctx.restore();
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
  ctx.fillStyle = item.name.startsWith("bear") ? "#f85149" : "#3fb950";
  ctx.fillRect(left, plot.y, width, plot.height);
}

function levelColor(name: LevelName): string {
  if (name.startsWith("H") || name.startsWith("Top")) {
    return "#3fb950";
  }
  if (name.startsWith("L") || name.startsWith("Bottom")) {
    return "#f85149";
  }
  return "#d2a8ff";
}
