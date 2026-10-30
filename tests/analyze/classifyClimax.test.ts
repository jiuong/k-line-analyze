import { describe, expect, it } from "vitest";
import { classifyClimax } from "../../src/analyze/classifyClimax.js";
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

describe("classifyClimax", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyClimax([])).toThrow(TypeError);
    expect(() => classifyClimax(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 1, 2, 0, 1)];
    expect(() => classifyClimax(bars, null as unknown as object)).toThrow(TypeError);
    expect(() => classifyClimax(bars, { swingSpan: 0 })).toThrow(TypeError);
  });

  it("marks three bull trend bars and keeps the highest high", () => {
    const bars = [
      bar(0, 1, 2, 0.5, 1.9),
      bar(1, 2, 3.2, 1.6, 3.1),
      bar(2, 3, 4.5, 2.8, 4.4),
    ];
    const result = classifyClimax(bars);
    expect(result.functionId).toBe("classifyClimax");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("climaxes=1; last=buy_climax");
    expect(result.evidence).toEqual({ items: [{ source: "bars" }] });
    expect(result.results).toEqual([
      {
        name: "buy_climax",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [{ name: "BarHigh", price: 4.5, time: timeAt(2) }],
      },
    ]);
  });

  it("marks three bear trend bars at the lowest low", () => {
    const bars = [
      bar(0, 5, 5.2, 3, 3.2),
      bar(1, 4, 4.2, 2, 2.2),
      bar(2, 3, 3.2, 1, 1.2),
    ];
    const result = classifyClimax(bars);
    expect(result.results).toEqual([
      {
        name: "sell_climax",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [{ name: "BarLow", price: 1, time: timeAt(2) }],
      },
    ]);
    expect(result.evidence.items).toEqual([{ source: "bars" }]);
  });

  it("marks a doubled bull leg and hides the shorter bar run inside it", () => {
    const bars = [
      bar(0, 14, 16, 14, 15),
      bar(1, 11, 12, 10, 11.5),
      bar(2, 15, 17, 15, 16),
      bar(3, 18, 20, 18, 19),
      bar(4, 16, 17, 16, 16.4),
      bar(5, 13, 14, 12, 13),
      bar(6, 15.2, 18, 15, 17.8),
      bar(7, 20.2, 24, 20, 23.5),
      bar(8, 28.2, 32, 28, 31.5),
      bar(9, 48, 50, 46, 47),
      bar(10, 40, 42, 39, 40),
    ];
    const result = classifyClimax(bars, { swingSpan: 1 });
    expect(result.summary).toBe("climaxes=1; last=buy_climax");
    expect(result.evidence).toEqual({ items: [{ source: "legs" }] });
    expect(result.results).toEqual([
      {
        name: "buy_climax",
        range: { start: timeAt(5), end: timeAt(9) },
        levels: [{ name: "BarHigh", price: 50, time: timeAt(9) }],
      },
    ]);
  });

  it("returns unclear when the run is shorter than three bars", () => {
    const bars = [bar(0, 1, 2, 0.5, 1.9), bar(1, 2, 3.2, 1.6, 3.1)];
    const result = classifyClimax(bars);
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.summary).toBe("climaxes=0; last=unclear");
    expect(result.evidence).toEqual({ items: [] });
  });
});
