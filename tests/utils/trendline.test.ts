import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import type { SwingLeg } from "../../src/utils/swingLegs.js";
import { findSwingLegs } from "../../src/utils/swingLegs.js";
import {
  channelFromLegs,
  closesBeyond,
  railPriceAt,
  type Rail,
} from "../../src/utils/trendline.js";

function leg(
  direction: SwingLeg["direction"],
  startIndex: number,
  endIndex: number,
  startPrice: number,
  endPrice: number,
): SwingLeg {
  return { direction, startIndex, endIndex, startPrice, endPrice };
}

function bar(close: number, high = close, low = close): Bar {
  return { time: 1_700_000_000, open: close, high, low, close };
}

describe("channelFromLegs", () => {
  it("returns no channel when one direction has fewer than two legs", () => {
    expect(channelFromLegs([])).toEqual([]);
    expect(
      channelFromLegs([leg("bull", 0, 2, 10, 18), leg("bear", 2, 4, 18, 12)]),
    ).toEqual([]);
  });

  it("fits one bull channel from two rising legs", () => {
    expect(
      channelFromLegs([
        leg("bull", 2, 5, 10, 18),
        leg("bear", 5, 8, 18, 14),
        leg("bull", 8, 11, 14, 22),
      ]),
    ).toEqual([
      {
        direction: "bull",
        low1: { index: 2, price: 10 },
        high1: { index: 5, price: 18 },
        low2: { index: 8, price: 14 },
        high2: { index: 11, price: 22 },
      },
    ]);
  });

  it("redraws two channels from three rising bull legs and shares the middle leg", () => {
    const channels = channelFromLegs([
      leg("bull", 2, 5, 10, 18),
      leg("bull", 8, 11, 14, 22),
      leg("bull", 14, 17, 17, 26),
    ]);
    expect(channels).toEqual([
      {
        direction: "bull",
        low1: { index: 2, price: 10 },
        high1: { index: 5, price: 18 },
        low2: { index: 8, price: 14 },
        high2: { index: 11, price: 22 },
      },
      {
        direction: "bull",
        low1: { index: 8, price: 14 },
        high1: { index: 11, price: 22 },
        low2: { index: 14, price: 17 },
        high2: { index: 17, price: 26 },
      },
    ]);
  });

  it("skips a pair whose rails do not both rise, and keeps the next pair", () => {
    expect(
      channelFromLegs([
        leg("bull", 0, 2, 10, 20),
        leg("bull", 4, 6, 12, 18),
        leg("bull", 8, 10, 15, 24),
      ]),
    ).toEqual([
      {
        direction: "bull",
        low1: { index: 4, price: 12 },
        high1: { index: 6, price: 18 },
        low2: { index: 8, price: 15 },
        high2: { index: 10, price: 24 },
      },
    ]);
  });

  it("fits one bear channel from two falling legs", () => {
    expect(
      channelFromLegs([
        leg("bear", 1, 4, 30, 22),
        leg("bull", 4, 7, 22, 26),
        leg("bear", 7, 10, 26, 18),
      ]),
    ).toEqual([
      {
        direction: "bear",
        high1: { index: 1, price: 30 },
        low1: { index: 4, price: 22 },
        high2: { index: 7, price: 26 },
        low2: { index: 10, price: 18 },
      },
    ]);
  });

  it("orders a later bear channel after the bull channel that started first", () => {
    const channels = channelFromLegs([
      leg("bull", 0, 2, 10, 16),
      leg("bear", 2, 4, 16, 14),
      leg("bull", 4, 6, 15, 20),
      leg("bear", 6, 8, 12, 11),
    ]);
    expect(channels.map((channel) => channel.direction)).toEqual(["bull", "bear"]);
    expect(channels.map((channel) => Math.min(channel.high1.index, channel.low1.index))).toEqual([
      0, 2,
    ]);
  });

  it("uses findSwingLegs touches without calling it internally", () => {
    const highs = [5, 1, 4, 2, 6, 3, 2];
    const bars = highs.map(
      (high, index): Bar => ({
        time: 1_700_000_000 + index * 60,
        open: high - 0.5,
        high,
        low: high - 0.5,
        close: high,
      }),
    );
    expect(channelFromLegs(findSwingLegs(bars, 1))).toEqual([
      {
        direction: "bull",
        low1: { index: 1, price: 0.5 },
        high1: { index: 2, price: 4 },
        low2: { index: 3, price: 1.5 },
        high2: { index: 4, price: 6 },
      },
    ]);
  });

  it("throws when legs is not an array or a leg is invalid", () => {
    expect(() => channelFromLegs(null as unknown as SwingLeg[])).toThrow(TypeError);
    expect(() =>
      channelFromLegs([leg("bull", 0, 2, Number.NaN, 1)]),
    ).toThrow(TypeError);
    expect(() =>
      channelFromLegs([leg("bull", 4, 6, 1, 2), leg("bull", 1, 3, 2, 3)]),
    ).toThrow(TypeError);
  });
});

describe("closesBeyond", () => {
  const highRail: Rail = {
    side: "high",
    first: { index: 0, price: 10 },
    second: { index: 4, price: 14 },
  };
  const lowRail: Rail = {
    side: "low",
    first: { index: 1, price: 8 },
    second: { index: 5, price: 12 },
  };

  it("extends the rail to a later index", () => {
    expect(railPriceAt(4, highRail.first, highRail.second)).toBe(14);
    expect(railPriceAt(6, highRail.first, highRail.second)).toBe(16);
  });

  it("is true only when the close is outside the rail", () => {
    expect(closesBeyond(bar(17), 6, highRail)).toBe(true);
    expect(closesBeyond(bar(16), 6, highRail)).toBe(false);
    expect(closesBeyond(bar(9), 5, lowRail)).toBe(true);
    expect(closesBeyond(bar(13), 5, lowRail)).toBe(false);
  });

  it("ignores a wick that crosses the rail when the close does not", () => {
    const line = railPriceAt(6, highRail.first, highRail.second);
    const probed = bar(line, line + 3, line - 1);
    expect(probed.high).toBeGreaterThan(line);
    expect(closesBeyond(probed, 6, highRail)).toBe(false);
  });

  it("throws when the rail indexes are the same", () => {
    expect(() =>
      railPriceAt(1, { index: 2, price: 1 }, { index: 2, price: 3 }),
    ).toThrow(TypeError);
  });
});
