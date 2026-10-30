import { describe, expect, it } from "vitest";
import {
  entryBeyond,
  setupInOrder,
  stopBeyond,
  targetFrom,
} from "../../src/utils/setupPrices.js";

describe("setupPrices", () => {
  it("places entry one tick beyond the extreme", () => {
    expect(entryBeyond(10, "up", 0.25)).toBe(10.25);
    expect(entryBeyond(10, "down", 0.25)).toBe(9.75);
  });

  it("leaves entry on the extreme when tickSize is omitted", () => {
    expect(entryBeyond(10, "up")).toBe(10);
    expect(entryBeyond(10, "down")).toBe(10);
  });

  it("places the stop against the trade on both sides", () => {
    expect(stopBeyond(8, "up", 0.25)).toBe(7.75);
    expect(stopBeyond(12, "down", 0.25)).toBe(12.25);
  });

  it("leaves the stop on the extreme when tickSize is omitted", () => {
    expect(stopBeyond(8, "up")).toBe(8);
    expect(stopBeyond(12, "down")).toBe(12);
  });

  it("throws when tickSize is not a finite number > 0", () => {
    expect(() => entryBeyond(10, "up", 0)).toThrow(TypeError);
    expect(() => stopBeyond(10, "down", -0.1)).toThrow(TypeError);
    expect(() => entryBeyond(10, "up", Number.NaN)).toThrow(TypeError);
    expect(() => stopBeyond(10, "up", Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("throws when the price or direction is invalid", () => {
    expect(() => entryBeyond(Number.NaN, "up", 0.1)).toThrow(TypeError);
    expect(() => stopBeyond(10, "bull" as "up")).toThrow(TypeError);
    expect(() => targetFrom(Number.NaN)).toThrow(TypeError);
  });

  it("requires stop, entry, and target in trade order", () => {
    expect(setupInOrder("up", 10, 8, 14)).toBe(true);
    expect(setupInOrder("down", 10, 12, 6)).toBe(true);
    expect(setupInOrder("up", 10, 8, 10)).toBe(false);
    expect(setupInOrder("up", 10, 11, 14)).toBe(false);
    expect(setupInOrder("down", 10, 9, 6)).toBe(false);
    expect(setupInOrder("down", 10, 12, 10)).toBe(false);
  });

  it("forwards a measured projection or the opposite edge", () => {
    expect(targetFrom(24)).toBe(24);
    expect(targetFrom(0)).toBe(0);
  });
});
