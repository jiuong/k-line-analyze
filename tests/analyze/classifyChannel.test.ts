import { describe, expect, it } from "vitest";
import { classifyChannel } from "../../src/analyze/classifyChannel.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = high): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

describe("classifyChannel", () => {
  it("throws when bars or swingSpan is invalid", () => {
    expect(() => classifyChannel([])).toThrow(TypeError);
    expect(() => classifyChannel(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 1, 0)];
    expect(() => classifyChannel(bars, null as unknown as object)).toThrow(
      /classifyChannel: options/,
    );
    expect(() => classifyChannel(bars, { swingSpan: 0 })).toThrow(
      /classifyChannel: swingSpan/,
    );
  });

  it("returns unclear when four touches are not available", () => {
    const bars = [1, 3, 2, 4].map((high, index) => bar(index, high, high - 1));
    const result = classifyChannel(bars);
    expect(result.functionId).toBe("classifyChannel");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("channels=0; last=unclear");
    expect(result.evidence).toEqual({ items: [{ overshoot: false }] });
    expect(result.results).toEqual([
      {
        name: "unclear",
        range: {
          start: toTimeString(bars[0]!.time),
          end: toTimeString(bars[3]!.time),
        },
        levels: [],
      },
    ]);
  });

  it("orders the four anchors of one bull channel from earlier to later", () => {
    const prices = [5, 1, 4, 2, 6, 3, 7, 4];
    const bars = prices.map((price, index) => bar(index, price, price));
    const result = classifyChannel(bars, { swingSpan: 1 });
    expect(result.summary).toBe("channels=2; last=bull_channel");
    expect(result.results.map((item) => item.name)).toEqual(["bull_channel", "bull_channel"]);
    const first = result.results[0]!;
    expect(first.levels.map((level) => level.name)).toEqual([
      "ChannelHigh1",
      "ChannelHigh2",
      "ChannelLow1",
      "ChannelLow2",
    ]);
    expect(first.levels.map((level) => level.price)).toEqual([4, 6, 1, 2]);
    const times = first.levels.map((level) => level.time);
    expect(times[0]! < times[1]!).toBe(true);
    expect(times[2]! < times[3]!).toBe(true);
    expect(first.range).toEqual({ start: times[2], end: times[1] });
    expect(result.evidence.items.every((item) => item.overshoot === false)).toBe(true);
  });

  it("fits a bear channel from falling legs", () => {
    const prices = [1, 7, 3, 6, 2, 5, 1, 4];
    const bars = prices.map((price, index) => bar(index, price, price));
    const result = classifyChannel(bars, { swingSpan: 1 });
    expect(result.results.map((item) => item.name)).toEqual(["bear_channel", "bear_channel"]);
    expect(result.results[0]!.levels.map((level) => level.price)).toEqual([7, 6, 3, 2]);
  });

  it("marks a wick beyond a rail when the close stays inside", () => {
    const bars = [
      bar(0, 18, 16, 17),
      bar(1, 15, 10, 14),
      bar(2, 18, 12, 16),
      bar(3, 20, 16, 18),
      bar(4, 19, 15, 17),
      bar(5, 18, 14, 16),
      bar(6, 24.5, 16, 20),
      bar(7, 25, 17, 21),
      bar(8, 26, 18, 22),
      bar(9, 24, 19, 22),
    ];
    const result = classifyChannel(bars, { swingSpan: 1 });
    expect(result.results.map((item) => item.name)).toEqual(["bull_channel"]);
    expect(result.evidence.items).toEqual([{ overshoot: true }]);
  });

  it("does not treat a close beyond the rail as an overshoot", () => {
    const bars = [
      bar(0, 18, 16, 17),
      bar(1, 15, 10, 14),
      bar(2, 18, 12, 16),
      bar(3, 20, 16, 18),
      bar(4, 19, 15, 17),
      bar(5, 18, 14, 16),
      bar(6, 24.5, 16, 25),
      bar(7, 24.7, 17, 21),
      bar(8, 26, 18, 22),
      bar(9, 24, 19, 22),
    ];
    const result = classifyChannel(bars, { swingSpan: 1 });
    expect(result.evidence.items).toEqual([{ overshoot: false }]);
  });
});
