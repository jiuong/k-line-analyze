export type MeasuredMoveDirection = "up" | "down";

/** Project `magnitude` from `anchor`. Does not choose a leg or read bars. */
export function projectMeasuredMove(
  anchor: number,
  magnitude: number,
  direction: MeasuredMoveDirection,
): number {
  if (!Number.isFinite(anchor)) {
    throw new TypeError("projectMeasuredMove: anchor must be finite");
  }
  if (!Number.isFinite(magnitude) || magnitude < 0) {
    throw new TypeError("projectMeasuredMove: magnitude must be a finite number >= 0");
  }
  if (direction !== "up" && direction !== "down") {
    throw new TypeError("projectMeasuredMove: direction must be up or down");
  }
  return direction === "up" ? anchor + magnitude : anchor - magnitude;
}
