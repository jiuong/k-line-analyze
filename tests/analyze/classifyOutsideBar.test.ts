import { describe, expect, it } from "vitest";
import { classifyInsideBar } from "../../src/analyze/classifyInsideBar.js";
import { classifyOutsideBar } from "../../src/analyze/classifyOutsideBar.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function candle(
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

describe("classifyOutsideBar", () => {
  it("throws when bars is empty or not an array", () => {
    expect(() => classifyOutsideBar([])).toThrow(TypeError);
    expect(() => classifyOutsideBar(null as unknown as Bar[])).toThrow(TypeError);
  });

  it("marks a bar beyond both sides and does not assign a direction", () => {
    const bars = [candle(0, 5, 10, 0, 5), candle(1, 4, 11, -1, 6)];
    const result = classifyOutsideBar(bars);
    const time = toTimeString(bars[1]!.time);
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("outsideBars=1; last=outside_bar");
    expect(result.evidence).toEqual({});
    expect(result.results).toEqual([
      {
        name: "outside_bar",
        range: { start: time, end: time },
        levels: [
          { name: "BarHigh", price: 11, time },
          { name: "BarLow", price: -1, time },
        ],
      },
    ]);
    expect(classifyInsideBar(bars).results[0]?.name).toBe("unclear");
  });

  it("does not mark a bar that equals one side", () => {
    const bars = [candle(0, 5, 10, 0, 5), candle(1, 4, 11, 0, 6)];
    const result = classifyOutsideBar(bars);
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.results[0]?.levels).toEqual([]);
    expect(result.summary).toBe("outsideBars=0; last=unclear");
    expect(classifyInsideBar(bars).results[0]?.name).toBe("unclear");
  });
});
