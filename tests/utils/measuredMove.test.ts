import { describe, expect, it } from "vitest";
import { projectMeasuredMove } from "../../src/utils/measuredMove.js";

describe("projectMeasuredMove", () => {
  it("projects upward from the anchor", () => {
    expect(projectMeasuredMove(10, 4, "up")).toBe(14);
  });

  it("projects downward from the anchor", () => {
    expect(projectMeasuredMove(10, 4, "down")).toBe(6);
  });

  it("returns the anchor when the magnitude is zero", () => {
    expect(projectMeasuredMove(10, 0, "up")).toBe(10);
    expect(projectMeasuredMove(10, 0, "down")).toBe(10);
  });

  it("throws when the magnitude is not a finite number >= 0", () => {
    expect(() => projectMeasuredMove(10, -1, "up")).toThrow(TypeError);
    expect(() => projectMeasuredMove(10, Number.NaN, "down")).toThrow(TypeError);
    expect(() => projectMeasuredMove(10, Number.POSITIVE_INFINITY, "up")).toThrow(TypeError);
  });

  it("throws when the anchor is not finite", () => {
    expect(() => projectMeasuredMove(Number.NaN, 1, "up")).toThrow(TypeError);
    expect(() => projectMeasuredMove(Number.NEGATIVE_INFINITY, 1, "down")).toThrow(TypeError);
  });

  it("throws when the direction is not up or down", () => {
    expect(() => projectMeasuredMove(10, 1, "bull" as "up")).toThrow(TypeError);
  });
});
