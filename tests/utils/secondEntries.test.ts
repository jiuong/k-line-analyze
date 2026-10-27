import { describe, expect, it } from "vitest";
import type { AnalyzeResult } from "../../src/types/analysis.js";
import type { Bar } from "../../src/types/bars.js";
import {
  findSecondEntriesFrom,
  resolveProtectiveImpulse,
} from "../../src/utils/secondEntries.js";
import type { SwingLeg } from "../../src/utils/swingLegs.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

function timeAt(index: number): string {
  return toTimeString(T0 + index * 60);
}

function major(
  name: "bull_trend" | "bear_trend",
  startIndex: number,
  endIndex: number,
): AnalyzeResult {
  return {
    name,
    range: { start: timeAt(startIndex), end: timeAt(endIndex) },
    levels: [],
  };
}

/** Bull impulse, ABC pullback, HH resume — same shape as classifySecondEntry fixture. */
function abcBull(): Bar[] {
  return [
    bar(0, 50, 55, 48, 52),
    bar(1, 52, 54, 40, 42),
    bar(2, 22, 35, 20, 34),
    bar(3, 34, 55, 33, 54),
    bar(4, 54, 70, 53, 68),
    bar(5, 66, 67, 58, 59),
    bar(6, 59, 60, 50, 51),
    bar(7, 51, 58, 50.5, 57),
    bar(8, 57, 62, 56, 61),
    bar(9, 60, 61, 54, 55),
    bar(10, 55, 56, 52, 53),
    bar(11, 54, 72, 53, 71),
    bar(12, 71, 80, 70, 79),
    bar(13, 79, 78, 74, 75),
    bar(14, 75, 76, 73, 74),
  ];
}

/**
 * Mimic 2026-10-27 19:30: short bull major covering impulse only; later bounce
 * under P1 sits in a bear major — must not emit high2.
 *
 * Legs (swingSpan=1): bull 0→1, bear 1→2, bull 2→3 (H1), bear 3→4 deep under P1,
 * bull 4→5 (would-be H2 break), then more bars so resume never exceeds impulse high.
 */
function breakOutsideMajorBars(): Bar[] {
  return [
    bar(0, 100, 101, 90, 91), // swing low 90
    bar(1, 100, 110, 99, 108), // swing high 110 — bull impulse 90→110
    bar(2, 105, 106, 100, 101), // pullback low 100
    bar(3, 101, 109, 100.5, 108), // H1 high break of prior
    bar(4, 104, 105, 80, 82), // deep bear under P1=90
    bar(5, 82, 88, 81, 87), // bounce high break — Entry ~105? need adjacent break
    bar(6, 87, 89, 86, 88),
    bar(7, 88, 89, 85, 86),
    bar(8, 86, 87, 84, 85),
  ];
}

describe("findSecondEntriesFrom", () => {
  it("keeps high2 when break stays inside the impulse major", () => {
    const bars = abcBull();
    const majors = [major("bull_trend", 0, 14)];
    const hits = findSecondEntriesFrom(bars, majors, undefined);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.bull).toBe(true);
    expect(hits[0]!.entryPrice).toBe(56);
    expect(hits[0]!.p1Price).toBe(20);
    expect(hits[0]!.p1Price).toBeLessThan(hits[0]!.entryPrice);
  });

  it("drops high2 when breakIndex is past the impulse parent major", () => {
    const bars = abcBull();
    // Impulse for the ABC window ends at index 4 (price 70); truncate major there so
    // the H2 break (~11) falls outside.
    const majors = [major("bull_trend", 0, 4), major("bear_trend", 5, 14)];
    const hits = findSecondEntriesFrom(bars, majors, undefined);
    expect(hits.filter((hit) => hit.bull)).toEqual([]);
  });

  it("drops high2 when stop (P1) is not below entry", () => {
    const bars = breakOutsideMajorBars();
    // Cover all bars with one bull major so only the stop-side gate can reject.
    const majors = [major("bull_trend", 0, 8)];
    const hits = findSecondEntriesFrom(bars, majors, undefined);
    for (const hit of hits) {
      if (!hit.bull) continue;
      expect(hit.p1Price).toBeLessThan(hit.entryPrice);
    }
  });

  it("rejects non-integer entrySwingSpan", () => {
    const bars = abcBull();
    expect(() =>
      findSecondEntriesFrom(bars, [major("bull_trend", 0, 14)], undefined, {
        entrySwingSpan: 0,
      }),
    ).toThrow(/entrySwingSpan/);
  });

  it("does not let an early open impulse starve a later high2", () => {
    // Early bull impulse never gets a newer HH; later ABC still must emit high2.
    const bars = [
      bar(0, 10, 12, 5, 6), // deep early low
      bar(1, 6, 40, 5.5, 39), // early high 40 — no later HH above 40
      bar(2, 39, 39.5, 38, 38.5),
      ...abcBull().map((b, index) =>
        bar(index + 3, b.open, b.high, b.low, b.close),
      ),
    ];
    const majors = [major("bull_trend", 0, bars.length - 1)];
    const hits = findSecondEntriesFrom(bars, majors, undefined, {
      entrySwingSpan: 1,
    });
    expect(hits.some((hit) => hit.bull)).toBe(true);
  });

  it("walks P1 back when pullback violates the fine impulse start", () => {
    // Mirror of 10.27 afternoon: fine bear P1=100 violated by PB high 105 →
    // prior bear start 120; P2 stays fine end 80.
    const fineImpulse: SwingLeg = {
      direction: "bear",
      startIndex: 3,
      endIndex: 5,
      startPrice: 100,
      endPrice: 80,
    };
    const legs: SwingLeg[] = [
      {
        direction: "bear",
        startIndex: 0,
        endIndex: 1,
        startPrice: 120,
        endPrice: 95,
      },
      {
        direction: "bull",
        startIndex: 1,
        endIndex: 3,
        startPrice: 95,
        endPrice: 100,
      },
      fineImpulse,
      {
        direction: "bull",
        startIndex: 5,
        endIndex: 7,
        startPrice: 80,
        endPrice: 105,
      },
    ];
    const series = [
      bar(0, 119, 120, 118, 119),
      bar(1, 119, 119, 95, 96),
      bar(2, 96, 98, 95, 97),
      bar(3, 97, 100, 96, 99), // fine P1 bar
      bar(4, 99, 99.5, 85, 86),
      bar(5, 86, 87, 80, 81), // fine P2
      bar(6, 81, 90, 80.5, 89),
      bar(7, 89, 105, 88, 104), // PB high violates 100
      bar(8, 104, 104.5, 103, 103.5), // L2 break neighborhood
    ];
    const resolved = resolveProtectiveImpulse(
      series,
      legs,
      fineImpulse,
      false,
      8,
    );
    expect(resolved.p1Price).toBe(120);
    expect(resolved.p1Index).toBe(0);
    expect(resolved.p2Price).toBe(80);
    expect(resolved.p2Index).toBe(5);
  });

  it("keeps fine P1 when pullback does not violate the start", () => {
    const fineImpulse: SwingLeg = {
      direction: "bear",
      startIndex: 0,
      endIndex: 1,
      startPrice: 100,
      endPrice: 80,
    };
    const legs: SwingLeg[] = [fineImpulse];
    const series = [
      bar(0, 99, 100, 98, 99),
      bar(1, 99, 99, 80, 81),
      bar(2, 81, 90, 80.5, 89), // PB high 90 < 100
      bar(3, 89, 89.5, 88, 88.5),
    ];
    const resolved = resolveProtectiveImpulse(
      series,
      legs,
      fineImpulse,
      false,
      3,
    );
    expect(resolved.p1Price).toBe(100);
    expect(resolved.p2Price).toBe(80);
  });
});
