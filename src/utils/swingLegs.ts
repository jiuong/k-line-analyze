import type { Bar } from "../types/bars.js";
import { findSwings, type Swing } from "./swings.js";

export type SwingLegDirection = "bull" | "bear";

/** One leg between two consecutive opposite swings. */
export type SwingLeg = {
  direction: SwingLegDirection;
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
};

/**
 * Pair consecutive `findSwings` pivots into low→high or high→low legs.
 * Same-direction legs stay separate. A high and a low on the same bar are not a leg.
 * `swingSpan` is forwarded unchanged.
 */
export function findSwingLegs(bars: readonly Bar[], swingSpan = 2): SwingLeg[] {
  if (!Array.isArray(bars)) {
    throw new TypeError("findSwingLegs: bars must be an array");
  }
  const swings = findSwings(bars, swingSpan);
  const legs: SwingLeg[] = [];
  for (let i = 0; i < swings.length - 1; i++) {
    const start = swings[i]!;
    const end = swings[i + 1]!;
    if (start.kind === end.kind || start.index === end.index) continue;
    legs.push(toLeg(start, end));
  }
  return legs;
}

function toLeg(start: Swing, end: Swing): SwingLeg {
  const bull = start.kind === "low";
  return {
    direction: bull ? "bull" : "bear",
    startIndex: start.index,
    endIndex: end.index,
    startPrice: start.price,
    endPrice: end.price,
  };
}
