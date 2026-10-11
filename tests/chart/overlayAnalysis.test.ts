import { describe, expect, it, vi } from "vitest";
import {
  collectLevelMarks,
  createAnalysisRenderer,
  drawAnalysisOverlay,
  type OverlayCoords,
} from "../../src/chart/overlayAnalysis.js";
import type { AnalysisResult } from "../../src/types/analysis.js";

const results: AnalysisResult[] = [
  {
    functionId: "classifySwingTrend",
    results: [
      {
        name: "bull_trend",
        range: {
          start: "2024-01-01T00:00:00Z",
          end: "2024-01-01T01:00:00Z",
        },
        levels: [
          { name: "L1", price: 9, time: "2024-01-01T00:00:00Z" },
          { name: "H1", price: 13, time: "2024-01-01T01:00:00Z" },
        ],
      },
    ],
    summary: "trends=1",
    confidence: 1,
    evidence: {},
  },
  {
    functionId: "classifyReversalSignal",
    results: [
      {
        name: "bull_reversal",
        range: { start: "2024-01-01T00:00:00Z" },
        levels: [{ name: "K2", price: 11, time: "2024-01-01T00:00:00Z" }],
      },
    ],
    summary: "reversals=1",
    confidence: 1,
    evidence: {},
  },
];

function coords(): OverlayCoords {
  return {
    timeToX: () => 40,
    priceToY: () => 20,
    getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
  };
}

function fakeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    font: "",
    globalAlpha: 1,
  };
}

describe("collectLevelMarks", () => {
  it("maps each level 1:1 with East-8 bar-open time", () => {
    const marks = collectLevelMarks(results);
    expect(marks).toEqual([
      {
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "L1",
        price: 9,
        time: "2024-01-01T08:00:00+08:00",
      },
      {
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "H1",
        price: 13,
        time: "2024-01-01T09:00:00+08:00",
      },
      {
        functionId: "classifyReversalSignal",
        resultName: "bull_reversal",
        name: "K2",
        price: 11,
        time: "2024-01-01T08:00:00+08:00",
      },
    ]);
  });
});

describe("drawAnalysisOverlay", () => {
  it("draws one point per level on layer renderer input", () => {
    const ctx = fakeCtx();
    const renderer = createAnalysisRenderer(() => results);
    renderer.render(
      ctx as unknown as CanvasRenderingContext2D,
      coords() as never,
      {} as never,
    );
    expect(ctx.arc).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledWith("L1", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("H1", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("K2", 46, 14);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
