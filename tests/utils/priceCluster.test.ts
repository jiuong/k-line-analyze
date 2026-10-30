import { describe, expect, it } from "vitest";
import { pricesWithin } from "../../src/utils/priceCluster.js";

describe("pricesWithin", () => {
  it("accepts a price inside the tolerance, including the boundary", () => {
    expect(pricesWithin(10, 11, 2)).toBe(true);
    expect(pricesWithin(10, 12, 2)).toBe(true);
  });

  it("accepts equal prices", () => {
    expect(pricesWithin(5, 5, 0)).toBe(true);
    expect(pricesWithin(5, 5, 1)).toBe(true);
  });

  it("rejects a price outside the tolerance", () => {
    expect(pricesWithin(10, 13, 2)).toBe(false);
  });

  it("treats a zero tolerance as exact equality", () => {
    expect(pricesWithin(1, 1, 0)).toBe(true);
    expect(pricesWithin(1, 1.1, 0)).toBe(false);
  });

  it("throws when the tolerance is not a finite number >= 0", () => {
    expect(() => pricesWithin(1, 1, -0.1)).toThrow(TypeError);
    expect(() => pricesWithin(1, 1, Number.NaN)).toThrow(TypeError);
    expect(() => pricesWithin(1, 1, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("throws when a price is not finite", () => {
    expect(() => pricesWithin(Number.NaN, 1, 0)).toThrow(TypeError);
    expect(() => pricesWithin(1, Number.POSITIVE_INFINITY, 0)).toThrow(TypeError);
  });
});
