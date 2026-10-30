import { describe, expect, it } from "vitest";
import { setupTradeRows } from "../../src/page/setupTradesTable.js";
import type { SetupReport } from "../../src/utils/setupMeasure.js";

describe("setupTradeRows", () => {
  it("lists trades then Fail rows for each report", () => {
    const report: SetupReport = {
      functionId: "measureSecondEntry",
      trades: [
        {
          basis: "high1",
          direction: "up",
          signalTime: "2024-01-01T00:00:00Z",
          signalPrice: 10,
          entry: 10,
          stop: 8,
          target: 14,
          risk: 2,
          reward: 4,
          rewardRisk: 2,
          maxRewardRisk: 1.5,
          outcome: "loss",
          range: { start: "2024-01-01T00:00:00Z", end: "2024-01-01T01:00:00Z" },
        },
      ],
      invalid: [
        {
          basis: "high2",
          direction: "up",
          signalTime: "2024-01-01T02:00:00Z",
          signalPrice: 11,
          entry: 12,
          stop: 9,
          target: 10,
          range: { start: "2024-01-01T02:00:00Z" },
        },
      ],
      stats: {
        count: 1,
        filled: 1,
        wins: 0,
        losses: 1,
        open: 0,
        unfilled: 0,
        winRate: 0,
        avgRewardRisk: 2,
      },
      byBasis: {},
    };

    expect(setupTradeRows([report])).toEqual([
      {
        measure: "measureSecondEntry",
        basis: "high1",
        range: "2024-01-01T00:00:00Z – 2024-01-01T01:00:00Z",
        entry: 10,
        stop: 8,
        target: 14,
        status: "loss",
        planRr: 2,
        maxRr: 1.5,
      },
      {
        measure: "measureSecondEntry",
        basis: "high2",
        range: "2024-01-01T02:00:00Z",
        entry: 12,
        stop: 9,
        target: 10,
        status: "Fail",
        planRr: null,
        maxRr: null,
      },
    ]);
  });
});
