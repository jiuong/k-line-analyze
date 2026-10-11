import { describe, expect, it } from "vitest";
import { datetimeLocalToUnix } from "../../src/page/queryTime.js";

describe("datetimeLocalToUnix", () => {
  it("converts a local calendar value to unix seconds", () => {
    const expected = Math.floor(
      new Date(2024, 0, 1, 8, 30, 0).getTime() / 1000,
    );
    expect(datetimeLocalToUnix("2024-01-01T08:30")).toBe(expected);
  });

  it("omits an empty value", () => {
    expect(datetimeLocalToUnix("  ")).toBeUndefined();
  });

  it("rejects a free-form string", () => {
    expect(() => datetimeLocalToUnix("1704067200")).toThrow(/Invalid local time/);
  });
});
