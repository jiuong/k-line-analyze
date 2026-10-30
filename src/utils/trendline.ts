import type { Bar } from "../types/bars.js";
import type { SwingLeg, SwingLegDirection } from "./swingLegs.js";

/** One touch of a rail. `index` is the bar index of that swing. */
export type RailPoint = {
  index: number;
  price: number;
};

/**
 * One channel from two consecutive same-direction legs.
 * Touches are in time order. No labels.
 */
export type FittedChannel = {
  direction: SwingLegDirection;
  high1: RailPoint;
  high2: RailPoint;
  low1: RailPoint;
  low2: RailPoint;
};

export type RailSide = "high" | "low";

/** A rail already fixed by two touches. `high` is the upper rail. */
export type Rail = {
  side: RailSide;
  first: RailPoint;
  second: RailPoint;
};

/**
 * Fit channels from swing-leg endpoints. Adjacent legs of one direction
 * are one redraw: the prior pair stays, and the next pair is the new channel.
 * Both rails must slope with the legs. Fewer than four touches returns `[]`.
 */
export function channelFromLegs(legs: readonly SwingLeg[]): FittedChannel[] {
  if (!Array.isArray(legs)) {
    throw new TypeError("channelFromLegs: legs must be an array");
  }
  let previousStart = -1;
  for (const leg of legs) {
    assertLeg(leg);
    if (leg.startIndex < previousStart) {
      throw new TypeError("channelFromLegs: legs must be in time order");
    }
    previousStart = leg.startIndex;
  }
  const channels = [
    ...pairChannels(legs, "bull"),
    ...pairChannels(legs, "bear"),
  ];
  channels.sort((a, b) => channelStart(a) - channelStart(b));
  return channels;
}

/** Line value at `index`. The two touches may be extended; they are not invented. */
export function railPriceAt(index: number, first: RailPoint, second: RailPoint): number {
  assertPoint(first, "railPriceAt");
  assertPoint(second, "railPriceAt");
  assertIndex(index, "railPriceAt: index");
  if (first.index === second.index) {
    throw new TypeError("railPriceAt: rail points must have different indexes");
  }
  const span = second.index - first.index;
  return first.price + ((second.price - first.price) * (index - first.index)) / span;
}

/**
 * True when the close is outside the rail. A wick is ignored.
 * `high`: close above the line. `low`: close below the line. A touch is false.
 */
export function closesBeyond(bar: Bar, index: number, rail: Rail): boolean {
  if (bar === null || typeof bar !== "object" || !Number.isFinite(bar.close)) {
    throw new TypeError("closesBeyond: close must be finite");
  }
  if (rail === null || typeof rail !== "object" || (rail.side !== "high" && rail.side !== "low")) {
    throw new TypeError("closesBeyond: rail side must be high or low");
  }
  const line = railPriceAt(index, rail.first, rail.second);
  return rail.side === "high" ? bar.close > line : bar.close < line;
}

function pairChannels(
  legs: readonly SwingLeg[],
  direction: SwingLegDirection,
): FittedChannel[] {
  const same = legs.filter((leg) => leg.direction === direction);
  const channels: FittedChannel[] = [];
  for (let i = 0; i < same.length - 1; i++) {
    const channel = toChannel(same[i]!, same[i + 1]!, direction);
    if (channel) channels.push(channel);
  }
  return channels;
}

function toChannel(
  earlier: SwingLeg,
  later: SwingLeg,
  direction: SwingLegDirection,
): FittedChannel | null {
  if (later.startIndex <= earlier.endIndex) return null;
  const channel =
    direction === "bull" ? bullChannel(earlier, later) : bearChannel(earlier, later);
  const sloped =
    direction === "bull"
      ? channel.high2.price > channel.high1.price && channel.low2.price > channel.low1.price
      : channel.high2.price < channel.high1.price && channel.low2.price < channel.low1.price;
  return sloped ? channel : null;
}

function bullChannel(earlier: SwingLeg, later: SwingLeg): FittedChannel {
  return {
    direction: "bull",
    low1: point(earlier.startIndex, earlier.startPrice),
    high1: point(earlier.endIndex, earlier.endPrice),
    low2: point(later.startIndex, later.startPrice),
    high2: point(later.endIndex, later.endPrice),
  };
}

function bearChannel(earlier: SwingLeg, later: SwingLeg): FittedChannel {
  return {
    direction: "bear",
    high1: point(earlier.startIndex, earlier.startPrice),
    low1: point(earlier.endIndex, earlier.endPrice),
    high2: point(later.startIndex, later.startPrice),
    low2: point(later.endIndex, later.endPrice),
  };
}

function channelStart(channel: FittedChannel): number {
  return Math.min(channel.high1.index, channel.low1.index);
}

function point(index: number, price: number): RailPoint {
  return { index, price };
}

function assertLeg(leg: SwingLeg): void {
  if (leg === null || typeof leg !== "object") {
    throw new TypeError("channelFromLegs: leg must be an object");
  }
  if (leg.direction !== "bull" && leg.direction !== "bear") {
    throw new TypeError("channelFromLegs: leg direction must be bull or bear");
  }
  if (
    !Number.isInteger(leg.startIndex) ||
    !Number.isInteger(leg.endIndex) ||
    leg.startIndex < 0 ||
    leg.endIndex <= leg.startIndex
  ) {
    throw new TypeError(
      "channelFromLegs: leg indexes must be integers with endIndex > startIndex",
    );
  }
  if (!Number.isFinite(leg.startPrice) || !Number.isFinite(leg.endPrice)) {
    throw new TypeError("channelFromLegs: leg prices must be finite");
  }
}

function assertPoint(touch: RailPoint, name: string): void {
  if (touch === null || typeof touch !== "object") {
    throw new TypeError(`${name}: rail point must be an object`);
  }
  assertIndex(touch.index, `${name}: index`);
  if (!Number.isFinite(touch.price)) {
    throw new TypeError(`${name}: price must be finite`);
  }
}

function assertIndex(index: number, label: string): void {
  if (!Number.isInteger(index) || index < 0) {
    throw new TypeError(`${label} must be an integer >= 0`);
  }
}
