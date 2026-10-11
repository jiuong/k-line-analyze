import { describe, expect, it } from "vitest";
import { fillSummary } from "../../src/utils/summary.js";

describe("fillSummary", () => {
  it("replaces placeholders from the skill example pattern", () => {
    const out = fillSummary(
      "trends={count}; last={lastName} from={from} to={to}",
      {
        count: 1,
        lastName: "bull_trend",
        from: "2024-01-01T00:00:00Z",
        to: "2024-01-01T01:00:00Z",
      },
    );
    expect(out).toBe(
      "trends=1; last=bull_trend from=2024-01-01T00:00:00Z to=2024-01-01T01:00:00Z",
    );
  });

  it("stringifies numbers", () => {
    expect(fillSummary("n={n}", { n: 42 })).toBe("n=42");
  });

  it("throws when a placeholder key is missing", () => {
    expect(() => fillSummary("a={a} b={b}", { a: "1" })).toThrow(
      /missing placeholder "b"/,
    );
  });

  it("throws when a placeholder value is nullish", () => {
    expect(() => fillSummary("x={x}", { x: null })).toThrow(/null/);
  });
});
