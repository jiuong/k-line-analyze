/**
 * True when the two prices are at most `tolerance` apart.
 * The caller supplies the tolerance. This function has no default ratio.
 */
export function pricesWithin(left: number, right: number, tolerance: number): boolean {
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    throw new TypeError("pricesWithin: prices must be finite");
  }
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError("pricesWithin: tolerance must be a finite number >= 0");
  }
  return Math.abs(left - right) <= tolerance;
}
