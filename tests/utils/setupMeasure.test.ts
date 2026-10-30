import { describe, expect, it } from "vitest";
import type { Bar } from "../../src/types/bars.js";
import {
  measureReport,
  rewardRisk,
  resolveOutcome,
  resolveTradeResult,
  summarizeTrades,
  type SetupTrade,
} from "../../src/utils/setupMeasure.js";
import { toTimeString } from "../../src/utils/time.js";

const T0 = 1_700_000_000;

function bar(index: number, high: number, low: number, close = (high + low) / 2): Bar {
  return { time: T0 + index * 60, open: close, high, low, close };
}

function time(index: number): string {
  return toTimeString(T0 + index * 60);
}

function trade(partial: Partial<SetupTrade> & Pick<SetupTrade, "basis" | "outcome">): SetupTrade {
  return {
    direction: "up",
    signalTime: time(0),
    signalPrice: 10,
    entry: 10,
    stop: 8,
    target: 14,
    risk: 2,
    reward: 4,
    rewardRisk: 2,
    maxRewardRisk: null,
    range: { start: time(0), end: time(2) },
    ...partial,
  };
}

describe("rewardRisk", () => {
  it("returns risk, reward, and the ratio", () => {
    expect(rewardRisk(10, 8, 14)).toEqual({ risk: 2, reward: 4, rewardRisk: 2 });
    expect(rewardRisk(10, 12, 6)).toEqual({ risk: 2, reward: 4, rewardRisk: 2 });
  });

  it("leaves rewardRisk null when risk is zero", () => {
    expect(rewardRisk(10, 10, 14)).toEqual({ risk: 0, reward: 4, rewardRisk: null });
  });

  it("throws when a price is not finite", () => {
    expect(() => rewardRisk(Number.NaN, 8, 14)).toThrow(TypeError);
    expect(() => rewardRisk(10, Number.POSITIVE_INFINITY, 14)).toThrow(TypeError);
  });
});

describe("resolveOutcome", () => {
  it("marks win when the target is touched first after fill", () => {
    const bars = [bar(0, 10, 9), bar(1, 10.5, 9.5), bar(2, 15, 10)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("win");
  });

  it("marks loss when the stop is touched first after fill", () => {
    const bars = [bar(0, 10, 9), bar(1, 10.5, 9.5), bar(2, 10, 7)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("loss");
  });

  it("marks loss when the same bar covers stop and target", () => {
    const bars = [bar(0, 10, 9), bar(1, 10.5, 9.5), bar(2, 15, 7)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("loss");
  });

  it("marks loss when the fill bar also covers the stop", () => {
    const bars = [bar(0, 10, 9), bar(1, 11, 7)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("loss");
  });

  it("marks unfilled when the stop is hit before entry", () => {
    const bars = [bar(0, 10, 9), bar(1, 9.5, 7), bar(2, 12, 10)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("unfilled");
  });

  it("marks unfilled when entry is never touched", () => {
    const bars = [bar(0, 10, 9), bar(1, 9.8, 9.2), bar(2, 9.7, 9.1)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("unfilled");
  });

  it("marks open when filled but neither stop nor target is touched", () => {
    const bars = [bar(0, 10, 9), bar(1, 10.5, 9.5), bar(2, 11, 10)];
    expect(
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toBe("open");
  });

  it("resolves a down trade the same way", () => {
    const bars = [bar(0, 11, 10), bar(1, 10.5, 9.5), bar(2, 9, 5)];
    expect(
      resolveOutcome(bars, {
        direction: "down",
        entry: 10,
        stop: 12,
        target: 6,
        entryTime: time(0),
      }),
    ).toBe("win");
  });

  it("throws when entryTime is missing from bars", () => {
    const bars = [bar(0, 10, 9)];
    expect(() =>
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(9),
      }),
    ).toThrow(/entryTime is not in bars/);
  });

  it("throws when stop is on the wrong side of entry", () => {
    const bars = [bar(0, 10, 9)];
    expect(() =>
      resolveOutcome(bars, {
        direction: "up",
        entry: 10,
        stop: 11,
        target: 14,
        entryTime: time(0),
      }),
    ).toThrow(TypeError);
    expect(() =>
      resolveOutcome(bars, {
        direction: "down",
        entry: 10,
        stop: 9,
        target: 6,
        entryTime: time(0),
      }),
    ).toThrow(TypeError);
  });

  it("throws when bars is not an array", () => {
    expect(() =>
      resolveOutcome(null as unknown as Bar[], {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toThrow(TypeError);
  });
});

describe("resolveTradeResult maxFavorable", () => {
  it("tracks max favorable excursion on a win", () => {
    const bars = [bar(0, 10, 9), bar(1, 12, 9.5), bar(2, 15, 11)];
    expect(
      resolveTradeResult(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toMatchObject({ outcome: "win", maxFavorable: 5, exitTime: time(2) });
  });

  it("tracks max favorable before a loss", () => {
    const bars = [bar(0, 10, 9), bar(1, 13, 9.5), bar(2, 12, 7)];
    expect(
      resolveTradeResult(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toMatchObject({ outcome: "loss", maxFavorable: 3, exitTime: time(2) });
  });

  it("includes the exit bar when stop and target hit together", () => {
    const bars = [bar(0, 10, 9), bar(1, 10.5, 9.5), bar(2, 15, 7)];
    expect(
      resolveTradeResult(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toMatchObject({ outcome: "loss", maxFavorable: 5, exitTime: time(2) });
  });

  it("leaves maxFavorable at 0 when unfilled", () => {
    const bars = [bar(0, 10, 9), bar(1, 9.5, 7)];
    expect(
      resolveTradeResult(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toEqual({ outcome: "unfilled", maxFavorable: 0 });
  });

  it("tracks open trades through the end of the series", () => {
    const bars = [bar(0, 10, 9), bar(1, 11, 9.5), bar(2, 12.5, 10)];
    expect(
      resolveTradeResult(bars, {
        direction: "up",
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
      }),
    ).toMatchObject({ outcome: "open", maxFavorable: 2.5, exitTime: time(2) });
  });
});

describe("settleSetup maxRewardRisk", () => {
  it("stores maxRewardRisk as maxFavorable / risk on a filled trade", () => {
    const bars = [bar(0, 10, 9), bar(1, 12, 9.5), bar(2, 15, 11)];
    const report = measureReport("measureSecondEntry", bars, [
      {
        basis: "high1",
        direction: "up",
        signalTime: time(0),
        signalPrice: 10,
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
        range: { start: time(0) },
      },
    ]);
    expect(report.trades[0]).toMatchObject({
      outcome: "win",
      risk: 2,
      maxRewardRisk: 2.5,
    });
  });

  it("leaves maxRewardRisk null when unfilled", () => {
    const bars = [bar(0, 10, 9), bar(1, 9.5, 7)];
    const report = measureReport("measureSecondEntry", bars, [
      {
        basis: "high1",
        direction: "up",
        signalTime: time(0),
        signalPrice: 10,
        entry: 10,
        stop: 8,
        target: 14,
        entryTime: time(0),
        range: { start: time(0) },
      },
    ]);
    expect(report.trades[0]).toMatchObject({
      outcome: "unfilled",
      maxRewardRisk: null,
    });
  });
});

describe("summarizeTrades", () => {
  it("keeps byBasis win rates independent", () => {
    const trades: SetupTrade[] = [
      trade({ basis: "high2", outcome: "win", rewardRisk: 2 }),
      trade({ basis: "high2", outcome: "loss", rewardRisk: 1 }),
      trade({ basis: "failed_breakout", outcome: "win", rewardRisk: 3 }),
      trade({ basis: "failed_breakout", outcome: "win", rewardRisk: 1 }),
      trade({ basis: "failed_breakout", outcome: "open", rewardRisk: 2 }),
      trade({ basis: "high2", outcome: "unfilled", rewardRisk: null }),
    ];
    const { stats, byBasis } = summarizeTrades(trades);
    expect(stats).toEqual({
      count: 6,
      filled: 5,
      wins: 3,
      losses: 1,
      open: 1,
      unfilled: 1,
      winRate: 0.75,
      avgRewardRisk: 1.75,
    });
    expect(byBasis.high2).toEqual({
      count: 3,
      filled: 2,
      wins: 1,
      losses: 1,
      open: 0,
      unfilled: 1,
      winRate: 0.5,
      avgRewardRisk: 1.5,
    });
    expect(byBasis.failed_breakout).toEqual({
      count: 3,
      filled: 3,
      wins: 2,
      losses: 0,
      open: 1,
      unfilled: 0,
      winRate: 1,
      avgRewardRisk: 2,
    });
  });

  it("leaves winRate null when there are no decided trades", () => {
    const { stats } = summarizeTrades([
      trade({ basis: "a", outcome: "open" }),
      trade({ basis: "a", outcome: "unfilled", rewardRisk: null }),
    ]);
    expect(stats.winRate).toBeNull();
    expect(stats.avgRewardRisk).toBeNull();
  });

  it("keeps an unordered target out of the win-rate stats", () => {
    const report = measureReport("measureSecondEntry", [bar(0, 12, 8), bar(1, 12, 8)], [
      {
        basis: "high1",
        direction: "up",
        signalTime: time(0),
        signalPrice: 11,
        entry: 12,
        stop: 9,
        target: 10,
        entryTime: time(0),
        range: { start: time(0) },
      },
    ]);
    expect(report.trades).toEqual([]);
    expect(report.invalid).toEqual([
      {
        basis: "high1",
        direction: "up",
        signalTime: time(0),
        signalPrice: 11,
        entry: 12,
        stop: 9,
        target: 10,
        range: { start: time(0) },
      },
    ]);
    expect(report.stats.count).toBe(0);
    expect(report.stats.winRate).toBeNull();
  });
});
