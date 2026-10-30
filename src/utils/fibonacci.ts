import type { Bar } from "../types/bars.js";

/** Default Fibonacci retracement ratios in [0, 1], including the anchors. */
export const DEFAULT_FIB_RETRACEMENT_RATIOS = [
  0, 0.236, 0.382, 0.5, 0.618, 0.786, 1,
] as const;

export type FibRetracementDirection = "high_to_low" | "low_to_high";

export type FibRetracementLevel = {
  ratio: number;
  pct: number;
  price: number;
};

export type FibExtreme = {
  price: number;
  index: number;
};

export type FibRetracementResult = {
  direction: FibRetracementDirection;
  high: FibExtreme;
  low: FibExtreme;
  range: number;
  levels: FibRetracementLevel[];
};

export type FibRetracementFromBarsOptions = {
  ratios?: readonly number[];
};

/**
 * Project retracement prices from the later extreme toward the earlier extreme.
 * `price(r) = later + r * (earlier − later)`. Does not read bars.
 */
export function projectFibRetracement(
  later: number,
  earlier: number,
  ratios: readonly number[] = DEFAULT_FIB_RETRACEMENT_RATIOS,
): FibRetracementLevel[] {
  if (!Number.isFinite(later)) {
    throw new TypeError("projectFibRetracement: later must be finite");
  }
  if (!Number.isFinite(earlier)) {
    throw new TypeError("projectFibRetracement: earlier must be finite");
  }
  if (!Array.isArray(ratios)) {
    throw new TypeError("projectFibRetracement: ratios must be an array");
  }
  return ratios.map((ratio) => {
    if (!Number.isFinite(ratio)) {
      throw new TypeError("projectFibRetracement: each ratio must be finite");
    }
    return {
      ratio,
      pct: ratio * 100,
      price: later + ratio * (earlier - later),
    };
  });
}

/**
 * Window high/low extremes → Fibonacci retracement prices.
 * Direction follows which extreme appears first in time.
 * Same-bar extremes or a zero range returns `null`.
 */
export function fibRetracementFromBars(
  bars: readonly Bar[],
  options?: FibRetracementFromBarsOptions,
): FibRetracementResult | null {
  if (!Array.isArray(bars)) {
    throw new TypeError("fibRetracementFromBars: bars must be an array");
  }
  if (bars.length === 0) {
    throw new TypeError("fibRetracementFromBars: bars must not be empty");
  }
  if (options !== undefined && (options === null || typeof options !== "object")) {
    throw new TypeError("fibRetracementFromBars: options must be a plain object");
  }
  const ratios =
    options !== undefined && "ratios" in options
      ? options.ratios
      : DEFAULT_FIB_RETRACEMENT_RATIOS;
  if (!Array.isArray(ratios)) {
    throw new TypeError("fibRetracementFromBars: ratios must be an array");
  }

  let highPrice = Number.NEGATIVE_INFINITY;
  let highIndex = -1;
  let lowPrice = Number.POSITIVE_INFINITY;
  let lowIndex = -1;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const { high, low } = bar;
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      throw new TypeError("fibRetracementFromBars: bar high and low must be finite");
    }
    if (high < low) {
      throw new TypeError("fibRetracementFromBars: bar high must be >= low");
    }
    if (high > highPrice) {
      highPrice = high;
      highIndex = i;
    }
    if (low < lowPrice) {
      lowPrice = low;
      lowIndex = i;
    }
  }

  const range = highPrice - lowPrice;
  if (highIndex === lowIndex || range === 0) {
    return null;
  }

  const high: FibExtreme = { price: highPrice, index: highIndex };
  const low: FibExtreme = { price: lowPrice, index: lowIndex };

  if (lowIndex < highIndex) {
    return {
      direction: "high_to_low",
      high,
      low,
      range,
      levels: projectFibRetracement(highPrice, lowPrice, ratios),
    };
  }

  return {
    direction: "low_to_high",
    high,
    low,
    range,
    levels: projectFibRetracement(lowPrice, highPrice, ratios),
  };
}

/** Default Fibonacci extension ratios, including levels above 1. */
export const DEFAULT_FIB_EXTENSION_RATIOS = [
  0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236,
] as const;

export type FibExtensionDirection = "up" | "down";

export type FibExtensionLevel = FibRetracementLevel;

export type FibExtensionResult = {
  v1: FibExtreme;
  v2: FibExtreme;
  v3: FibExtreme;
  direction: FibExtensionDirection;
  range: number;
  levels: FibExtensionLevel[];
};

export type FibExtensionFromBarsOptions = {
  ratios?: readonly number[];
};

/**
 * Project Fibonacci extension prices from three anchors.
 * `price(r) = v3 + r * (v2 − v1)`. Does not read bars.
 */
export function projectFibExtension(
  v1: number,
  v2: number,
  v3: number,
  ratios: readonly number[] = DEFAULT_FIB_EXTENSION_RATIOS,
): FibExtensionLevel[] {
  if (!Number.isFinite(v1)) {
    throw new TypeError("projectFibExtension: v1 must be finite");
  }
  if (!Number.isFinite(v2)) {
    throw new TypeError("projectFibExtension: v2 must be finite");
  }
  if (!Number.isFinite(v3)) {
    throw new TypeError("projectFibExtension: v3 must be finite");
  }
  if (!Array.isArray(ratios)) {
    throw new TypeError("projectFibExtension: ratios must be an array");
  }
  const delta = v2 - v1;
  return ratios.map((ratio) => {
    if (!Number.isFinite(ratio)) {
      throw new TypeError("projectFibExtension: each ratio must be finite");
    }
    return {
      ratio,
      pct: ratio * 100,
      price: v3 + ratio * delta,
    };
  });
}

/**
 * Window high/low as V1/V2 (time order), then opposite extreme after V2 as V3.
 * Independent of retracement helpers. Missing V3 / same-bar / zero range → `null`.
 */
export function fibExtensionFromBars(
  bars: readonly Bar[],
  options?: FibExtensionFromBarsOptions,
): FibExtensionResult | null {
  if (!Array.isArray(bars)) {
    throw new TypeError("fibExtensionFromBars: bars must be an array");
  }
  if (bars.length === 0) {
    throw new TypeError("fibExtensionFromBars: bars must not be empty");
  }
  if (options !== undefined && (options === null || typeof options !== "object")) {
    throw new TypeError("fibExtensionFromBars: options must be a plain object");
  }
  const ratios =
    options !== undefined && "ratios" in options
      ? options.ratios
      : DEFAULT_FIB_EXTENSION_RATIOS;
  if (!Array.isArray(ratios)) {
    throw new TypeError("fibExtensionFromBars: ratios must be an array");
  }

  let highPrice = Number.NEGATIVE_INFINITY;
  let highIndex = -1;
  let lowPrice = Number.POSITIVE_INFINITY;
  let lowIndex = -1;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const { high, low } = bar;
    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      throw new TypeError("fibExtensionFromBars: bar high and low must be finite");
    }
    if (high < low) {
      throw new TypeError("fibExtensionFromBars: bar high must be >= low");
    }
    if (high > highPrice) {
      highPrice = high;
      highIndex = i;
    }
    if (low < lowPrice) {
      lowPrice = low;
      lowIndex = i;
    }
  }

  const span = highPrice - lowPrice;
  if (highIndex === lowIndex || span === 0) {
    return null;
  }

  const highIsLater = highIndex > lowIndex;
  const v1: FibExtreme = highIsLater
    ? { price: lowPrice, index: lowIndex }
    : { price: highPrice, index: highIndex };
  const v2: FibExtreme = highIsLater
    ? { price: highPrice, index: highIndex }
    : { price: lowPrice, index: lowIndex };
  const direction: FibExtensionDirection = highIsLater ? "up" : "down";

  if (v2.index >= bars.length - 1) {
    return null;
  }

  let v3Price = highIsLater ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  let v3Index = -1;
  for (let i = v2.index + 1; i < bars.length; i++) {
    const bar = bars[i]!;
    if (highIsLater) {
      if (bar.low < v3Price) {
        v3Price = bar.low;
        v3Index = i;
      }
    } else if (bar.high > v3Price) {
      v3Price = bar.high;
      v3Index = i;
    }
  }
  if (v3Index < 0) {
    return null;
  }

  const v3: FibExtreme = { price: v3Price, index: v3Index };
  return {
    v1,
    v2,
    v3,
    direction,
    range: Math.abs(v2.price - v1.price),
    levels: projectFibExtension(v1.price, v2.price, v3.price, ratios),
  };
}
