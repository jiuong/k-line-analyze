import { describe, expect, it } from "vitest";
import { classifyMicroDouble } from "../../src/analyze/classifyMicroDouble.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(
  index: number,
  high: number,
  low: number,
  close = (high + low) / 2,
): Bar {
  return { time: T0 + index * 60, open: low, high, low, close };
}

describe("classifyMicroDouble", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifyMicroDouble([])).toThrow(TypeError);
    expect(() => classifyMicroDouble(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 2, 1)];
    expect(() => classifyMicroDouble(bars, { priceTolerance: -1 })).toThrow(
      /classifyMicroDouble: priceTolerance/,
    );
    expect(() => classifyMicroDouble(bars, { tickSize: 0 })).toThrow(
      /classifyMicroDouble: tickSize/,
    );
  });

  it("marks adjacent equal highs without a swing span", () => {
    const bars = [bar(0, 10, 8), bar(1, 10, 6), bar(2, 9, 7)];
    const result = classifyMicroDouble(bars, { priceTolerance: 0 });
    expect(result.functionId).toBe("classifyMicroDouble");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("microDoubles=1; last=micro_double_top");
    expect(result.results).toEqual([
      {
        name: "micro_double_top",
        range: {
          start: toTimeString(bars[0]!.time),
          end: toTimeString(bars[1]!.time),
        },
        levels: [
          { name: "Top1", price: 10, time: toTimeString(bars[0]!.time) },
          { name: "Top2", price: 10, time: toTimeString(bars[1]!.time) },
        ],
      },
    ]);
  });

  it("skips a pair when the later bar is outside", () => {
    const bars = [bar(0, 10, 8), bar(1, 10.1, 7.5)];
    const result = classifyMicroDouble(bars);
    expect(result.results.map((item) => item.name)).toEqual(["unclear"]);
  });

  it("does not pair highs that have a bar between them", () => {
    const bars = [bar(0, 10, 8), bar(1, 6, 4), bar(2, 10, 8)];
    const result = classifyMicroDouble(bars, { priceTolerance: 0 });
    expect(result.results[0]?.name).toBe("unclear");
  });

  it("emits the top before the bottom when both sides match", () => {
    const bars = [bar(0, 10, 5), bar(1, 10, 5)];
    const result = classifyMicroDouble(bars, { priceTolerance: 0 });
    expect(result.results.map((item) => item.name)).toEqual([
      "micro_double_top",
      "micro_double_bottom",
    ]);
    expect(result.summary).toBe("microDoubles=2; last=micro_double_bottom");
  });

  it("omits Entry until a later close breaks the opposite extreme", () => {
    const held = [bar(0, 10, 8), bar(1, 10, 8), bar(2, 9.5, 8.2, 9)];
    expect(classifyMicroDouble(held, { priceTolerance: 0 }).results[0]?.levels.map((level) => level.name)).toEqual([
      "Top1",
      "Top2",
    ]);

    const broken = [bar(0, 10, 8), bar(1, 10, 7), bar(2, 8, 6, 6.5)];
    const levels = classifyMicroDouble(broken, { priceTolerance: 0, tickSize: 0.1 }).results[0]!.levels;
    expect(levels.map((level) => level.name)).toEqual(["Top1", "Top2", "Entry", "Stop"]);
    expect(levels[2]).toEqual({
      name: "Entry",
      price: 6.9,
      time: toTimeString(broken[2]!.time),
    });
    expect(levels[3]).toEqual({
      name: "Stop",
      price: 10.1,
      time: toTimeString(broken[1]!.time),
    });
  });
});
