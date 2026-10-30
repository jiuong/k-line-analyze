import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level, LevelName } from "../types/analysis.js";
import { projectMeasuredMove } from "../utils/measuredMove.js";
import { entryBeyond, stopBeyond, targetFrom, type SetupDirection } from "../utils/setupPrices.js";
import { fillSummary } from "../utils/summary.js";
import { barIndexAt, toTimeString } from "../utils/time.js";
import { classifyChannel } from "./classifyChannel.js";
import { classifyExtremeRetest } from "./classifyExtremeRetest.js";
import { classifyTrendlineBreak } from "./classifyTrendlineBreak.js";

const FUNCTION_ID = "classifyMajorTrendReversal";

const SUMMARY = "majorReversals={count}; last={lastName}";

const LOW_RAIL = ["ChannelLow1", "ChannelLow2"] as const;
const HIGH_RAIL = ["ChannelHigh1", "ChannelHigh2"] as const;

export type ClassifyMajorTrendReversalOptions = {
  swingSpan?: number;
  tickSize?: number;
  priceTolerance?: number;
};

type BreakKind = "bear_line_break" | "bull_line_break";
type RetestKind = "higher_low" | "lower_high";

type LineBreak = {
  kind: BreakKind;
  index: number;
  breakBar: Level;
  rail: Level[];
};

type Retest = {
  kind: RetestKind;
  index: number;
  prior: Level;
  retest: Level;
};

type Reversal = {
  kind: "bull_major_reversal" | "bear_major_reversal";
  line: LineBreak;
  retest: Retest;
};

/** One break plus the next unused retest. A miss is a single `unclear` result. */
export function classifyMajorTrendReversal(
  bars: Bar[],
  options?: ClassifyMajorTrendReversalOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyMajorTrendReversal: bars must be a non-empty array");
  }
  const { swingSpan, tickSize, priceTolerance } = resolveOptions(options);
  const lines = readBreaks(bars, classifyTrendlineBreak(bars, { swingSpan }));
  const retests = readRetests(bars, classifyExtremeRetest(bars, { swingSpan, priceTolerance }));
  const channels = classifyChannel(bars, { swingSpan }).results;
  const found = pair(lines, retests);
  if (found.length === 0) return assemble([unclearResult(bars)]);
  return assemble(found.map((item) => toResult(bars, item, channels, tickSize)));
}

function resolveOptions(options?: ClassifyMajorTrendReversalOptions): {
  swingSpan: number;
  tickSize?: number;
  priceTolerance?: number;
} {
  if (options === undefined) return { swingSpan: 2 };
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyMajorTrendReversal: options must be an object");
  }
  return {
    swingSpan: resolveSwingSpan(options.swingSpan),
    tickSize: resolveTick(options.tickSize),
    priceTolerance: resolveTolerance(options.priceTolerance),
  };
}

function resolveSwingSpan(swingSpan: number | undefined): number {
  if (swingSpan === undefined) return 2;
  if (!Number.isInteger(swingSpan) || swingSpan < 1) {
    throw new TypeError("classifyMajorTrendReversal: swingSpan must be an integer >= 1");
  }
  return swingSpan;
}

function resolveTick(tickSize: number | undefined): number | undefined {
  if (tickSize === undefined) return undefined;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("classifyMajorTrendReversal: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function resolveTolerance(priceTolerance: number | undefined): number | undefined {
  if (priceTolerance === undefined) return undefined;
  if (!Number.isFinite(priceTolerance) || priceTolerance < 0) {
    throw new TypeError("classifyMajorTrendReversal: priceTolerance must be a finite number >= 0");
  }
  return priceTolerance;
}

function readBreaks(bars: readonly Bar[], result: AnalysisResult): LineBreak[] {
  const found: LineBreak[] = [];
  for (const item of result.results) {
    if (item.name !== "bear_line_break" && item.name !== "bull_line_break") continue;
    const breakBar = item.levels.find((level) => level.name === "BreakBar");
    const rail = item.levels.filter((level) => level.name !== "BreakBar");
    if (!breakBar || rail.length === 0) continue;
    found.push({
      kind: item.name,
      index: barIndexAt(bars, breakBar.time, FUNCTION_ID),
      breakBar,
      rail,
    });
  }
  found.sort((a, b) => a.index - b.index);
  return found;
}

function readRetests(bars: readonly Bar[], result: AnalysisResult): Retest[] {
  const found: Retest[] = [];
  for (const item of result.results) {
    if (item.name !== "higher_low" && item.name !== "lower_high") continue;
    const prior = item.levels.find((level) => level.name === "PriorExtreme");
    const retest = item.levels.find((level) => level.name === "Retest");
    if (!prior || !retest) continue;
    found.push({
      kind: item.name,
      index: barIndexAt(bars, retest.time, FUNCTION_ID),
      prior,
      retest,
    });
  }
  found.sort((a, b) => a.index - b.index);
  return found;
}

function pair(lines: readonly LineBreak[], retests: readonly Retest[]): Reversal[] {
  const used = new Set<number>();
  const found: Reversal[] = [];
  for (const line of lines) {
    const want: RetestKind = line.kind === "bear_line_break" ? "higher_low" : "lower_high";
    const retestIndex = retests.findIndex(
      (retest, index) => !used.has(index) && retest.kind === want && retest.index > line.index,
    );
    if (retestIndex < 0) continue;
    used.add(retestIndex);
    const retest = retests[retestIndex]!;
    found.push({
      kind: want === "higher_low" ? "bull_major_reversal" : "bear_major_reversal",
      line,
      retest,
    });
  }
  found.sort((a, b) => a.retest.index - b.retest.index || kindOrder(a.kind) - kindOrder(b.kind));
  return found;
}

function kindOrder(kind: Reversal["kind"]): number {
  return kind === "bull_major_reversal" ? 0 : 1;
}

function toResult(
  bars: readonly Bar[],
  item: Reversal,
  channels: readonly AnalyzeResult[],
  tickSize: number | undefined,
): AnalyzeResult {
  const levels: Level[] = [
    { name: "BreakBar", price: item.line.breakBar.price, time: item.line.breakBar.time },
    { name: "PriorExtreme", price: item.retest.prior.price, time: item.retest.prior.time },
    { name: "Retest", price: item.retest.retest.price, time: item.retest.retest.time },
  ];
  const trade: SetupDirection = item.kind === "bull_major_reversal" ? "up" : "down";
  const broken = breakIndex(bars, item.retest.index, trade);
  if (broken !== undefined) {
    const extreme = trade === "up" ? bars[item.retest.index]!.high : bars[item.retest.index]!.low;
    const entry = entryBeyond(extreme, trade, tickSize);
    const height = channelHeight(bars, channels, item.line);
    const time = toTimeString(bars[broken]!.time);
    levels.push(
      { name: "Entry", price: entry, time },
      { name: "Stop", price: stopBeyond(item.retest.retest.price, trade, tickSize), time: item.retest.retest.time },
      { name: "Target", price: targetFrom(projectMeasuredMove(entry, height, trade)), time },
    );
  }
  return {
    name: item.kind,
    range: { start: item.line.breakBar.time, end: item.retest.retest.time },
    levels,
  };
}

function breakIndex(bars: readonly Bar[], retestIndex: number, trade: SetupDirection): number | undefined {
  const extreme = trade === "up" ? bars[retestIndex]!.high : bars[retestIndex]!.low;
  for (let index = retestIndex + 1; index < bars.length; index += 1) {
    const close = bars[index]!.close;
    const beyond = trade === "up" ? close > extreme : close < extreme;
    if (beyond) return index;
  }
  return undefined;
}

function channelHeight(bars: readonly Bar[], channels: readonly AnalyzeResult[], line: LineBreak): number {
  const names = line.kind === "bear_line_break" ? LOW_RAIL : HIGH_RAIL;
  let best: { end: number; height: number } | undefined;
  for (const channel of channels) {
    if (channel.name !== "bull_channel" && channel.name !== "bear_channel") continue;
    if (!railMatches(channel, names, line.rail)) continue;
    const indexes = channel.levels.map((level) => barIndexAt(bars, level.time, FUNCTION_ID));
    const end = Math.max(...indexes);
    if (end > line.index) continue;
    const height =
      extreme(channel, ["ChannelHigh1", "ChannelHigh2"], "max") -
      extreme(channel, ["ChannelLow1", "ChannelLow2"], "min");
    if (!best || end > best.end) best = { end, height: Math.max(0, height) };
  }
  if (!best) {
    throw new Error(`${FUNCTION_ID}: broken channel is missing`);
  }
  return best.height;
}

function extreme(
  channel: AnalyzeResult,
  names: readonly LevelName[],
  pick: "max" | "min",
): number {
  const prices = names.map((name) => {
    const level = channel.levels.find((item) => item.name === name);
    if (!level) throw new Error(`${FUNCTION_ID}: channel is missing ${name}`);
    return level.price;
  });
  return pick === "max" ? Math.max(...prices) : Math.min(...prices);
}

function railMatches(
  channel: AnalyzeResult,
  names: readonly LevelName[],
  rail: readonly Level[],
): boolean {
  return names.every((name) => {
    const copied = rail.find((level) => level.name === name);
    const touch = channel.levels.find((level) => level.name === name);
    return copied !== undefined && touch !== undefined && copied.price === touch.price && copied.time === touch.time;
  });
}

function unclearResult(bars: readonly Bar[]): AnalyzeResult {
  return {
    name: "unclear",
    range: {
      start: toTimeString(bars[0]!.time),
      end: toTimeString(bars[bars.length - 1]!.time),
    },
    levels: [],
  };
}

function assemble(results: AnalyzeResult[]): AnalysisResult<Record<string, never>> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: {},
  };
}
