import { describe, expect, it } from "vitest";
import { classifySwingTrend } from "../../src/analyze/classifySwingTrend.js";
import type { Bar } from "../../src/types/bars.js";
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

describe("classifySwingTrend", () => {
  it("opens one bull trend from the K2 through the last bar", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 11),
      bar(3, 11, 13, 10, 12),
    ];

    const result = classifySwingTrend(bars);

    expect(result.functionId).toBe("classifySwingTrend");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.results).toEqual([
      {
        name: "bull_trend",
        range: { start: timeAt(1), end: timeAt(3) },
        levels: [
          { name: "L1", price: 6, time: timeAt(1) },
          { name: "H1", price: 13, time: timeAt(3) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `trends=1; last=bull_trend from=${timeAt(1)} to=${timeAt(3)}`,
    );
  });

  it("opens one bear trend from the K2 through the last bar", () => {
    const bars = [
      bar(0, 8, 11, 7, 10),
      bar(1, 10, 12, 8, 9),
      bar(2, 9, 11, 6, 7),
      bar(3, 7, 8, 4, 5),
    ];

    const result = classifySwingTrend(bars);

    expect(result.results).toEqual([
      {
        name: "bear_trend",
        range: { start: timeAt(1), end: timeAt(3) },
        levels: [
          { name: "H1", price: 12, time: timeAt(1) },
          { name: "L1", price: 4, time: timeAt(3) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `trends=1; last=bear_trend from=${timeAt(1)} to=${timeAt(3)}`,
    );
  });

  it("starts after a same-direction run at the later K2", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 11),
      bar(3, 12, 13, 9, 10),
      bar(4, 10, 12, 8, 9),
      bar(5, 9, 14, 10, 11),
    ];

    const result = classifySwingTrend(bars);

    expect(result.results).toEqual([
      {
        name: "bull_trend",
        range: { start: timeAt(4), end: timeAt(5) },
        levels: [
          { name: "L1", price: 8, time: timeAt(4) },
          { name: "H1", price: 14, time: timeAt(5) },
        ],
      },
    ]);
  });

  it("closes each segment on the next K2 and leaves the last one open", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 9),
      bar(3, 8, 11, 7, 10),
      bar(4, 10, 13, 8, 9),
      bar(5, 9, 12, 6, 6),
      bar(6, 10, 12, 8, 9),
      bar(7, 9, 11, 7, 8),
      bar(8, 8, 14, 9, 13),
      bar(9, 13, 15, 12, 14),
    ];

    const result = classifySwingTrend(bars);

    expect(result.results).toEqual([
      {
        name: "bull_trend",
        range: { start: timeAt(1), end: timeAt(4) },
        levels: [
          { name: "L1", price: 6, time: timeAt(1) },
          { name: "H1", price: 13, time: timeAt(4) },
        ],
      },
      {
        name: "bear_trend",
        range: { start: timeAt(4), end: timeAt(7) },
        levels: [
          { name: "H1", price: 13, time: timeAt(4) },
          { name: "L1", price: 7, time: timeAt(7) },
        ],
      },
      {
        name: "bull_trend",
        range: { start: timeAt(7), end: timeAt(9) },
        levels: [
          { name: "L1", price: 7, time: timeAt(7) },
          { name: "H1", price: 15, time: timeAt(9) },
        ],
      },
    ]);
    expect(result.results[0]?.range.end).toBe(result.results[1]?.range.start);
    expect(result.results[1]?.range.end).toBe(result.results[2]?.range.start);
    expect(result.summary).toBe(
      `trends=3; last=bull_trend from=${timeAt(7)} to=${timeAt(9)}`,
    );
  });

  it("returns unclear when no reversal is confirmed", () => {
    const bars = [
      bar(0, 10, 11, 9, 10),
      bar(1, 9, 10, 7, 8),
      bar(2, 8, 12, 8, 11),
    ];

    const result = classifySwingTrend(bars);

    expect(result.results).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [],
      },
    ]);
    expect(result.summary).toBe("trends=0; last=unclear from=- to=-");
    expect(result.confidence).toBe(1);
  });

  it("returns unclear for one or two bars", () => {
    const one = classifySwingTrend([bar(0, 10, 11, 7, 8)]);
    const two = classifySwingTrend([
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
    ]);

    expect(one.results).toEqual([
      {
        name: "unclear",
        range: { start: timeAt(0), end: timeAt(0) },
        levels: [],
      },
    ]);
    expect(two.results[0]?.name).toBe("unclear");
    expect(two.results[0]?.range).toEqual({
      start: timeAt(0),
      end: timeAt(1),
    });
  });

  it("throws TypeError for a non-array or an empty array", () => {
    expect(() => classifySwingTrend([])).toThrow(TypeError);
    expect(() => classifySwingTrend(undefined as unknown as Bar[])).toThrow(
      /classifySwingTrend/,
    );
  });
});
