/**
 * Chart adapter. The only module that may import `@trading-playback/kline-chart`.
 */
export { createChartHost, createDefaultChartHost } from "./host.js";
export type { ChartHost, ChartControls } from "./host.js";
export { mapBarsToKline } from "./mapBars.js";
export {
  ANALYSIS_OVERLAY_ID,
  collectLevelMarks,
  createAnalysisRenderer,
  displayMarkText,
  drawAnalysisOverlay,
  drawSetupReports,
} from "./overlayAnalysis.js";
export type { LevelMark, OverlayInputs } from "./overlayAnalysis.js";
