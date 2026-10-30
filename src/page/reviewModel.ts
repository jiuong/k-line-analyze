import { classifyBreakoutPullback } from "../analyze/classifyBreakoutPullback.js";
import { classifyChannel } from "../analyze/classifyChannel.js";
import { classifyDoubleTopBottom } from "../analyze/classifyDoubleTopBottom.js";
import { classifyExtremeRetest } from "../analyze/classifyExtremeRetest.js";
import { classifyFailedBreakout } from "../analyze/classifyFailedBreakout.js";
import { classifyFollowThrough } from "../analyze/classifyFollowThrough.js";
import { classifyMajorTrendReversal } from "../analyze/classifyMajorTrendReversal.js";
import { classifyRangeBreak } from "../analyze/classifyRangeBreak.js";
import { classifyReversalSignal } from "../analyze/classifyReversalSignal.js";
import { classifySecondEntry } from "../analyze/classifySecondEntry.js";
import { classifySwingLeg } from "../analyze/classifySwingLeg.js";
import { classifySwingTrend } from "../analyze/classifySwingTrend.js";
import { classifyTradingRange } from "../analyze/classifyTradingRange.js";
import { classifyTrendlineBreak } from "../analyze/classifyTrendlineBreak.js";
import { classifyWedge } from "../analyze/classifyWedge.js";
import { measureBreakoutPullback } from "../analyze/measureBreakoutPullback.js";
import { measureDoubleTopBottom } from "../analyze/measureDoubleTopBottom.js";
import { measureFailedBreakout } from "../analyze/measureFailedBreakout.js";
import { measureMajorTrendReversal } from "../analyze/measureMajorTrendReversal.js";
import { measureSecondEntry } from "../analyze/measureSecondEntry.js";
import { measureWedge } from "../analyze/measureWedge.js";
import type { AnalysisResult, AnalyzeResult } from "../types/analysis.js";
import type { Bar } from "../types/bars.js";
import type { SetupReport } from "../utils/setupMeasure.js";

export type ReviewNodeKind = "measure" | "classify";

export type ReviewTreeNode = {
  id: string;
  label: string;
  kind: ReviewNodeKind;
  children?: readonly ReviewTreeNode[];
};

type ClassifyRunner = (bars: Bar[]) => AnalysisResult;
type MeasureRunner = (bars: Bar[]) => SetupReport;

const CLASSIFY_RUNNERS: Record<string, ClassifyRunner> = {
  classifySecondEntry,
  classifyFailedBreakout,
  classifyBreakoutPullback,
  classifyWedge,
  classifyMajorTrendReversal,
  classifyDoubleTopBottom,
  classifySwingTrend,
  classifySwingLeg,
  classifyReversalSignal,
  classifyTradingRange,
  classifyRangeBreak,
  classifyFollowThrough,
  classifyTrendlineBreak,
  classifyChannel,
  classifyExtremeRetest,
};

const MEASURE_RUNNERS: Record<string, MeasureRunner> = {
  measureSecondEntry,
  measureFailedBreakout,
  measureBreakoutPullback,
  measureWedge,
  measureMajorTrendReversal,
  measureDoubleTopBottom,
};

const swingTrendChildren: readonly ReviewTreeNode[] = [
  { id: "classifyReversalSignal", label: "Reversal signal", kind: "classify" },
  { id: "classifyTradingRange", label: "Trading range", kind: "classify" },
];

const rangeBreakChildren: readonly ReviewTreeNode[] = [
  { id: "classifyTradingRange", label: "Trading range", kind: "classify" },
];

const followThroughChildren: readonly ReviewTreeNode[] = [
  {
    id: "classifyRangeBreak",
    label: "Range break",
    kind: "classify",
    children: rangeBreakChildren,
  },
];

const channelChildren: readonly ReviewTreeNode[] = [
  { id: "classifySwingLeg", label: "Swing leg", kind: "classify" },
];

/**
 * Nested measure → classify dependency map (catalog / docs).
 * The review sidebar does not use this nesting for checkboxes — see
 * `reviewSidebarItems`.
 */
export const REVIEW_TREE: readonly ReviewTreeNode[] = [
  {
    id: "measureSecondEntry",
    label: "Second entry",
    kind: "measure",
    children: [
      {
        id: "classifySecondEntry",
        label: "Second entry",
        kind: "classify",
        children: [
          {
            id: "classifySwingTrend",
            label: "Swing trend",
            kind: "classify",
            children: swingTrendChildren,
          },
          { id: "classifySwingLeg", label: "Swing leg", kind: "classify" },
        ],
      },
    ],
  },
  {
    id: "measureFailedBreakout",
    label: "Failed breakout",
    kind: "measure",
    children: [
      {
        id: "classifyFailedBreakout",
        label: "Failed breakout",
        kind: "classify",
        children: [
          {
            id: "classifyRangeBreak",
            label: "Range break",
            kind: "classify",
            children: rangeBreakChildren,
          },
          {
            id: "classifyFollowThrough",
            label: "Follow through",
            kind: "classify",
            children: followThroughChildren,
          },
          { id: "classifyTradingRange", label: "Trading range", kind: "classify" },
        ],
      },
    ],
  },
  {
    id: "measureBreakoutPullback",
    label: "Breakout pullback",
    kind: "measure",
    children: [
      {
        id: "classifyBreakoutPullback",
        label: "Breakout pullback",
        kind: "classify",
        children: [
          {
            id: "classifyFollowThrough",
            label: "Follow through",
            kind: "classify",
            children: followThroughChildren,
          },
          { id: "classifyTradingRange", label: "Trading range", kind: "classify" },
          { id: "classifySwingLeg", label: "Swing leg", kind: "classify" },
        ],
      },
    ],
  },
  {
    id: "measureWedge",
    label: "Wedge",
    kind: "measure",
    children: [
      {
        id: "classifyWedge",
        label: "Wedge",
        kind: "classify",
        children: [
          { id: "classifySwingLeg", label: "Swing leg", kind: "classify" },
          {
            id: "classifySwingTrend",
            label: "Swing trend",
            kind: "classify",
            children: swingTrendChildren,
          },
        ],
      },
    ],
  },
  {
    id: "measureMajorTrendReversal",
    label: "Major trend reversal",
    kind: "measure",
    children: [
      {
        id: "classifyMajorTrendReversal",
        label: "Major trend reversal",
        kind: "classify",
        children: [
          {
            id: "classifyTrendlineBreak",
            label: "Trendline break",
            kind: "classify",
            children: [
              {
                id: "classifyChannel",
                label: "Channel",
                kind: "classify",
                children: channelChildren,
              },
            ],
          },
          {
            id: "classifyExtremeRetest",
            label: "Extreme retest",
            kind: "classify",
            children: channelChildren,
          },
          {
            id: "classifyChannel",
            label: "Channel",
            kind: "classify",
            children: channelChildren,
          },
        ],
      },
    ],
  },
  {
    id: "measureDoubleTopBottom",
    label: "Double top/bottom",
    kind: "measure",
    children: [
      {
        id: "classifyDoubleTopBottom",
        label: "Double top/bottom",
        kind: "classify",
      },
    ],
  },
];

export type ReviewRunResult = {
  analysis: AnalysisResult[];
  reports: SetupReport[];
};

const MINOR_TRENDS = new Set(["minor_bull_trend", "minor_bear_trend"]);

const TRENDS = new Set([
  "bull_trend",
  "bear_trend",
  "minor_bull_trend",
  "minor_bear_trend",
]);

const RANGE_LABELS = new Set([
  "broad_trading_range",
  "tight_trading_range",
  "barbwire",
  "breakout_mode",
]);

const ENTRY_COUNTS = new Set(["H1", "H2", "H3", "L1", "L2", "L3"]);

/**
 * Drop nested minor-cycle trends when the sidebar sub-checkbox is off.
 * Drop `H1`–`H3` / `L1`–`L3` unless Entry count is on.
 * When one trading-range segment covers two or more consecutive swing
 * trends, drop those trends. The summary string is left unchanged.
 */
export function visibleReviewResults(
  results: readonly AnalysisResult[],
  showMinorTrends: boolean,
  showEntryCounts = false,
): AnalysisResult[] {
  const hidden = trendsCoveredByRanges(results);
  return results.map((result) => {
    if (result.functionId !== "classifySwingTrend") return result;
    return {
      ...result,
      results: result.results.flatMap((item, index) => {
        if (!showMinorTrends && MINOR_TRENDS.has(item.name)) return [];
        if (hidden.has(index)) return [];
        if (showEntryCounts) return [item];
        return [
          {
            ...item,
            levels: item.levels.filter((level) => !ENTRY_COUNTS.has(level.name)),
          },
        ];
      }),
    };
  });
}

function trendsCoveredByRanges(results: readonly AnalysisResult[]): Set<number> {
  const swing = results.find((result) => result.functionId === "classifySwingTrend");
  const hidden = new Set<number>();
  if (!swing) return hidden;
  const ranges = results.flatMap((result) =>
    result.functionId === "classifyTradingRange"
      ? result.results.filter((item) => RANGE_LABELS.has(item.name))
      : [],
  );
  for (const range of ranges) {
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 2) {
        for (const index of run) hidden.add(index);
      }
      run = [];
    };
    swing.results.forEach((item, index) => {
      if (TRENDS.has(item.name) && coveredBy(item, range)) run.push(index);
      else flush();
    });
    flush();
  }
  return hidden;
}

function coveredBy(trend: AnalyzeResult, range: AnalyzeResult): boolean {
  const trendEnd = trend.range.end ?? trend.range.start;
  const rangeEnd = range.range.end ?? range.range.start;
  return trend.range.start >= range.range.start && trendEnd <= rangeEnd;
}

/** Collect unique node ids of the given kind from the tree. */
export function collectTreeIds(
  nodes: readonly ReviewTreeNode[],
  kind: ReviewNodeKind,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const walk = (list: readonly ReviewTreeNode[]) => {
    for (const node of list) {
      if (node.kind === kind && !seen.has(node.id)) {
        seen.add(node.id);
        ids.push(node.id);
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

export type ReviewSidebarItem = {
  id: string;
  label: string;
  kind: ReviewNodeKind;
};

/**
 * Temporary sidebar roots: Second entry subtree only. Full `REVIEW_TREE` stays
 * for `runReview` / catalog; other analyzers remain in code.
 */
export const REVIEW_SIDEBAR_TREE: readonly ReviewTreeNode[] = REVIEW_TREE.filter(
  (node) => node.id === "measureSecondEntry",
);

/**
 * Flat sidebar list: each functionId once (measures first, then classifies).
 * Parent/child nesting in `REVIEW_TREE` does not affect checkboxes or drawing.
 * Default roots are `REVIEW_SIDEBAR_TREE` (SE-only, temporary).
 */
export function reviewSidebarItems(
  nodes: readonly ReviewTreeNode[] = REVIEW_SIDEBAR_TREE,
): ReviewSidebarItem[] {
  const labels = new Map<string, string>();
  const walk = (list: readonly ReviewTreeNode[]) => {
    for (const node of list) {
      if (!labels.has(node.id)) labels.set(node.id, node.label);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  const toItem = (id: string, kind: ReviewNodeKind): ReviewSidebarItem => ({
    id,
    kind,
    label: labels.get(id) ?? id,
  });
  return [
    ...collectTreeIds(nodes, "measure").map((id) => toItem(id, "measure")),
    ...collectTreeIds(nodes, "classify").map((id) => toItem(id, "classify")),
  ];
}

export type ReviewRunOptions = {
  /** Forwarded only to Second Entry classify and measure. Default stays 2. */
  entryCount?: number;
};

/** Run checked classify and measure functions. Ids are deduped by functionId. */
export function runReview(
  bars: readonly Bar[],
  enabled: {
    classifyIds?: readonly string[];
    measureIds?: readonly string[];
  } = {},
  options?: ReviewRunOptions,
): ReviewRunResult {
  const classifyEnabled = new Set(enabled.classifyIds ?? []);
  const measureEnabled = new Set(enabled.measureIds ?? []);
  const windowBars = [...bars];
  const secondEntryOptions =
    options?.entryCount === undefined ? undefined : { entryCount: options.entryCount };

  const analysis: AnalysisResult[] = [];
  for (const id of collectTreeIds(REVIEW_TREE, "classify")) {
    if (!classifyEnabled.has(id)) continue;
    if (id === "classifySecondEntry") {
      analysis.push(classifySecondEntry(windowBars, secondEntryOptions));
      continue;
    }
    const run = CLASSIFY_RUNNERS[id];
    if (run) analysis.push(run(windowBars));
  }

  const reports: SetupReport[] = [];
  for (const id of collectTreeIds(REVIEW_TREE, "measure")) {
    if (!measureEnabled.has(id)) continue;
    if (id === "measureSecondEntry") {
      reports.push(measureSecondEntry(windowBars, secondEntryOptions));
      continue;
    }
    const run = MEASURE_RUNNERS[id];
    if (run) reports.push(run(windowBars));
  }

  return { analysis, reports };
}
