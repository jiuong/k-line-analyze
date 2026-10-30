import { describe, expect, it } from "vitest";
import { measureWedge } from "../../src/analyze/measureWedge.js";
import type { Bar } from "../../src/types/bars.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  high: number,
  low: number,
  close = (high + low) / 2,
): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

function risingWedge(): Bar[] {
  return [
    bar(0, 9, 9),
    bar(1, 8, 8),
    bar(2, 8, 8),
    bar(3, 10, 8),
    bar(4, 10, 6),
    bar(5, 10, 6),
    bar(6, 14, 6),
    bar(7, 14, 4),
    bar(8, 14, 4),
    bar(9, 16, 4),
    bar(10, 15, 5),
  ];
}

describe("measureWedge", () => {
  it("skips wedges that have not broken yet", () => {
    const report = measureWedge(risingWedge(), { swingSpan: 1, priceTolerance: 0 });
    expect(report.functionId).toBe("measureWedge");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("marks a win and copies the reversal role onto context", () => {
    const bars = risingWedge();
    bars.push(bar(11, 6, 2, 3));
    bars.push(bar(12, 3, -3, -1));
    const report = measureWedge(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0]).toMatchObject({
      basis: "wedge_top",
      direction: "down",
      signalPrice: 4,
      entry: 4,
      stop: 16,
      target: -2,
      outcome: "win",
      context: { role: "reversal" },
    });
    expect(report.stats.winRate).toBe(1);
  });

  it("marks a loss when the stop is hit after fill", () => {
    const bars = risingWedge();
    bars.push(bar(11, 6, 2, 3));
    bars.push(bar(12, 5, 3, 4));
    bars.push(bar(13, 17, 5, 16));
    const report = measureWedge(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades[0]?.outcome).toBe("loss");
    expect(report.trades[0]?.context).toEqual({ role: "reversal" });
    expect(report.stats.winRate).toBe(0);
  });
});
