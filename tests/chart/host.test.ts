import { describe, expect, it, vi } from "vitest";
import { createChartHost, type ChartControls } from "../../src/chart/host.js";
import { ANALYSIS_OVERLAY_ID } from "../../src/chart/overlayAnalysis.js";
import type { AnalysisResult } from "../../src/types/analysis.js";
import type { Bar } from "../../src/types/bars.js";

const bars: Bar[] = [
  { time: 1704067200, open: 10, high: 12, low: 9, close: 11 },
  { time: 1704070800, open: 11, high: 13, low: 10, close: 12 },
];

const analysis: AnalysisResult = {
  functionId: "classifySwingTrend",
  results: [
    {
      name: "bull_trend",
      range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T01:00:00Z" },
      levels: [{ name: "L1", price: 9, time: "2024-01-01T00:00:00Z" }],
    },
  ],
  summary: "trends=1",
  confidence: 1,
  evidence: {},
};

function fakeChart() {
  const unregister = vi.fn();
  const chart = {
    mount: vi.fn(),
    unmount: vi.fn(),
    setBars: vi.fn(),
    setTimeViewport: vi.fn(),
    registerOverlay: vi.fn(() => unregister),
    requestRedraw: vi.fn(),
    attachPointerInteraction: vi.fn(() => vi.fn()),
    setPlaybackStatus: vi.fn(),
    reset: vi.fn(),
  };
  return { chart, unregister };
}

describe("createChartHost", () => {
  it("mounts layer_drawings, maps bars, and refreshes without playback", () => {
    const { chart, unregister } = fakeChart();
    const host = createChartHost(chart as unknown as ChartControls);
    const canvas = {} as HTMLCanvasElement;

    host.mount(canvas, { container: null });
    host.setBars(bars, "H1");
    host.setResults([analysis]);
    host.setBars(bars, "H1");

    expect(chart.mount).toHaveBeenCalledWith(canvas, { container: null });
    expect(chart.attachPointerInteraction).toHaveBeenCalledWith(canvas);
    expect(chart.registerOverlay).toHaveBeenCalledTimes(1);
    expect(chart.registerOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        layerId: "layer_drawings",
        renderer: expect.objectContaining({ id: ANALYSIS_OVERLAY_ID }),
      }),
    );
    expect(chart.setBars).toHaveBeenCalledTimes(2);
    expect(chart.setBars).toHaveBeenCalledWith([
      {
        timeframe: "H1",
        time: "2024-01-01T08:00:00+08:00",
        open: 10,
        high: 12,
        low: 9,
        close: 11,
      },
      {
        timeframe: "H1",
        time: "2024-01-01T09:00:00+08:00",
        open: 11,
        high: 13,
        low: 10,
        close: 12,
      },
    ]);
    expect(chart.setTimeViewport).toHaveBeenCalledWith({
      from: "2024-01-01T08:00:00+08:00",
      to: "2024-01-01T09:00:00+08:00",
    });
    expect(chart.requestRedraw).toHaveBeenCalledTimes(1);
    expect(chart.setPlaybackStatus).not.toHaveBeenCalled();
    expect(chart.reset).not.toHaveBeenCalled();

    host.unmount();
    expect(unregister).toHaveBeenCalledOnce();
    expect(chart.unmount).toHaveBeenCalledOnce();
  });

  it("skips the time viewport when there are no bars", () => {
    const { chart } = fakeChart();
    const host = createChartHost(chart as unknown as ChartControls);
    host.setBars([], "H1");
    expect(chart.setBars).toHaveBeenCalledWith([]);
    expect(chart.setTimeViewport).not.toHaveBeenCalled();
  });
});
