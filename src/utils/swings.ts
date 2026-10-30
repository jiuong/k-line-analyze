import type { Bar } from "../types/bars.js";

export type SwingKind = "high" | "low";

/** One confirmed pivot. `price` is the bar high or the bar low. */
export type Swing = {
  kind: SwingKind;
  index: number;
  price: number;
};

/**
 * Swing highs and lows. A high is strictly above the `span` bars on its left
 * and at or above the `span` bars on its right. A low is strictly below the
 * left bars and at or below the right bars. Consecutive same-kind swings
 * collapse to the more extreme price; a tie keeps the earlier swing.
 */
export function findSwings(bars: readonly Bar[], span = 2): Swing[] {
  if (!Number.isInteger(span) || span < 1) {
    throw new TypeError("findSwings: span must be an integer >= 1");
  }
  const found: Swing[] = [];
  for (let i = span; i < bars.length - span; i++) {
    const bar = bars[i];
    if (!bar) continue;
    if (isSwingHigh(bars, i, span)) {
      found.push({ kind: "high", index: i, price: bar.high });
    }
    if (isSwingLow(bars, i, span)) {
      found.push({ kind: "low", index: i, price: bar.low });
    }
  }
  return collapseAdjacent(found);
}

function isSwingHigh(bars: readonly Bar[], index: number, span: number): boolean {
  const high = bars[index]!.high;
  for (let j = index - span; j < index; j++) {
    if (high <= bars[j]!.high) return false;
  }
  for (let j = index + 1; j <= index + span; j++) {
    if (high < bars[j]!.high) return false;
  }
  return true;
}

function isSwingLow(bars: readonly Bar[], index: number, span: number): boolean {
  const low = bars[index]!.low;
  for (let j = index - span; j < index; j++) {
    if (low >= bars[j]!.low) return false;
  }
  for (let j = index + 1; j <= index + span; j++) {
    if (low > bars[j]!.low) return false;
  }
  return true;
}

function collapseAdjacent(swings: readonly Swing[]): Swing[] {
  const sorted = [...swings].sort(
    (a, b) => a.index - b.index || kindOrder(a.kind) - kindOrder(b.kind),
  );
  const out: Swing[] = [];
  for (const swing of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === swing.kind) {
      if (isMoreExtreme(swing, prev)) out[out.length - 1] = swing;
      continue;
    }
    out.push(swing);
  }
  return out;
}

function kindOrder(kind: SwingKind): number {
  return kind === "high" ? 0 : 1;
}

function isMoreExtreme(swing: Swing, prev: Swing): boolean {
  return swing.kind === "high" ? swing.price > prev.price : swing.price < prev.price;
}
