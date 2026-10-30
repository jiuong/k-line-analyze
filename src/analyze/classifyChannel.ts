import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, Level } from "../types/analysis.js";
import { fillSummary } from "../utils/summary.js";
import { toTimeString } from "../utils/time.js";
import {
  channelFromLegs,
  closesBeyond,
  railPriceAt,
  type FittedChannel,
  type Rail,
} from "../utils/trendline.js";
import { readSwingLegs } from "./classifySwingLeg.js";

const FUNCTION_ID = "classifyChannel";

const SUMMARY = "channels={count}; last={lastName}";

export type ClassifyChannelOptions = {
  swingSpan?: number;
};

export type ChannelItemEvidence = {
  overshoot: boolean;
};

export type ChannelEvidence = {
  items: ChannelItemEvidence[];
};

/** One channel per redrawn pair of swing legs. A miss is a single `unclear` result. */
export function classifyChannel(
  bars: Bar[],
  options?: ClassifyChannelOptions,
): AnalysisResult<ChannelEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyChannel: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const channels = channelFromLegs(readSwingLegs(bars, swingSpan));
  if (channels.length === 0) {
    return assemble([unclearResult(bars)], [{ overshoot: false }]);
  }
  const items = channels.map((channel) => ({ overshoot: hasOvershoot(bars, channel) }));
  return assemble(
    channels.map((channel) => toResult(bars, channel)),
    items,
  );
}

function resolveSwingSpan(options?: ClassifyChannelOptions): number {
  if (options === undefined) return 2;
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyChannel: options must be an object");
  }
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifyChannel: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function toResult(bars: readonly Bar[], channel: FittedChannel): AnalyzeResult {
  const high1 = touch(bars, "ChannelHigh1", channel.high1.index, channel.high1.price);
  const high2 = touch(bars, "ChannelHigh2", channel.high2.index, channel.high2.price);
  const low1 = touch(bars, "ChannelLow1", channel.low1.index, channel.low1.price);
  const low2 = touch(bars, "ChannelLow2", channel.low2.index, channel.low2.price);
  const levels = [high1, high2, low1, low2];
  const times = levels.map((level) => level.time).sort();
  return {
    name: channel.direction === "bull" ? "bull_channel" : "bear_channel",
    range: { start: times[0]!, end: times[times.length - 1]! },
    levels,
  };
}

function touch(
  bars: readonly Bar[],
  name: "ChannelHigh1" | "ChannelHigh2" | "ChannelLow1" | "ChannelLow2",
  index: number,
  price: number,
): Level {
  return { name, price, time: toTimeString(bars[index]!.time) };
}

function hasOvershoot(bars: readonly Bar[], channel: FittedChannel): boolean {
  const indexes = [
    channel.high1.index,
    channel.high2.index,
    channel.low1.index,
    channel.low2.index,
  ];
  const start = Math.min(...indexes);
  const end = Math.max(...indexes);
  const highRail: Rail = { side: "high", first: channel.high1, second: channel.high2 };
  const lowRail: Rail = { side: "low", first: channel.low1, second: channel.low2 };
  for (let index = start; index <= end; index++) {
    const bar = bars[index]!;
    const upper = railPriceAt(index, channel.high1, channel.high2);
    const lower = railPriceAt(index, channel.low1, channel.low2);
    const wickBeyond = bar.high > upper || bar.low < lower;
    const closeInside =
      !closesBeyond(bar, index, highRail) && !closesBeyond(bar, index, lowRail);
    if (wickBeyond && closeInside) return true;
  }
  return false;
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

function assemble(
  results: AnalyzeResult[],
  items: ChannelItemEvidence[],
): AnalysisResult<ChannelEvidence> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { items },
  };
}
