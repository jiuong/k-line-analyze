import type { Bar } from "../types/bars.js";

export type EntryCountLabel =
  | "high1"
  | "high2"
  | "high3"
  | "low1"
  | "low2"
  | "low3";

/** One adjacent-bar high or low entry mark (K2 relative to K1). */
export type AdjacentEntry = {
  label: EntryCountLabel;
  /** Index of K2 (the marked bar). */
  breakIndex: number;
  /** Index of K1 (the reference bar). */
  priorIndex: number;
  /** True for high entry, false for low entry. */
  bull: boolean;
  /** Trigger price: K1.high + tick (high) or K1.low - tick (low). */
  entryPrice: number;
};

const HIGH_NAMES = ["high1", "high2", "high3"] as const;
const LOW_NAMES = ["low1", "low2", "low3"] as const;
const MAX_ENTRIES = 3;

/**
 * Adjacent-bar high/low entry marks on the full series.
 * High: K2.high >= K1.high + tick → mark on K2 at K1.high + tick.
 * Low: K2.low <= K1.low - tick → mark on K2 at K1.low - tick.
 * The same K2 may emit both. Each side caps at 3 labels (H1–H3 / L1–L3).
 * Omitted `tickSize` uses 0.
 */
export function countAdjacentEntries(
  bars: readonly Bar[],
  tickSize?: number,
): AdjacentEntry[] {
  if (!Array.isArray(bars)) {
    throw new TypeError("countAdjacentEntries: bars must be an array");
  }
  const tick = resolveTick(tickSize);
  const found: AdjacentEntry[] = [];
  let highCount = 0;
  let lowCount = 0;

  for (let index = 0; index < bars.length - 1; index += 1) {
    const prior = bars[index]!;
    const broke = bars[index + 1]!;
    assertBar(prior, "countAdjacentEntries");
    assertBar(broke, "countAdjacentEntries");

    if (highCount < MAX_ENTRIES && broke.high >= prior.high + tick) {
      found.push({
        label: HIGH_NAMES[highCount]!,
        breakIndex: index + 1,
        priorIndex: index,
        bull: true,
        entryPrice: prior.high + tick,
      });
      highCount += 1;
    }
    if (lowCount < MAX_ENTRIES && broke.low <= prior.low - tick) {
      found.push({
        label: LOW_NAMES[lowCount]!,
        breakIndex: index + 1,
        priorIndex: index,
        bull: false,
        entryPrice: prior.low - tick,
      });
      lowCount += 1;
    }
  }
  return found;
}

/** Map semantic entry labels to overlay LevelNames. */
export function entryLevelName(
  label: EntryCountLabel,
): "H1" | "H2" | "H3" | "L1" | "L2" | "L3" {
  switch (label) {
    case "high1":
      return "H1";
    case "high2":
      return "H2";
    case "high3":
      return "H3";
    case "low1":
      return "L1";
    case "low2":
      return "L2";
    case "low3":
      return "L3";
  }
}

function resolveTick(tickSize: number | undefined): number {
  if (tickSize === undefined) return 0;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError("countAdjacentEntries: tickSize must be a finite number > 0");
  }
  return tickSize;
}

function assertBar(bar: Bar, name: string): void {
  if (
    !Number.isFinite(bar.high) ||
    !Number.isFinite(bar.low) ||
    !Number.isFinite(bar.open) ||
    !Number.isFinite(bar.close)
  ) {
    throw new TypeError(`${name}: bar prices must be finite`);
  }
  if (bar.high < bar.low) {
    throw new TypeError(`${name}: bar high must be >= low`);
  }
}
