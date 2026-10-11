import { describe, expect, it } from "vitest";
import { classifyReversalSignal } from "../../src/analyze/classifyReversalSignal.js";
import type { Bar } from "../../src/types/bars.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, open: number, high: number, low: number, close: number): Bar {
  return { time: T0 + index * 60, open, high, low, close };
}

function timeAt(index: number): string {
  return toTimeString(T0 + index * 60);
}

describe("classifyReversalSignal", () => {
  it("emits a bull reversal when K3 makes a higher high and higher low", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.functionId).toBe("classifyReversalSignal");
    expect(result.confidence).toBe(1);
    expect(result.evidence).toEqual({});
    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 11, time: timeAt(0) },
          { name: "K2", price: 6, time: timeAt(1) },
          { name: "Confirm", price: 12, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bull_reversal K1@${timeAt(0)} K2@${timeAt(1)} confirm@${timeAt(2)}`,
    );
  });

  it("accepts a bull K2 whose high equals K1 high", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 11, 6, 7),
      bar(2, 7, 12, 8, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("bull_reversal");
    expect(result.results[0]?.levels[1]).toEqual({
      name: "K2",
      price: 6,
      time: timeAt(1),
    });
  });

  it("skips an inside bar that would confirm against K2 and uses the next bar", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 14, 6, 8),
      bar(3, 8, 12, 7, 9),
      bar(4, 9, 13, 8, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.name).toBe("bull_reversal");
    expect(result.results[0]?.range).toEqual({
      start: timeAt(0),
      end: timeAt(4),
    });
    expect(result.results[0]?.levels[2]).toEqual({
      name: "Confirm",
      price: 13,
      time: timeAt(4),
    });
  });

  it("voids a bull pair on a new low and restarts from the previous bar", () => {
    const bars = [
      bar(0, 20, 21, 17, 18),
      bar(1, 18, 19, 16, 17),
      bar(2, 18, 20, 16, 16),
      bar(3, 16, 18, 15, 15),
      bar(4, 15, 19, 16, 17),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(2), end: timeAt(4) },
        levels: [
          { name: "K1", price: 20, time: timeAt(2) },
          { name: "K2", price: 15, time: timeAt(3) },
          { name: "Confirm", price: 19, time: timeAt(4) },
        ],
      },
    ]);
  });

  it("emits a bear reversal with low, high, and low prices", () => {
    const bars = [
      bar(0, 8, 11, 7, 10),
      bar(1, 10, 12, 8, 9),
      bar(2, 9, 11, 6, 7),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 7, time: timeAt(0) },
          { name: "K2", price: 12, time: timeAt(1) },
          { name: "Confirm", price: 6, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bear_reversal K1@${timeAt(0)} K2@${timeAt(1)} confirm@${timeAt(2)}`,
    );
  });

  it("voids a bear pair on a new high and restarts from the previous bar", () => {
    const bars = [
      bar(0, 10, 12, 9, 11),
      bar(1, 11, 14, 10, 13),
      bar(2, 13, 14, 12, 14),
      bar(3, 14, 16, 13, 15),
      bar(4, 15, 15, 11, 12),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(2), end: timeAt(4) },
        levels: [
          { name: "K1", price: 12, time: timeAt(2) },
          { name: "K2", price: 16, time: timeAt(3) },
          { name: "Confirm", price: 11, time: timeAt(4) },
        ],
      },
    ]);
  });

  it("keeps only the later signal when two bulls are consecutive", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 11),
      bar(3, 12, 13, 9, 10),
      bar(4, 10, 12, 8, 9),
      bar(5, 9, 14, 10, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(3), end: timeAt(5) },
        levels: [
          { name: "K1", price: 13, time: timeAt(3) },
          { name: "K2", price: 8, time: timeAt(4) },
          { name: "Confirm", price: 14, time: timeAt(5) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bull_reversal K1@${timeAt(3)} K2@${timeAt(4)} confirm@${timeAt(5)}`,
    );
  });

  it("keeps a bull and a following bear", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 7, 12, 8, 9),
      bar(3, 8, 11, 7, 10),
      bar(4, 10, 13, 8, 9),
      bar(5, 9, 12, 6, 6),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results.map((item) => item.range)).toEqual([
      { start: timeAt(0), end: timeAt(2) },
      { start: timeAt(3), end: timeAt(5) },
    ]);
    expect(result.results.map((item) => item.name)).toEqual([
      "bull_reversal",
      "bear_reversal",
    ]);
    expect(result.summary).toBe(
      `reversals=2; last=bear_reversal K1@${timeAt(3)} K2@${timeAt(4)} confirm@${timeAt(5)}`,
    );
  });

  it("does not reuse the confirm bar as the next K1", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 10, 6, 7),
      bar(2, 9, 13, 8, 12),
      bar(3, 12, 14, 9, 11),
      bar(4, 11, 12, 7, 8),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results.map((item) => item.name)).toEqual(["bull_reversal"]);
    expect(result.results[0]?.range.end).toBe(timeAt(2));
  });

  it("does not treat a doji as K1", () => {
    const bars = [
      bar(0, 10, 11, 9, 10),
      bar(1, 9, 10, 7, 8),
      bar(2, 8, 12, 8, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "no_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [],
      },
    ]);
    expect(result.summary).toBe(
      "reversals=0; last=no_reversal K1@- K2@- confirm@-",
    );
  });

  it("rejects a bull K2 whose high exceeds K1", () => {
    const bars = [
      bar(0, 10, 11, 7, 8),
      bar(1, 8, 12, 6, 7),
      bar(2, 7, 13, 8, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
    expect(result.results[0]?.levels).toEqual([]);
  });

  it("returns unclear for one or two bars", () => {
    const one = classifyReversalSignal([bar(0, 10, 11, 7, 8)]);
    const two = classifyReversalSignal([
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
    expect(one.summary).toBe("reversals=0; last=unclear K1@- K2@- confirm@-");
    expect(two.results[0]?.name).toBe("unclear");
    expect(two.results[0]?.range).toEqual({
      start: timeAt(0),
      end: timeAt(1),
    });
    expect(one.confidence).toBe(1);
    expect(two.confidence).toBe(1);
  });

  it("throws TypeError for a non-array or an empty array", () => {
    expect(() => classifyReversalSignal([])).toThrow(TypeError);
    expect(() =>
      classifyReversalSignal(undefined as unknown as Bar[]),
    ).toThrow(TypeError);
  });
});
