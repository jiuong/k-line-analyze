import type { Bar } from "../types/bars.js";

/**
 * Gap up: the compared body starts at the previous high.
 * Gap down: it starts at the previous low.
 * A touch or an overlap is not a gap. The input bar is not mutated.
 */
export function withGapBody(prev: Bar | undefined, bar: Bar): Bar {
  if (prev && bar.low > prev.high) {
    return { ...bar, open: prev.high, low: prev.high };
  }
  if (prev && bar.high < prev.low) {
    return { ...bar, open: prev.low, high: prev.low };
  }
  return bar;
}
