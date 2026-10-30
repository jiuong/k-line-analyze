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
  it("emits H1 as a bull reversal priced on the highs", () => {
    const bars = [
      bar(0, 10, 12, 8, 9),
      bar(1, 9, 10, 7, 8),
      bar(2, 8, 11, 8, 10),
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
          { name: "K1", price: 12, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 11, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bull_reversal K1@${timeAt(0)} K2@${timeAt(1)} confirm@${timeAt(2)}`,
    );
  });

  it("emits L1 as a bear reversal priced on the lows", () => {
    const bars = [
      bar(0, 10, 12, 5, 11),
      bar(1, 11, 13, 8, 12),
      bar(2, 12, 12, 6, 7),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 5, time: timeAt(0) },
          { name: "K2", price: 8, time: timeAt(1) },
          { name: "Confirm", price: 6, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bear_reversal K1@${timeAt(0)} K2@${timeAt(1)} confirm@${timeAt(2)}`,
    );
  });

  it("emits a bull reversal when a bullish K3 engulfs K2 and K4 does not engulf K3", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 9, 12, 6, 11),
      bar(3, 11, 13, 7, 12),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 11, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 12, time: timeAt(2) },
        ],
      },
    ]);
  });

  it("emits a bear reversal when a bearish K3 engulfs K2 and K4 does not engulf K3", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 11, 12, 6, 7),
      bar(3, 7, 11, 7, 8),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 9, time: timeAt(0) },
          { name: "K2", price: 8, time: timeAt(1) },
          { name: "Confirm", price: 6, time: timeAt(2) },
        ],
      },
    ]);
  });

  it("uses K4 color when K3's excess is small and K4 engulfs with a larger excess", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 8, 10.5, 7, 9),
      bar(3, 11, 12, 5, 6),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(3) },
        levels: [
          { name: "K1", price: 9, time: timeAt(0) },
          { name: "K2", price: 8, time: timeAt(1) },
          { name: "Confirm", price: 5, time: timeAt(3) },
        ],
      },
    ]);
  });

  it("emits a bull reversal when a small engulf is broken only upward", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 8, 10.5, 7, 9),
      bar(3, 8, 12, 7.5, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(3) },
        levels: [
          { name: "K1", price: 11, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 12, time: timeAt(3) },
        ],
      },
    ]);
  });

  it("emits a bear reversal when a small engulf is broken only downward", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 11, 12, 7.5, 8),
      bar(3, 8, 11, 6, 7),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(3) },
        levels: [
          { name: "K1", price: 9, time: timeAt(0) },
          { name: "K2", price: 8, time: timeAt(1) },
          { name: "Confirm", price: 6, time: timeAt(3) },
        ],
      },
    ]);
  });

  it("treats an excess equal to half the covered range as small", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 6, 9),
      bar(2, 8, 12, 5, 10),
      bar(3, 9, 13, 6, 12),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(3) },
        levels: [
          { name: "K1", price: 11, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 13, time: timeAt(3) },
        ],
      },
    ]);
  });

  it("emits nothing when the engulfing bar is a doji", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 9, 12, 6, 9),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
  });

  it("emits nothing when a small engulf has no next bar", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 8, 10.5, 7, 9),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
  });

  it("uses K3 color when K3 engulfs K2 and there is no K4", () => {
    const bars = [
      bar(0, 9, 11, 9, 10),
      bar(1, 10, 10, 8, 9),
      bar(2, 9, 12, 6, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 11, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 12, time: timeAt(2) },
        ],
      },
    ]);
  });

  it("does not treat an equal neighboring high as H1", () => {
    const bars = [
      bar(0, 9, 12, 8, 10),
      bar(1, 10, 10, 9, 9),
      bar(2, 9, 10, 9, 10),
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

  it("keeps only the first signal when two bulls are consecutive", () => {
    const bars = [
      bar(0, 8, 12, 5, 9),
      bar(1, 9, 10, 6, 8),
      bar(2, 8, 11, 7, 10),
      bar(3, 10, 9, 7, 8),
      bar(4, 8, 10, 8, 9),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 12, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 11, time: timeAt(2) },
        ],
      },
    ]);
    expect(result.summary).toBe(
      `reversals=1; last=bull_reversal K1@${timeAt(0)} K2@${timeAt(1)} confirm@${timeAt(2)}`,
    );
  });

  it("uses the confirmed K2 as the next K1", () => {
    const bars = [
      bar(0, 8, 12, 8, 9),
      bar(1, 9, 10, 6, 8),
      bar(2, 8, 11, 7, 10),
      bar(3, 10, 9, 5, 6),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results.map((item) => item.name)).toEqual([
      "bull_reversal",
      "bear_reversal",
    ]);
    expect(result.results[1]?.range).toEqual({
      start: timeAt(1),
      end: timeAt(3),
    });
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

  it("does not emit L1 when K3's low stays inside an upward gap", () => {
    const bars = [
      bar(0, 9, 10, 6, 8),
      bar(1, 13, 14, 12, 13),
      bar(2, 12, 13, 11, 11),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
  });

  it("emits L1 when K3's low breaks through an upward gap", () => {
    const bars = [
      bar(0, 9, 10, 6, 8),
      bar(1, 13, 14, 12, 13),
      bar(2, 12, 13, 9, 10),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 6, time: timeAt(0) },
          { name: "K2", price: 12, time: timeAt(1) },
          { name: "Confirm", price: 9, time: timeAt(2) },
        ],
      },
    ]);
  });

  it("does not emit H1 when K3's high stays inside a downward gap", () => {
    const bars = [
      bar(0, 21, 22, 20, 21),
      bar(1, 15, 16, 14, 15),
      bar(2, 16, 18, 15, 17),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
  });

  it("keeps a gap inside the covered length when judging a large engulf", () => {
    const bars = [
      bar(0, 9, 10, 8, 9),
      bar(1, 14, 15, 12, 13),
      bar(2, 11, 17, 9, 16),
      bar(3, 16, 18, 10, 17),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bull_reversal",
        range: { start: timeAt(0), end: timeAt(3) },
        levels: [
          { name: "K1", price: 10, time: timeAt(0) },
          { name: "K2", price: 15, time: timeAt(1) },
          { name: "Confirm", price: 18, time: timeAt(3) },
        ],
      },
    ]);
  });

  it("does not let a pure gap engulf the previous bar", () => {
    const bearish = [
      bar(0, 9, 10, 8, 9),
      bar(1, 14, 15, 12, 12),
      bar(2, 14, 14, 13, 13),
    ];
    const doji = [
      bar(0, 9, 10, 8, 9),
      bar(1, 13, 15, 12, 13),
      bar(2, 14, 14, 13, 13),
    ];
    const gapDownBull = [
      bar(0, 21, 22, 20, 21),
      bar(1, 14, 16, 14, 16),
      bar(2, 16, 17, 15, 16),
    ];

    expect(classifyReversalSignal(bearish).results[0]?.name).toBe("no_reversal");
    expect(classifyReversalSignal(doji).results[0]?.name).toBe("no_reversal");
    expect(classifyReversalSignal(gapDownBull).results[0]?.name).toBe("no_reversal");
  });

  it("does not extend a bar whose low only touches the previous high", () => {
    const bars = [
      bar(0, 9, 10, 6, 8),
      bar(1, 12, 14, 10, 13),
      bar(2, 12, 13, 9, 10),
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results).toEqual([
      {
        name: "bear_reversal",
        range: { start: timeAt(0), end: timeAt(2) },
        levels: [
          { name: "K1", price: 6, time: timeAt(0) },
          { name: "K2", price: 10, time: timeAt(1) },
          { name: "Confirm", price: 9, time: timeAt(2) },
        ],
      },
    ]);
  });

  it("does not emit L1 when a multi-hour gap still leaves K3 inside the gap", () => {
    const bars = [
      bar(0, 9, 10, 6, 8),
      { ...bar(1, 13, 14, 12, 13), time: T0 + 5 * 60 * 60 },
      { ...bar(2, 12, 13, 11, 11), time: T0 + 5 * 60 * 60 + 60 },
    ];

    const result = classifyReversalSignal(bars);

    expect(result.results[0]?.name).toBe("no_reversal");
  });

  it("throws TypeError for a non-array or an empty array", () => {
    expect(() => classifyReversalSignal([])).toThrow(TypeError);
    expect(() =>
      classifyReversalSignal(undefined as unknown as Bar[]),
    ).toThrow(TypeError);
  });
});
