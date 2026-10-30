import { describe, expect, it, vi } from "vitest";
import {
  collectLevelMarks,
  createAnalysisRenderer,
  displayMarkText,
  drawAnalysisOverlay,
  drawSetupReports,
  type OverlayCoords,
} from "../../src/chart/overlayAnalysis.js";
import type { AnalysisResult } from "../../src/types/analysis.js";
import type { SetupReport } from "../../src/utils/setupMeasure.js";

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
          { name: "BullTrendStart", price: 9, time: "2024-01-01T00:00:00Z" },
          { name: "BullTrendEnd", price: 13, time: "2024-01-01T01:00:00Z" },
          { name: "H1", price: 11, time: "2024-01-01T00:30:00Z" },
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
    getBarSlotWidth: () => 10,
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
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    globalAlpha: 1,
    textAlign: "left" as CanvasTextAlign,
  };
}

describe("collectLevelMarks", () => {
  it("maps each level 1:1 with East-8 bar-open time", () => {
    const marks = collectLevelMarks(results);
    expect(marks).toEqual([
      {
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "BullTrendStart",
        price: 9,
        time: "2024-01-01T08:00:00+08:00",
      },
      {
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "BullTrendEnd",
        price: 13,
        time: "2024-01-01T09:00:00+08:00",
      },
      {
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "H1",
        price: 11,
        time: "2024-01-01T08:30:00+08:00",
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

describe("displayMarkText", () => {
  it("keeps H1 and maps SignalBar on high1 to H1", () => {
    expect(
      displayMarkText({
        functionId: "classifySwingTrend",
        resultName: "bull_trend",
        name: "H1",
        price: 1,
        time: "t",
      }),
    ).toBe("H1");
    expect(
      displayMarkText({
        functionId: "classifySecondEntry",
        resultName: "high2",
        name: "SignalBar",
        price: 1,
        time: "t",
      }),
    ).toBe("H2");
    expect(
      displayMarkText({
        functionId: "classifySecondEntry",
        resultName: "high4",
        name: "SignalBar",
        price: 1,
        time: "t",
      }),
    ).toBe("H4");
    expect(
      displayMarkText({
        functionId: "classifySecondEntry",
        resultName: "high1",
        name: "Entry",
        price: 1,
        time: "t",
      }),
    ).toBe("Entry");
  });
});

describe("drawAnalysisOverlay", () => {
  it("draws H/L and K2, and skips swing-trend endpoints", () => {
    const ctx = fakeCtx();
    const renderer = createAnalysisRenderer(() => ({ results }));
    renderer.render(
      ctx as unknown as CanvasRenderingContext2D,
      coords() as never,
      {} as never,
    );
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.fillText).not.toHaveBeenCalledWith("BullTrendStart", 46, 14);
    expect(ctx.fillText).not.toHaveBeenCalledWith("BullTrendEnd", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("H1", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("K2", 46, 14);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("draws swing-trend H/L entry counts and skips segment endpoints", () => {
    const ctx = fakeCtx();
    drawAnalysisOverlay(ctx, coords(), [
      {
        functionId: "classifySwingTrend",
        results: [
          {
            name: "bear_trend",
            range: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T01:00:00Z",
            },
            levels: [
              { name: "BearTrendStart", price: 13, time: "2024-01-01T00:00:00Z" },
              { name: "BearTrendEnd", price: 9, time: "2024-01-01T01:00:00Z" },
              { name: "L1", price: 12, time: "2024-01-01T00:15:00Z" },
              { name: "L2", price: 11, time: "2024-01-01T00:30:00Z" },
              { name: "L3", price: 10, time: "2024-01-01T00:45:00Z" },
            ],
          },
        ],
        summary: "trends=1",
        confidence: 1,
        evidence: {},
      },
    ]);

    expect(ctx.fillText).toHaveBeenCalledWith("L1", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("L2", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("L3", 46, 14);
    expect(ctx.fillText).not.toHaveBeenCalledWith("BearTrendStart", 46, 14);
    expect(ctx.fillText).not.toHaveBeenCalledWith("BearTrendEnd", 46, 14);
    expect(ctx.arc).toHaveBeenCalledTimes(3);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("paints bull reversals red and bear reversals green", () => {
    const ctx = fakeCtx();
    const rangeColors: string[] = [];
    const dotColors: string[] = [];
    ctx.fillRect = vi.fn(() => {
      rangeColors.push(ctx.fillStyle);
    });
    ctx.arc = vi.fn(() => {
      dotColors.push(ctx.fillStyle);
    });

    drawAnalysisOverlay(ctx, coords(), [
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
              { name: "BullTrendStart", price: 9, time: "2024-01-01T00:00:00Z" },
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
            range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:02:00Z" },
            levels: [
              { name: "K1", price: 11, time: "2024-01-01T00:00:00Z" },
              { name: "K2", price: 9, time: "2024-01-01T00:01:00Z" },
              { name: "Confirm", price: 12, time: "2024-01-01T00:02:00Z" },
            ],
          },
          {
            name: "bear_reversal",
            range: { start: "2024-01-01T00:02:00Z", end: "2024-01-01T00:04:00Z" },
            levels: [
              { name: "K1", price: 8, time: "2024-01-01T00:02:00Z" },
              { name: "K2", price: 13, time: "2024-01-01T00:03:00Z" },
              { name: "Confirm", price: 7, time: "2024-01-01T00:04:00Z" },
            ],
          },
        ],
        summary: "reversals=2",
        confidence: 1,
        evidence: {},
      },
    ]);

    expect(rangeColors).toEqual(["#f85149", "#f85149", "#3fb950"]);
    expect(dotColors).toEqual(["#f85149", "#3fb950"]);
    expect(ctx.fillText).not.toHaveBeenCalledWith("BullTrendStart", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("K2", 46, 14);
    expect(ctx.fillText).not.toHaveBeenCalledWith("K1", 46, 14);
    expect(ctx.fillText).not.toHaveBeenCalledWith("Confirm", 46, 14);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it("paints minor bull red, minor bear green, and trading range neutral", () => {
    const ctx = fakeCtx();
    const rangeColors: string[] = [];
    ctx.fillRect = vi.fn(() => {
      rangeColors.push(ctx.fillStyle);
    });

    drawAnalysisOverlay(ctx, coords(), [
      {
        functionId: "classifySwingTrend",
        results: [
          {
            name: "minor_bull_trend",
            range: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T00:01:00Z",
            },
            levels: [],
          },
          {
            name: "minor_bear_trend",
            range: {
              start: "2024-01-01T00:01:00Z",
              end: "2024-01-01T00:02:00Z",
            },
            levels: [],
          },
          {
            name: "trading_range",
            range: {
              start: "2024-01-01T00:02:00Z",
              end: "2024-01-01T00:03:00Z",
            },
            levels: [],
          },
        ],
        summary: "trends=0",
        confidence: 1,
        evidence: {},
      },
    ]);

    expect(rangeColors).toEqual(["#f85149", "#3fb950", "#d2a8ff"]);
  });

  it("draws trading-range highs and lows as horizontal lines across every bar", () => {
    const ctx = fakeCtx();
    const lineColors: string[] = [];
    ctx.stroke = vi.fn(() => {
      lineColors.push(String(ctx.strokeStyle));
    });
    const cs: OverlayCoords = {
      timeToX: (time) => (time.includes("T08:00:00") ? 40 : 100),
      priceToY: (price) => (price === 1 ? 80 : 20),
      getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
      getBarSlotWidth: () => 10,
    };

    drawAnalysisOverlay(ctx, cs, [
      {
        functionId: "classifyTradingRange",
        results: [
          {
            name: "broad_trading_range",
            range: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T00:04:00Z",
            },
            levels: [
              { name: "RangeLow", price: 1, time: "2024-01-01T00:00:00Z" },
              { name: "RangeHigh", price: 5, time: "2024-01-01T00:02:00Z" },
            ],
          },
        ],
        summary: "ranges=1",
        confidence: 1,
        evidence: { segments: [] },
      },
    ]);

    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 35, 80);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 105, 80);
    expect(ctx.moveTo).toHaveBeenNthCalledWith(2, 35, 20);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(2, 105, 20);
    expect(lineColors).toEqual(["#3fb950", "#f85149"]);
    expect(ctx.fillText).toHaveBeenCalledWith("RangeLow", 111, 74);
    expect(ctx.fillText).toHaveBeenCalledWith("RangeHigh", 111, 14);
  });

  it("draws body-gap edges as horizontal lines and skips a vertical band", () => {
    const ctx = fakeCtx();
    const lineColors: string[] = [];
    ctx.stroke = vi.fn(() => {
      lineColors.push(String(ctx.strokeStyle));
    });
    const cs: OverlayCoords = {
      timeToX: (time) => (time.includes("T08:00:00") ? 40 : 100),
      priceToY: (price) => (price === 10 ? 80 : 20),
      getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
      getBarSlotWidth: () => 10,
    };

    drawAnalysisOverlay(ctx, cs, [
      {
        functionId: "classifyBodyGap",
        results: [
          {
            name: "filled_body_gap",
            range: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T00:04:00Z",
            },
            levels: [
              { name: "GapNear", price: 10, time: "2024-01-01T00:00:00Z" },
              { name: "GapFar", price: 12, time: "2024-01-01T00:02:00Z" },
            ],
          },
        ],
        summary: "gaps=1; last=filled_body_gap",
        confidence: 1,
        evidence: {},
      },
    ]);

    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenNthCalledWith(1, 35, 80);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(1, 105, 80);
    expect(ctx.moveTo).toHaveBeenNthCalledWith(2, 35, 20);
    expect(ctx.lineTo).toHaveBeenNthCalledWith(2, 105, 20);
    expect(lineColors).toEqual(["#d2a8ff", "#d2a8ff"]);
    expect(ctx.fillText).toHaveBeenCalledWith("GapNear", 111, 74);
    expect(ctx.fillText).toHaveBeenCalledWith("GapFar", 111, 14);
  });

  it("draws the broken rail through the break bar and a BreakBar dot", () => {
    const ctx = fakeCtx();
    const lineColors: string[] = [];
    ctx.stroke = vi.fn(() => {
      lineColors.push(String(ctx.strokeStyle));
    });
    const dotColors: string[] = [];
    ctx.fill = vi.fn(() => {
      dotColors.push(String(ctx.fillStyle));
    });
    const cs: OverlayCoords = {
      timeToX: (time) => {
        if (time.includes("T08:00:00")) return 40;
        if (time.includes("T08:02:00")) return 80;
        return 120;
      },
      priceToY: (price) => {
        if (price === 10) return 80;
        if (price === 12) return 40;
        return 10;
      },
      getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
      getBarSlotWidth: () => 10,
    };

    drawAnalysisOverlay(ctx, cs, [
      {
        functionId: "classifyTrendlineBreak",
        results: [
          {
            name: "bull_line_break",
            range: { start: "2024-01-01T00:04:00Z" },
            levels: [
              { name: "BreakBar", price: 14, time: "2024-01-01T00:04:00Z" },
              { name: "ChannelHigh1", price: 10, time: "2024-01-01T00:00:00Z" },
              { name: "ChannelHigh2", price: 12, time: "2024-01-01T00:02:00Z" },
            ],
          },
        ],
        summary: "breaks=1; last=bull_line_break",
        confidence: 1,
        evidence: {},
      },
    ]);

    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledWith(40, 80);
    expect(ctx.lineTo).toHaveBeenCalledWith(120, 0);
    expect(lineColors).toEqual(["#f85149"]);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledWith(120, 10, 4, 0, Math.PI * 2);
    expect(dotColors).toEqual(["#f85149"]);
    expect(ctx.fillText).toHaveBeenCalledWith("BreakBar", 126, 4);
  });

  it("draws an inner pullback band and its level dots", () => {
    const ctx = fakeCtx();
    drawAnalysisOverlay(ctx, coords(), [
      {
        functionId: "classifyTrendWithPullbacks",
        results: [
          {
            name: "bull_trend",
            range: {
              start: "2024-01-01T00:00:00Z",
              end: "2024-01-01T01:00:00Z",
            },
            levels: [
              { name: "BullTrendStart", price: 9, time: "2024-01-01T00:00:00Z" },
              { name: "BullTrendEnd", price: 13, time: "2024-01-01T01:00:00Z" },
            ],
          },
        ],
        summary: "trends=1; annotated=1; pullbacks=1; last=bull_trend children=1",
        confidence: 1,
        evidence: {
          segments: [
            {
              pullbacks: [
                {
                  name: "bar_pullback",
                  range: {
                    start: "2024-01-01T00:20:00Z",
                    end: "2024-01-01T00:20:00Z",
                  },
                  levels: [
                    {
                      name: "PullbackStart",
                      price: 12,
                      time: "2024-01-01T00:10:00Z",
                    },
                    {
                      name: "PullbackExtreme",
                      price: 10,
                      time: "2024-01-01T00:20:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillText).toHaveBeenCalledWith("PullbackStart", 46, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("PullbackExtreme", 46, 14);
    const marks = collectLevelMarks([
      {
        functionId: "classifyTrendWithPullbacks",
        results: [],
        summary: "trends=0",
        confidence: 1,
        evidence: {
          segments: [
            {
              pullbacks: [
                {
                  name: "bar_pullback",
                  range: { start: "2024-01-01T00:00:00Z" },
                  levels: [
                    {
                      name: "PullbackExtreme",
                      price: 10,
                      time: "2024-01-01T00:00:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);
    expect(marks).toEqual([
      {
        functionId: "classifyTrendWithPullbacks",
        resultName: "bar_pullback",
        name: "PullbackExtreme",
        price: 10,
        time: "2024-01-01T08:00:00+08:00",
      },
    ]);
  });
});

describe("drawSetupReports", () => {
  it("draws Entry Stop Target segments over the pattern range only", () => {
    const ctx = fakeCtx();
    const lineColors: string[] = [];
    const labels: string[] = [];
    ctx.stroke = vi.fn(() => {
      lineColors.push(String(ctx.strokeStyle));
    });
    ctx.fillText = vi.fn((text: string) => {
      labels.push(text);
    });
    const cs: OverlayCoords = {
      timeToX: (time) => (time.includes("T08:00:00") ? 40 : 100),
      priceToY: (price) => {
        if (price === 100) return 40;
        if (price === 90) return 60;
        return 20;
      },
      getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
      getBarSlotWidth: () => 10,
    };
    const report: SetupReport = {
      functionId: "measureSecondEntry",
      trades: [
        {
          basis: "high1",
          direction: "up",
          signalTime: "2024-01-01T01:00:00Z",
          signalPrice: 99,
          entry: 100,
          stop: 90,
          target: 120,
          risk: 10,
          reward: 20,
          rewardRisk: 2,
          maxRewardRisk: 1.5,
          outcome: "open",
          range: {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T01:00:00Z",
          },
        },
      ],
      stats: {
        count: 1,
        filled: 1,
        wins: 0,
        losses: 0,
        open: 1,
        unfilled: 0,
        winRate: null,
        avgRewardRisk: null,
      },
      byBasis: {},
      invalid: [],
    };

    drawSetupReports(ctx, cs, [report]);

    // halfSlot=5 → left=35, right=105
    expect(ctx.moveTo).toHaveBeenCalledWith(35, 40);
    expect(ctx.lineTo).toHaveBeenCalledWith(105, 40);
    expect(ctx.moveTo).toHaveBeenCalledWith(35, 60);
    expect(ctx.lineTo).toHaveBeenCalledWith(105, 60);
    expect(ctx.moveTo).toHaveBeenCalledWith(35, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(105, 20);
    expect(lineColors).toEqual(["#8b949e", "#f85149", "#3fb950"]);
    expect(labels).toEqual([
      "Entry",
      "Entry",
      "Stop",
      "Stop",
      "Target",
      "Target",
    ]);
    expect(ctx.fillText).toHaveBeenCalledWith("Entry", 41, 34);
    expect(ctx.fillText).toHaveBeenCalledWith("Entry", 99, 34);
    expect(ctx.fillText).toHaveBeenCalledWith("Stop", 41, 54);
    expect(ctx.fillText).toHaveBeenCalledWith("Stop", 99, 54);
    expect(ctx.fillText).toHaveBeenCalledWith("Target", 41, 14);
    expect(ctx.fillText).toHaveBeenCalledWith("Target", 99, 14);
  });

  it("draws plan lines and a Fail mark for an unordered signal", () => {
    const ctx = fakeCtx();
    const cs: OverlayCoords = {
      timeToX: (time) => (time.includes("T08:30:00") ? 70 : 40),
      priceToY: () => 30,
      getPlotArea: () => ({ x: 0, y: 0, width: 200, height: 100 }),
      getBarSlotWidth: () => 10,
    };
    const report: SetupReport = {
      functionId: "measureSecondEntry",
      trades: [],
      invalid: [
        {
          basis: "high1",
          direction: "up",
          signalTime: "2024-01-01T00:30:00Z",
          signalPrice: 11,
          entry: 12,
          stop: 9,
          target: 10,
          range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:30:00Z" },
        },
      ],
      stats: {
        count: 0,
        filled: 0,
        wins: 0,
        losses: 0,
        open: 0,
        unfilled: 0,
        winRate: null,
        avgRewardRisk: null,
      },
      byBasis: {},
    };

    drawSetupReports(ctx, cs, [report]);

    expect(ctx.moveTo).toHaveBeenCalledWith(35, 30);
    expect(ctx.lineTo).toHaveBeenCalledWith(75, 30);
    expect(ctx.fillText).toHaveBeenCalledWith("Entry", 41, 24);
    expect(ctx.fillText).toHaveBeenCalledWith("Stop", 41, 24);
    expect(ctx.fillText).toHaveBeenCalledWith("Target", 41, 24);
    expect(ctx.arc).toHaveBeenCalledWith(70, 30, 4, 0, Math.PI * 2);
    expect(ctx.fillText).toHaveBeenCalledWith("Fail", 76, 24);
    expect(ctx.fillStyle).toBe("#f85149");
  });
});
