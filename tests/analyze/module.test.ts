import { describe, expect, it } from "vitest";
import type { AnalyzerFn } from "../../src/analyze/index.js";
import { fillSummary } from "../../src/utils/summary.js";

describe("analyze module scaffold", () => {
  it("exports AnalyzerFn compatible with AnalysisResult", () => {
    const stub: AnalyzerFn = (bars) => ({
      functionId: "stub",
      results: [
        {
          name: "unclear",
          range: {
            start: "2024-01-01T00:00:00Z",
            end: bars[0] ? "2024-01-01T00:00:00Z" : undefined,
          },
          levels: [],
        },
      ],
      summary: fillSummary("structure={label}", { label: "unclear" }),
      confidence: 1,
      evidence: {},
    });

    const result = stub([]);
    expect(result.functionId).toBe("stub");
    expect(result.results[0]?.name).toBe("unclear");
    expect(result.confidence).toBe(1);
  });

  it("does not pull in chart package from analyze entry", async () => {
    const mod = await import("../../src/analyze/index.js");
    const src = JSON.stringify(Object.keys(mod));
    expect(src).not.toMatch(/kline-chart|trading-playback/);
  });
});
