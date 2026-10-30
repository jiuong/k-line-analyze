import { describe, expect, it } from "vitest";
import { measureMajorTrendReversal } from "../../src/analyze/measureMajorTrendReversal.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = high): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

function flat(prices: number[]): Bar[] {
  return prices.map((price, index) => bar(index, price, price));
}

function brokenChannel(): Bar[] {
  return [
    ...flat([5, 1, 4, 2, 6, 3]),
    bar(6, 4, 1, 2),
    bar(7, 6, 5),
    bar(8, 4, 3),
    bar(9, 4, 3.5, 4),
  ];
}

describe("measureMajorTrendReversal", () => {
  it("skips reversals that have not broken the retest yet", () => {
    const report = measureMajorTrendReversal(brokenChannel(), {
      swingSpan: 1,
      priceTolerance: 0,
    });
    expect(report.functionId).toBe("measureMajorTrendReversal");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("marks a win with Retest as the signal price", () => {
    const bars = brokenChannel();
    bars.push(bar(10, 6, 5, 6));
    bars.push(bar(11, 10, 6, 9));
    const report = measureMajorTrendReversal(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({
      basis: "bull_major_reversal",
      direction: "up",
      signalPrice: 3,
      signalTime: toTimeString(bars[10]!.time),
      entry: 4,
      stop: 3,
      target: 9,
      outcome: "win",
    });
    expect(report.stats.winRate).toBe(1);
  });

  it("marks a loss when the stop is hit after fill", () => {
    const bars = brokenChannel();
    bars.push(bar(10, 6, 5, 6));
    bars.push(bar(11, 5, 4.5, 5));
    bars.push(bar(12, 4.5, 2.5, 3));
    const report = measureMajorTrendReversal(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades[0]?.outcome).toBe("loss");
    expect(report.trades[0]?.signalPrice).toBe(3);
    expect(report.stats.winRate).toBe(0);
  });
});
