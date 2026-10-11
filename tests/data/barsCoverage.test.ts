import { describe, expect, it } from "vitest";
import { barsCoverQuery } from "../../src/data/barsCoverage.js";
import type { Bar, FetchBarsParams } from "../../src/types/bars.js";

function bar(time: number): Bar {
  return { time, open: 1, high: 1, low: 1, close: 1 };
}

describe("barsCoverQuery", () => {
  it("returns false for empty bars in range mode", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 200,
    };
    expect(barsCoverQuery([], params)).toBe(false);
  });

  it("range: exact endpoint match covers", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 300,
    };
    expect(barsCoverQuery([bar(100), bar(200), bar(300)], params)).toBe(true);
  });

  it("range: missing start fails", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 300,
    };
    expect(barsCoverQuery([bar(150), bar(300)], params)).toBe(false);
  });

  it("range: missing end fails", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 300,
    };
    expect(barsCoverQuery([bar(100), bar(250)], params)).toBe(false);
  });

  it("range: omit to only checks from", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
    };
    expect(barsCoverQuery([bar(100), bar(150)], params)).toBe(true);
    expect(barsCoverQuery([bar(120)], params)).toBe(false);
  });

  it("range: unsorted bars still evaluated by endpoints", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 300,
    };
    expect(barsCoverQuery([bar(300), bar(100)], params)).toBe(true);
  });

  it("count: requires length >= count", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      count: 3,
    };
    expect(barsCoverQuery([bar(1), bar(2)], params)).toBe(false);
    expect(barsCoverQuery([bar(1), bar(2), bar(3)], params)).toBe(true);
  });

  it("count takes precedence over range fields", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 1,
      to: 99,
      count: 2,
    };
    expect(barsCoverQuery([bar(50)], params)).toBe(false);
    expect(barsCoverQuery([bar(50), bar(60)], params)).toBe(true);
  });

  it("range without from is not coverable", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      to: 200,
    };
    expect(barsCoverQuery([bar(100), bar(200)], params)).toBe(false);
  });
});
