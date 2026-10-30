import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import {
  countAdjacentEntries,
  entryLevelName,
} from "../../src/utils/entryCounts.js";

function bar(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: 1_700_000_000 + index * 60, open, high, low, close };
}

describe("countAdjacentEntries", () => {
  it("throws on bad bars or tickSize", () => {
    expect(() => countAdjacentEntries(null as unknown as Bar[])).toThrow(TypeError);
    expect(() => countAdjacentEntries([bar(0, 1, 2, 0, 1)], 0)).toThrow(TypeError);
    expect(() =>
      countAdjacentEntries([bar(0, 1, Number.NaN, 0, 1), bar(1, 1, 2, 0, 1)]),
    ).toThrow(TypeError);
  });

  it("marks a high entry on K2 when high clears K1 high", () => {
    const bars = [bar(0, 10, 12, 9, 11), bar(1, 11, 14, 10, 13)];
    const found = countAdjacentEntries(bars);
    expect(found).toEqual([
      {
        label: "high1",
        breakIndex: 1,
        priorIndex: 0,
        bull: true,
        entryPrice: 12,
      },
    ]);
    expect(entryLevelName("high1")).toBe("H1");
  });

  it("marks a low entry on K2 when low clears K1 low", () => {
    const bars = [bar(0, 10, 12, 9, 11), bar(1, 10, 11, 7, 8)];
    const found = countAdjacentEntries(bars);
    expect(found).toEqual([
      {
        label: "low1",
        breakIndex: 1,
        priorIndex: 0,
        bull: false,
        entryPrice: 9,
      },
    ]);
  });

  it("marks both high and low on an engulfing K2", () => {
    const bars = [bar(0, 10, 12, 9, 11), bar(1, 11, 14, 7, 8)];
    const found = countAdjacentEntries(bars);
    expect(found.map((item) => item.label)).toEqual(["high1", "low1"]);
    expect(found[0]?.entryPrice).toBe(12);
    expect(found[1]?.entryPrice).toBe(9);
  });

  it("applies tick beyond K1 extremes", () => {
    const bars = [bar(0, 10, 12, 9, 11), bar(1, 11, 12.4, 8.6, 10)];
    expect(countAdjacentEntries(bars, 0.5)).toEqual([]);
    const cleared = countAdjacentEntries(
      [bar(0, 10, 12, 9, 11), bar(1, 11, 12.5, 8.5, 10)],
      0.5,
    );
    expect(cleared).toEqual([
      {
        label: "high1",
        breakIndex: 1,
        priorIndex: 0,
        bull: true,
        entryPrice: 12.5,
      },
      {
        label: "low1",
        breakIndex: 1,
        priorIndex: 0,
        bull: false,
        entryPrice: 8.5,
      },
    ]);
  });

  it("caps high and low labels at three each", () => {
    const rising: Bar[] = [bar(0, 10, 10, 10, 10)];
    for (let index = 1; index <= 5; index += 1) {
      const high = 10 + index;
      rising.push(bar(index, high, high, high - 0.5, high));
    }
    expect(
      countAdjacentEntries(rising)
        .filter((item) => item.bull)
        .map((item) => item.label),
    ).toEqual(["high1", "high2", "high3"]);

    const falling: Bar[] = [bar(0, 20, 20, 20, 20)];
    for (let index = 1; index <= 5; index += 1) {
      const low = 20 - index;
      falling.push(bar(index, low, low + 0.5, low, low));
    }
    expect(
      countAdjacentEntries(falling)
        .filter((item) => !item.bull)
        .map((item) => item.label),
    ).toEqual(["low1", "low2", "low3"]);
  });

  it("needs no trend window to emit marks", () => {
    const bars = [bar(0, 1, 2, 0, 1), bar(1, 1, 3, -1, 0)];
    expect(countAdjacentEntries(bars)).toHaveLength(2);
  });
});
