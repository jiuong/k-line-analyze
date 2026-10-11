import type {
  HostChildRenderer,
  KlineBar,
} from "@trading-playback/kline-chart";
import type { AnalysisResult } from "../types/analysis.js";
import type { Bar, TimeFrame } from "../types/bars.js";
import { mapBarsToKline } from "./mapBars.js";
import { createAnalysisRenderer } from "./overlayAnalysis.js";

export type ChartCanvas = HTMLCanvasElement;

export interface ChartControls {
  mount(
    canvas: ChartCanvas,
    options?: { container?: HTMLElement | null },
  ): void;
  unmount(): void;
  setBars(bars: readonly KlineBar[]): void;
  setTimeViewport(viewport: { from: string; to: string }): void;
  registerOverlay(options: {
    layerId: "layer_drawings";
    renderer: HostChildRenderer;
  }): () => void;
  requestRedraw(): void;
  /** Library-owned pan, zoom, and crosshair. Not gesture logic. */
  attachPointerInteraction(canvas: ChartCanvas): () => void;
}

export type ChartHost = {
  mount(
    canvas: ChartCanvas,
    options?: { container?: HTMLElement | null },
  ): void;
  /** Replace candles for the window. Does not touch playback status. */
  setBars(bars: readonly Bar[], timeframe: TimeFrame): void;
  /** Replace overlay inputs and request a redraw. */
  setResults(results: readonly AnalysisResult[]): void;
  unmount(): void;
};

/**
 * Thin host around the chart library.
 * Playback status is never set. `reset()` is not used for refresh.
 */
export function createChartHost(chart: ChartControls): ChartHost {
  let results: readonly AnalysisResult[] = [];
  let unregister: (() => void) | null = null;

  return {
    mount(canvas, options) {
      chart.mount(canvas, options);
      chart.attachPointerInteraction(canvas);
      unregister?.();
      unregister = chart.registerOverlay({
        layerId: "layer_drawings",
        renderer: createAnalysisRenderer(() => results),
      });
    },
    setBars(bars, timeframe) {
      const kline = mapBarsToKline(bars, timeframe);
      chart.setBars(kline);
      const first = kline[0];
      const last = kline[kline.length - 1];
      if (first && last) {
        chart.setTimeViewport({ from: first.time, to: last.time });
      }
    },
    setResults(next) {
      results = next;
      chart.requestRedraw();
    },
    unmount() {
      unregister?.();
      unregister = null;
      results = [];
      chart.unmount();
    },
  };
}

export async function createDefaultChartHost(): Promise<ChartHost> {
  const chartLib = await import("@trading-playback/kline-chart");
  const chart = new chartLib.KlineChart();

  const controls: ChartControls = {
    mount(canvas, options) {
      chart.mount(canvas, options);
    },
    unmount() {
      chart.unmount();
    },
    setBars(bars) {
      chart.setBars(bars);
      // setBars stores candles but leaves bar slot width at 0, which stacks every
      // candle on one x. Fit the plot so the query window is actually visible.
      const plotWidth = Math.max(
        0,
        chart.getEngine().getWidth() - chartLib.PRICE_AXIS_WIDTH,
      );
      const fitted = chartLib.fitBarLayoutFromBars([...bars], plotWidth);
      if (fitted) {
        const store = chartLib.useKlineChartStore.getState();
        store.setBarLayout(fitted.layout);
        store.setPlotWidth(plotWidth);
        chart.requestRedraw();
      }
    },
    setTimeViewport(viewport) {
      chart.setTimeViewport(viewport);
    },
    registerOverlay(options) {
      return chart.registerOverlay(options);
    },
    requestRedraw() {
      chart.requestRedraw();
    },
    attachPointerInteraction(canvas) {
      return chart.attachPointerInteraction(canvas);
    },
  };

  return createChartHost(controls);
}
