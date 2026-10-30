import { describe, expect, it } from "vitest";
import {
  REVIEW_TREE,
  collectTreeIds,
  reviewSidebarItems,
  runReview,
  visibleReviewResults,
} from "../../src/page/reviewModel.js";
import type { AnalysisResult } from "../../src/types/analysis.js";
import type { Bar } from "../../src/types/bars.js";

const T0 = 1_700_000_000;

function abcBull(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 22, 35, 20, 34),
    bar(3, 34, 55, 33, 54),
    bar(4, 54, 70, 53, 68),
    bar(5, 66, 67, 58, 59),
    bar(6, 59, 60, 50, 51),
    bar(7, 51, 58, 50.5, 57),
    bar(8, 57, 62, 56, 61),
    bar(9, 60, 61, 54, 55),
    bar(10, 55, 56, 52, 53),
    bar(11, 54, 72, 53, 71),
    bar(12, 71, 80, 70, 79),
    bar(13, 79, 78, 74, 75),
    bar(14, 75, 76, 73, 74),
  ];
}

function bar(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

const bars: Bar[] = [
  { time: 1_704_067_200, open: 1, high: 2, low: 0.5, close: 1.2 },
  { time: 1_704_070_800, open: 1.2, high: 1.5, low: 1, close: 1.1 },
  { time: 1_704_074_400, open: 1.1, high: 1.4, low: 0.9, close: 1 },
];

describe("REVIEW_TREE", () => {
  it("has six measure roots", () => {
    expect(REVIEW_TREE.map((node) => node.id)).toEqual([
      "measureSecondEntry",
      "measureFailedBreakout",
      "measureBreakoutPullback",
      "measureWedge",
      "measureMajorTrendReversal",
      "measureDoubleTopBottom",
    ]);
    expect(REVIEW_TREE.every((node) => node.kind === "measure")).toBe(true);
  });

  it("lists unique classify and measure ids", () => {
    expect(collectTreeIds(REVIEW_TREE, "measure")).toEqual([
      "measureSecondEntry",
      "measureFailedBreakout",
      "measureBreakoutPullback",
      "measureWedge",
      "measureMajorTrendReversal",
      "measureDoubleTopBottom",
    ]);
    expect(collectTreeIds(REVIEW_TREE, "classify")).toContain("classifySecondEntry");
    expect(collectTreeIds(REVIEW_TREE, "classify")).toContain("classifyTradingRange");
    expect(collectTreeIds(REVIEW_TREE, "classify")).not.toContain("classifyBodyGap");
  });
});

describe("reviewSidebarItems", () => {
  it("temporarily lists only the Second entry subtree", () => {
    const items = reviewSidebarItems();
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("measureSecondEntry");
    expect(ids.filter((id) => id.startsWith("measure"))).toEqual(["measureSecondEntry"]);
    expect(ids).toContain("classifySecondEntry");
    expect(ids).toContain("classifySwingTrend");
    expect(ids).toContain("classifySwingLeg");
    expect(ids).not.toContain("measureFailedBreakout");
    expect(ids).not.toContain("classifyTrendlineBreak");
  });

  it("can still flatten the full REVIEW_TREE when passed explicitly", () => {
    const ids = reviewSidebarItems(REVIEW_TREE).map((item) => item.id);
    expect(ids.slice(0, 6)).toEqual([
      "measureSecondEntry",
      "measureFailedBreakout",
      "measureBreakoutPullback",
      "measureWedge",
      "measureMajorTrendReversal",
      "measureDoubleTopBottom",
    ]);
  });
});

describe("runReview", () => {
  it("returns empty analysis and reports until something is enabled", () => {
    expect(runReview(bars)).toEqual({ analysis: [], reports: [] });
    expect(runReview(bars, {})).toEqual({ analysis: [], reports: [] });
  });

  it("runs only the enabled classify analyzer", () => {
    const { analysis, reports } = runReview(bars, {
      classifyIds: ["classifyReversalSignal"],
    });
    expect(analysis.map((item) => item.functionId)).toEqual([
      "classifyReversalSignal",
    ]);
    expect(reports).toEqual([]);
    expect(analysis[0]?.confidence).toBe(1);
    expect(analysis[0]?.results.length).toBeGreaterThan(0);
  });

  it("runs a measure without analysis when only the measure is enabled", () => {
    const { analysis, reports } = runReview(bars, {
      measureIds: ["measureSecondEntry"],
    });
    expect(analysis).toEqual([]);
    expect(reports.map((item) => item.functionId)).toEqual(["measureSecondEntry"]);
    expect(reports[0]?.stats).toMatchObject({
      count: expect.any(Number),
      filled: expect.any(Number),
    });
  });

  it("runs measure and its basis classify when both are enabled", () => {
    const { analysis, reports } = runReview(bars, {
      measureIds: ["measureSecondEntry"],
      classifyIds: ["classifySecondEntry"],
    });
    expect(reports.map((item) => item.functionId)).toEqual(["measureSecondEntry"]);
    expect(analysis.map((item) => item.functionId)).toEqual(["classifySecondEntry"]);
  });

  it("dedupes the same classify id listed twice", () => {
    const { analysis } = runReview(bars, {
      classifyIds: ["classifyTradingRange", "classifyTradingRange"],
    });
    expect(analysis.map((item) => item.functionId)).toEqual([
      "classifyTradingRange",
    ]);
  });

  it("runs the trendline-break analyzer when that checkbox is enabled", () => {
    const { analysis } = runReview(bars, {
      classifyIds: ["classifyTrendlineBreak"],
    });
    expect(analysis.map((item) => item.functionId)).toEqual([
      "classifyTrendlineBreak",
    ]);
    expect(analysis[0]?.confidence).toBe(1);
    expect(analysis[0]?.summary).toMatch(/^breaks=/);
  });

  it("runs the trading-range analyzer when that checkbox is enabled", () => {
    const { analysis } = runReview(bars, {
      classifyIds: ["classifyTradingRange"],
    });
    expect(analysis.map((item) => item.functionId)).toEqual([
      "classifyTradingRange",
    ]);
    expect(analysis[0]?.confidence).toBe(1);
  });

  it("forwards entryCount only to second entry", () => {
    const abc = abcBull();
    const counted = runReview(
      abc,
      {
        classifyIds: ["classifySecondEntry"],
        measureIds: ["measureSecondEntry"],
      },
      { entryCount: 1 },
    );
    expect(counted.analysis[0]?.results[0]?.name).toBe("high1");
    expect(counted.reports[0]?.trades[0]?.basis).toBe("high1");

    const swingAt = (entryCount?: number) => {
      const { analysis } = runReview(
        abc,
        { classifyIds: ["classifySwingTrend"] },
        entryCount === undefined ? undefined : { entryCount },
      );
      return analysis[0]!.results.flatMap((item) => item.levels.map((level) => level.name));
    };
    expect(swingAt(1)).toEqual(swingAt());
  });

  it("returns swing trend and reversal signal when both are enabled", () => {
    const { analysis } = runReview(bars, {
      classifyIds: ["classifySwingTrend", "classifyReversalSignal"],
    });
    expect(analysis.map((item) => item.functionId)).toEqual([
      "classifySwingTrend",
      "classifyReversalSignal",
    ]);
  });
});

const swingWithMinor: AnalysisResult = {
  functionId: "classifySwingTrend",
  results: [
    {
      name: "bull_trend",
      range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:04:00Z" },
      levels: [],
    },
    {
      name: "minor_bear_trend",
      range: { start: "2024-01-01T00:02:00Z", end: "2024-01-01T00:03:00Z" },
      levels: [],
    },
  ],
  summary: "trends=1; minor=1; ranges=0; last=bull_trend from=a to=b",
  confidence: 1,
  evidence: {},
};

function swingTrends(): AnalysisResult {
  return {
    functionId: "classifySwingTrend",
    results: [
      {
        name: "bull_trend",
        range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:10:00Z" },
        levels: [],
      },
      {
        name: "bear_trend",
        range: { start: "2024-01-01T00:10:00Z", end: "2024-01-01T00:20:00Z" },
        levels: [],
      },
      {
        name: "bull_trend",
        range: { start: "2024-01-01T00:20:00Z", end: "2024-01-01T00:40:00Z" },
        levels: [],
      },
    ],
    summary: "trends=3; minor=0; ranges=0; last=bull_trend from=a to=b",
    confidence: 1,
    evidence: {},
  };
}

function swingWithEntries(): AnalysisResult {
  return {
    functionId: "classifySwingTrend",
    results: [
      {
        name: "bull_trend",
        range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:04:00Z" },
        levels: [
          { name: "BullTrendStart", price: 9, time: "2024-01-01T00:00:00Z" },
          { name: "H1", price: 11, time: "2024-01-01T00:01:00Z" },
          { name: "H2", price: 12, time: "2024-01-01T00:01:00Z" },
          { name: "H3", price: 13, time: "2024-01-01T00:01:00Z" },
          { name: "L1", price: 8, time: "2024-01-01T00:02:00Z" },
          { name: "L2", price: 7, time: "2024-01-01T00:02:00Z" },
          { name: "L3", price: 6, time: "2024-01-01T00:02:00Z" },
          { name: "RangeHigh", price: 14, time: "2024-01-01T00:03:00Z" },
        ],
      },
    ],
    summary: "trends=1; minor=0; ranges=0; last=bull_trend from=a to=b",
    confidence: 1,
    evidence: {},
  };
}

function tradingRange(start: string, end: string): AnalysisResult {
  return {
    functionId: "classifyTradingRange",
    results: [
      {
        name: "broad_trading_range",
        range: { start, end },
        levels: [],
      },
    ],
    summary: "ranges=1",
    confidence: 1,
    evidence: { segments: [] },
  };
}

describe("visibleReviewResults", () => {
  it("hides minor-cycle trends and keeps the summary", () => {
    const [visible] = visibleReviewResults([swingWithMinor], false);
    expect(visible?.results.map((item) => item.name)).toEqual(["bull_trend"]);
    expect(visible?.summary).toBe(swingWithMinor.summary);
  });

  it("keeps minor-cycle trends when the sub-checkbox is on", () => {
    const [visible] = visibleReviewResults([swingWithMinor], true);
    expect(visible?.results.map((item) => item.name)).toEqual([
      "bull_trend",
      "minor_bear_trend",
    ]);
  });

  it("hides consecutive trends covered by one trading range", () => {
    const [swing, range] = visibleReviewResults(
      [swingTrends(), tradingRange("2024-01-01T00:00:00Z", "2024-01-01T00:20:00Z")],
      true,
    );
    expect(swing?.results.map((item) => item.name)).toEqual(["bull_trend"]);
    expect(swing?.summary).toBe("trends=3; minor=0; ranges=0; last=bull_trend from=a to=b");
    expect(range?.results).toHaveLength(1);
  });

  it("keeps trends when a range covers only one of them", () => {
    const [swing, range] = visibleReviewResults(
      [swingTrends(), tradingRange("2024-01-01T00:10:00Z", "2024-01-01T00:20:00Z")],
      true,
    );
    expect(swing?.results.map((item) => item.name)).toEqual([
      "bull_trend",
      "bear_trend",
      "bull_trend",
    ]);
    expect(range?.results).toHaveLength(1);
  });

  it("strips entry-count levels unless that sub-checkbox is on", () => {
    const swing = swingWithEntries();
    const [hidden] = visibleReviewResults([swing], true);
    expect(hidden?.results[0]?.levels.map((level) => level.name)).toEqual([
      "BullTrendStart",
      "RangeHigh",
    ]);
    expect(hidden?.summary).toBe(swing.summary);

    const [shown] = visibleReviewResults([swing], true, true);
    expect(shown?.results[0]?.levels.map((level) => level.name)).toEqual([
      "BullTrendStart",
      "H1",
      "H2",
      "H3",
      "L1",
      "L2",
      "L3",
      "RangeHigh",
    ]);
  });

  it("leaves other analyzers unchanged", () => {
    const reversal: AnalysisResult = {
      functionId: "classifyReversalSignal",
      results: [
        {
          name: "bull_reversal",
          range: { start: "2024-01-01T00:00:00Z" },
          levels: [],
        },
      ],
      summary: "reversals=1",
      confidence: 1,
      evidence: {},
    };
    expect(visibleReviewResults([reversal], false)).toEqual([reversal]);
  });
});
