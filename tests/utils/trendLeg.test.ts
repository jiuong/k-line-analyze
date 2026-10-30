import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import { isSingleLegTrend, walkSingleLegs } from "../../src/utils/trendLeg.js";

function bar(high: number, low: number): Bar {
  return { time: 0, open: low, high, low, close: high };
}

describe("isSingleLegTrend", () => {
  it("rejects a single bar and a run of inside bars", () => {
    expect(isSingleLegTrend([bar(10, 8)])).toBe(false);
    expect(isSingleLegTrend([bar(10, 8), bar(10, 8), bar(9, 8.5)])).toBe(false);
  });

  it("keeps a rising leg that contains an inside bar", () => {
    const bars = [bar(10, 8), bar(11, 9), bar(10.5, 9.2), bar(12, 10)];
    expect(isSingleLegTrend(bars)).toBe(true);
  });

  it("merges both sides of a pullback of two or three bars", () => {
    expect(isSingleLegTrend(pullback(2, 0.4))).toBe(true);
    expect(isSingleLegTrend(pullback(3, 0.4))).toBe(true);
  });

  it("does not count an inside bar toward the three-bar pullback", () => {
    const bars = pullback(3, 0.4);
    bars.splice(3, 0, bar(17, 13.7));
    expect(isSingleLegTrend(bars)).toBe(true);
  });

  it("rejects a fourth reverse bar, a deeper break, a missing resume, or an outside bar", () => {
    expect(isSingleLegTrend(pullback(4, 0.4))).toBe(false);
    expect(isSingleLegTrend(pullback(1, 3))).toBe(false);
    expect(isSingleLegTrend(pullback(2, 0.4).slice(0, 4))).toBe(false);
    expect(isSingleLegTrend([bar(10, 8), bar(12, 10), bar(13, 9)])).toBe(false);
  });

  it("keeps a leg when the outside bar is only across a time hole", () => {
    const bars = [
      { ...bar(10, 8), time: 0 },
      { ...bar(12, 10), time: 60 },
      { ...bar(13, 9), time: 60 + 3_600 },
    ];

    expect(isSingleLegTrend(bars)).toBe(false);
    expect(isSingleLegTrend(bars, { ignoreTimeHoles: true })).toBe(true);
  });
});

/** Bull leg, then `count` lower bars, then one higher bar. Adverse stays near `adverse`. */
function pullback(count: number, adverse: number): Bar[] {
  const bars = [bar(14, 10), bar(18, 14)];
  for (let i = 0; i < count; i += 1) {
    bars.push(bar(17.5 - i * 0.2, 14 - adverse - i * 0.05));
  }
  const last = bars[bars.length - 1]!;
  bars.push(bar(last.high + 2, last.low + 2));
  return bars;
}

describe("walkSingleLegs", () => {
  it("returns maximal opposite runs with absolute indexes when offset is set", () => {
    const bars = [
      bar(10, 8),
      bar(9, 7),
      bar(8, 6),
      bar(8.5, 6.5),
      bar(9.5, 7.5),
      bar(10.5, 8.5),
    ];
    expect(walkSingleLegs(bars, 10)).toEqual([
      { direction: "bear", startIndex: 10, endIndex: 12 },
      { direction: "bull", startIndex: 13, endIndex: 15 },
    ]);
  });
});
