import { describe, expect, it } from "vitest";
import { classifySignalBar } from "../../src/analyze/classifySignalBar.js";
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

describe("classifySignalBar", () => {
  it("throws when bars or options are invalid", () => {
    expect(() => classifySignalBar([])).toThrow(TypeError);
    expect(() => classifySignalBar(null as unknown as Bar[])).toThrow(TypeError);
    const bars = [bar(0, 1, 2, 0, 1)];
    expect(() => classifySignalBar(bars, null as unknown as object)).toThrow(TypeError);
    expect(() => classifySignalBar(bars, { swingSpan: 0 })).toThrow(TypeError);
    expect(() => classifySignalBar(bars, { tickSize: 0 })).toThrow(TypeError);
  });

  it("keeps a bull trend bar at a swing low", () => {
    const bars = [
      bar(0, 8, 12, 8, 11),
      bar(1, 9, 12, 7, 11),
      bar(2, 5, 10, 4, 9),
      bar(3, 8, 11, 6, 10),
      bar(4, 9, 12, 6, 11),
    ];
    const result = classifySignalBar(bars, { tickSize: 0.5 });
    expect(result.functionId).toBe("classifySignalBar");
    expect(result.confidence).toBe(1);
    expect(result.summary).toBe("signalBars=1; last=bull_signal_bar");
    expect(result.results).toEqual([
      {
        name: "bull_signal_bar",
        range: { start: timeAt(2), end: timeAt(2) },
        levels: [
          { name: "SignalBar", price: 4, time: timeAt(2) },
          { name: "Entry", price: 4.5, time: timeAt(2) },
          { name: "Stop", price: 3.5, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.evidence).toEqual({ items: [{ inside: false, outside: false }] });
  });

  it("keeps a bear trend bar at a swing high", () => {
    const bars = [
      bar(0, 4, 6, 3, 4),
      bar(1, 4, 7, 3, 5),
      bar(2, 9, 10, 4, 5),
      bar(3, 6, 8, 4, 5),
      bar(4, 5, 7, 3, 4),
    ];
    const result = classifySignalBar(bars);
    expect(result.results.map((item) => item.name)).toEqual(["bear_signal_bar"]);
    expect(result.results[0]?.levels[0]).toEqual({
      name: "SignalBar",
      price: 10,
      time: timeAt(2),
    });
    expect(result.evidence.items).toEqual([{ inside: false, outside: false }]);
  });

  it("drops a doji, a long tail, and an outside bar at the swing", () => {
    const doji = [
      bar(0, 8, 12, 8, 11),
      bar(1, 9, 12, 7, 11),
      bar(2, 6, 10, 4, 6.5),
      bar(3, 8, 11, 6, 10),
      bar(4, 9, 12, 6, 11),
    ];
    const longTail = [
      bar(0, 8, 12, 8, 11),
      bar(1, 9, 12, 7, 11),
      bar(2, 3, 10, 0, 8),
      bar(3, 8, 11, 6, 10),
      bar(4, 9, 12, 6, 11),
    ];
    const outside = [
      bar(0, 8, 11, 8, 10),
      bar(1, 9, 11, 7, 10),
      bar(2, 5, 13, 4, 12),
      bar(3, 8, 12, 6, 11),
      bar(4, 9, 12, 6, 11),
    ];
    expect(classifySignalBar(doji).results[0]?.name).toBe("unclear");
    expect(classifySignalBar(longTail).results[0]?.name).toBe("unclear");
    expect(classifySignalBar(outside).results[0]?.name).toBe("unclear");
    expect(classifySignalBar(doji).evidence).toEqual({ items: [] });
  });
});
