import { describe, expect, it } from "vitest";
import { measureDoubleTopBottom } from "../../src/analyze/measureDoubleTopBottom.js";
import type { Bar } from "../../src/types/bars.js";
import { projectMeasuredMove } from "../../src/utils/measuredMove.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  high: number,
  low: number,
  close = (high + low) / 2,
): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

/** Alternating peaks and valleys. Span 1 keeps each interior pivot. */
function zigzag(peaks: number[], valleys: number[]): Bar[] {
  const bars: Bar[] = [bar(0, 10, 8)];
  for (let index = 0; index < peaks.length; index += 1) {
    const peak = peaks[index]!;
    const valley = valleys[index]!;
    bars.push(bar(bars.length, peak, peak - 2));
    bars.push(bar(bars.length, valley + 2, valley));
  }
  return bars;
}

function brokenTop(): Bar[] {
  const bars = zigzag([20, 20], [5, 8]);
  bars.push(bar(bars.length, 6, 3, 4));
  return bars;
}

describe("measureDoubleTopBottom", () => {
  it("returns empty trades when the neckline is not broken", () => {
    const report = measureDoubleTopBottom(zigzag([20, 20], [5, 8]), {
      swingSpan: 1,
      priceTolerance: 0,
    });
    expect(report.functionId).toBe("measureDoubleTopBottom");
    expect(report.trades).toEqual([]);
    expect(report.stats.winRate).toBeNull();
  });

  it("projects a 1x neckline target for a triggered double top", () => {
    const bars = brokenTop();
    bars.push(bar(bars.length, 4, -12, -10));
    const report = measureDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades).toHaveLength(1);
    const expectedTarget = projectMeasuredMove(5, 15, "down");
    expect(expectedTarget).toBe(-10);
    expect(report.trades[0]).toMatchObject({
      basis: "double_top",
      direction: "down",
      signalPrice: 5,
      entry: 5,
      stop: 20,
      target: expectedTarget,
      outcome: "win",
    });
    expect(report.stats.winRate).toBe(1);
  });

  it("marks a loss when the stop is hit after fill", () => {
    const bars = brokenTop();
    bars.push(bar(bars.length, 22, 4, 21));
    const report = measureDoubleTopBottom(bars, { swingSpan: 1, priceTolerance: 0 });
    expect(report.trades[0]?.outcome).toBe("loss");
    expect(report.trades[0]?.target).toBe(-10);
    expect(report.stats.winRate).toBe(0);
  });
});
