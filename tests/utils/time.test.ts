import { describe, expect, it } from "vitest";
import {
  toEast8TimeString,
  toTimeString,
  toUnixSeconds,
} from "../../src/utils/time.js";

describe("toUnixSeconds", () => {
  it("accepts numeric unix seconds", () => {
    expect(toUnixSeconds(1704067200)).toBe(1704067200);
  });

  it("accepts digit strings", () => {
    expect(toUnixSeconds("1704067200")).toBe(1704067200);
  });

  it("accepts ISO-8601 UTC", () => {
    expect(toUnixSeconds("2024-01-01T00:00:00Z")).toBe(1704067200);
  });

  it("rejects garbage", () => {
    expect(() => toUnixSeconds("not-a-time")).toThrow(/Invalid time/);
  });
});

describe("toTimeString", () => {
  it("formats unix seconds as ISO UTC", () => {
    expect(toTimeString(1704067200)).toBe("2024-01-01T00:00:00Z");
  });
});

describe("toEast8TimeString", () => {
  it("shifts unix seconds to +08:00 wall time", () => {
    expect(toEast8TimeString(1704067200)).toBe("2024-01-01T08:00:00+08:00");
  });

  it("accepts a UTC TimeString and does not emit Z", () => {
    expect(toEast8TimeString("2024-01-01T00:00:00Z")).toBe(
      "2024-01-01T08:00:00+08:00",
    );
    expect(toEast8TimeString("2024-01-01T00:00:00Z")).not.toBe(
      toTimeString(1704067200),
    );
  });

  it("rejects garbage", () => {
    expect(() => toEast8TimeString("not-a-time")).toThrow(/Invalid time/);
  });
});
