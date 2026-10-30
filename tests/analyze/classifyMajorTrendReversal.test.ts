import { describe, expect, it } from "vitest";
import { classifyChannel } from "../../src/analyze/classifyChannel.js";
import { classifyMajorTrendReversal } from "../../src/analyze/classifyMajorTrendReversal.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = high): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

function flat(prices: number[]): Bar[] {
  return prices.map((price, index) => bar(index, price, price));
}

/** Bull-channel break, an earlier higher low, then a higher low after the break. */
function brokenChannel(): Bar[] {
  return [
    ...flat([5, 1, 4, 2, 6, 3]),
    bar(6, 4, 1, 2),
    bar(7, 6, 5),
    bar(8, 4, 3),
    bar(9, 4, 3.5, 4),
  ];
}

describe("classifyMajorTrendReversal", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyMajorTrendReversal([])).toThrow(TypeError);
    expect(() => classifyMajorTrendReversal(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 2, 1)];
    expect(() => classifyMajorTrendReversal(bars, { priceTolerance: -1 })).toThrow(
      /classifyMajorTrendReversal: priceTolerance/,
    );
    expect(() => classifyMajorTrendReversal(bars, { swingSpan: 0 })).toThrow(
      /classifyMajorTrendReversal: swingSpan/,
    );
    expect(() => classifyMajorTrendReversal(bars, { tickSize: 0 })).toThrow(
      /classifyMajorTrendReversal: tickSize/,
    );
  });

  it("pairs the break with the later higher low", () => {
    const bars = brokenChannel();
    const result = classifyMajorTrendReversal(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.functionId).toBe("classifyMajorTrendReversal");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.summary).toBe("majorReversals=1; last=bull_major_reversal");
    const item = result.results[0]!;
    expect(item.name).toBe("bull_major_reversal");
    expect(item.range).toEqual({
      start: toTimeString(bars[6]!.time),
      end: toTimeString(bars[8]!.time),
    });
    expect(item.levels.map((level) => level.name)).toEqual(["BreakBar", "PriorExtreme", "Retest"]);
    expect(item.levels[2]).toEqual({
      name: "Retest",
      price: 3,
      time: toTimeString(bars[8]!.time),
    });
    expect(item.levels[1]!.time).not.toBe(toTimeString(bars[3]!.time));
    expect(result.results.some((row) => row.name === "bull_reversal" || row.name === "wedge_top")).toBe(
      false,
    );
  });

  it("omits Entry until a later close breaks the retest bar", () => {
    const held = brokenChannel();
    expect(
      classifyMajorTrendReversal(held, { swingSpan: 1, priceTolerance: 0 }).results[0]!.levels.map(
        (level) => level.name,
      ),
    ).toEqual(["BreakBar", "PriorExtreme", "Retest"]);

    const broken = brokenChannel();
    broken.push(bar(broken.length, 6, 5, 6));
    const levels = classifyMajorTrendReversal(broken, {
      swingSpan: 1,
      priceTolerance: 0,
    }).results[0]!.levels;
    expect(levels.map((level) => level.name)).toEqual([
      "BreakBar",
      "PriorExtreme",
      "Retest",
      "Entry",
      "Stop",
      "Target",
    ]);
    expect(levels[3]).toEqual({ name: "Entry", price: 4, time: toTimeString(broken[10]!.time) });
    expect(levels[4]).toEqual({ name: "Stop", price: 3, time: toTimeString(broken[8]!.time) });

    const channel = classifyChannel(broken, { swingSpan: 1 }).results.find(
      (item) => item.name === "bull_channel",
    )!;
    const high = Math.max(
      channel.levels.find((level) => level.name === "ChannelHigh1")!.price,
      channel.levels.find((level) => level.name === "ChannelHigh2")!.price,
    );
    const low = Math.min(
      channel.levels.find((level) => level.name === "ChannelLow1")!.price,
      channel.levels.find((level) => level.name === "ChannelLow2")!.price,
    );
    expect(levels[5]!.price).toBe(4 + (high - low));
  });

  it("returns unclear when a break has no later retest", () => {
    const bars = [...flat([5, 1, 4, 2, 6, 3]), bar(6, 4, 1, 2)];
    const result = classifyMajorTrendReversal(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(result.summary).toBe("majorReversals=0; last=unclear");
    expect(result.results[0]?.name).toBe("unclear");
  });
});
