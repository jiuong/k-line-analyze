import { describe, expect, it } from "vitest";
import type {
  AnalysisLabel,
  AnalysisResult,
  Level,
  LevelName,
} from "../../src/types/analysis.js";

describe("AnalysisResult contract", () => {
  it("accepts a minimal result without symbol/timeframe", () => {
    const levelName: LevelName = "H1";
    const levels: Level[] = [
      { name: levelName, price: 1.1, time: "2024-01-01T00:00:00Z" },
    ];
    const name: AnalysisLabel = "unclear";
    const result: AnalysisResult<{ note: string }> = {
      functionId: "exampleFn",
      results: [
        {
          name,
          range: { start: "2024-01-01T00:00:00Z" },
          levels,
        },
      ],
      summary: "structure=unclear",
      confidence: 1,
      evidence: { note: "scaffold" },
    };

    expect(result.confidence).toBe(1);
    expect(result.results[0]?.name).toBe("unclear");
    expect(result).not.toHaveProperty("symbol");
    expect(result).not.toHaveProperty("timeframe");
    expect(result).not.toHaveProperty("label");
    expect(result).not.toHaveProperty("range");
    expect(result).not.toHaveProperty("levels");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
