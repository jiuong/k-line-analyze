import type { Bar } from "../types/bars.js";
import type {
  AnalysisLabel,
  AnalysisResult,
  AnalyzeResult,
  Level,
  LevelName,
} from "../types/analysis.js";
import { classifyChannel } from "./classifyChannel.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";
import { closesBeyond, type Rail, type RailPoint } from "../utils/trendline.js";

const FUNCTION_ID = "classifyTrendlineBreak";

const SUMMARY = "breaks={count}; last={lastName}";

const HIGH_TOUCHES = ["ChannelHigh1", "ChannelHigh2"] as const;
const LOW_TOUCHES = ["ChannelLow1", "ChannelLow2"] as const;

export type ClassifyTrendlineBreakOptions = {
  swingSpan?: number;
};

type TouchName = (typeof HIGH_TOUCHES)[number] | (typeof LOW_TOUCHES)[number];

type ChannelView = {
  name: "bull_channel" | "bear_channel";
  touches: Level[];
  indexes: number[];
};

/** One close beyond the countertrend rail. A miss is a single `unclear` result. */
export function classifyTrendlineBreak(
  bars: Bar[],
  options?: ClassifyTrendlineBreakOptions,
): AnalysisResult<Record<string, never>> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyTrendlineBreak: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const channels = readChannels(bars, classifyChannel(bars, { swingSpan }));
  const breaks = channels.flatMap((channel, index) =>
    breaksFor(bars, channel, scanEnd(channels, index)),
  );
  if (breaks.length === 0) return assemble([unclearResult(bars)]);
  return assemble(breaks);
}

function resolveSwingSpan(options?: ClassifyTrendlineBreakOptions): number {
  if (options === undefined) return 2;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyTrendlineBreak: options must be an object");
  }
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifyTrendlineBreak: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function readChannels(
  bars: readonly Bar[],
  channelResult: AnalysisResult,
): ChannelView[] {
  const byTime = new Map<string, number>();
  bars.forEach((bar, index) => {
    const time = toTimeString(bar.time);
    if (!byTime.has(time)) byTime.set(time, index);
  });
  const channels: ChannelView[] = [];
  for (const item of channelResult.results) {
    if (item.name !== "bull_channel" && item.name !== "bear_channel") continue;
    const indexes = item.levels.map((level) => byTime.get(level.time));
    if (indexes.some((index) => index === undefined)) continue;
    channels.push({
      name: item.name,
      touches: item.levels,
      indexes: indexes as number[],
    });
  }
  channels.sort((a, b) => Math.min(...a.indexes) - Math.min(...b.indexes));
  return channels;
}

/**
 * Stop before the next same-direction channel's first touch that lies past
 * this channel. Shared earlier touches do not end the window.
 */
function scanEnd(channels: readonly ChannelView[], index: number): number {
  const current = channels[index]!;
  const lastTouch = Math.max(...current.indexes);
  for (let next = index + 1; next < channels.length; next++) {
    const later = channels[next]!;
    if (later.name !== current.name) continue;
    const start = later.indexes.filter((touch) => touch > lastTouch);
    if (start.length > 0) return Math.min(...start) - 1;
  }
  return Number.POSITIVE_INFINITY;
}

function breaksFor(
  bars: readonly Bar[],
  channel: ChannelView,
  end: number,
): AnalyzeResult[] {
  const names = channel.name === "bull_channel" ? LOW_TOUCHES : HIGH_TOUCHES;
  const side = channel.name === "bull_channel" ? "low" : "high";
  const label: AnalysisLabel =
    channel.name === "bull_channel" ? "bear_line_break" : "bull_line_break";
  const railTouches = names.map((name) => touchPoint(channel, name));
  if (railTouches.some((touch) => touch === undefined)) return [];
  const [first, second] = railTouches as [RailPoint, RailPoint];
  const rail: Rail = { side, first, second };
  const start = Math.max(first.index, second.index) + 1;
  const last = Math.min(end, bars.length - 1);
  const results: AnalyzeResult[] = [];
  for (let index = start; index <= last; index++) {
    const bar = bars[index]!;
    if (!closesBeyond(bar, index, rail)) continue;
    results.push(toResult(label, bar, names, channel));
  }
  return results;
}

function touchPoint(channel: ChannelView, name: TouchName): RailPoint | undefined {
  const levelIndex = channel.touches.findIndex((level) => level.name === name);
  if (levelIndex < 0) return undefined;
  return {
    index: channel.indexes[levelIndex]!,
    price: channel.touches[levelIndex]!.price,
  };
}

function toResult(
  name: AnalysisLabel,
  bar: Bar,
  touchNames: readonly TouchName[],
  channel: ChannelView,
): AnalyzeResult {
  const time = toTimeString(bar.time);
  const copied = touchNames.map((touchName) => levelByName(channel, touchName));
  return {
    name,
    range: { start: time },
    levels: [{ name: "BreakBar", price: bar.close, time }, ...copied],
  };
}

function levelByName(channel: ChannelView, name: LevelName): Level {
  return channel.touches.find((level) => level.name === name)!;
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
