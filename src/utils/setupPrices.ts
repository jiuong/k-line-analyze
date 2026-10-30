export type SetupDirection = "up" | "down";

function assertPrice(price: number, name: string): void {
  if (!Number.isFinite(price)) {
    throw new TypeError(`${name}: price must be finite`);
  }
}

function assertDirection(direction: SetupDirection, name: string): void {
  if (direction !== "up" && direction !== "down") {
    throw new TypeError(`${name}: direction must be up or down`);
  }
}

/** Omitted tick leaves the extreme unchanged. Present tick must be finite and `> 0`. */
function resolveTick(tickSize: number | undefined, name: string): number {
  if (tickSize === undefined) return 0;
  if (!Number.isFinite(tickSize) || tickSize <= 0) {
    throw new TypeError(`${name}: tickSize must be a finite number > 0`);
  }
  return tickSize;
}

/** Entry one tick beyond the extreme in the trade direction. */
export function entryBeyond(
  extreme: number,
  direction: SetupDirection,
  tickSize?: number,
): number {
  assertPrice(extreme, "entryBeyond");
  assertDirection(direction, "entryBeyond");
  const tick = resolveTick(tickSize, "entryBeyond");
  return direction === "up" ? extreme + tick : extreme - tick;
}

/** Stop one tick beyond the protective extreme, against the trade. */
export function stopBeyond(
  extreme: number,
  direction: SetupDirection,
  tickSize?: number,
): number {
  assertPrice(extreme, "stopBeyond");
  assertDirection(direction, "stopBeyond");
  const tick = resolveTick(tickSize, "stopBeyond");
  return direction === "up" ? extreme - tick : extreme + tick;
}

/** Forwards a measured-move projection or the opposite range edge. */
export function targetFrom(price: number): number {
  assertPrice(price, "targetFrom");
  return price;
}

/**
 * Long: stop below entry below target. Short: the reverse.
 * Equal prices are not in order.
 */
export function setupInOrder(
  direction: SetupDirection,
  entry: number,
  stop: number,
  target: number,
): boolean {
  assertDirection(direction, "setupInOrder");
  assertPrice(entry, "setupInOrder");
  assertPrice(stop, "setupInOrder");
  assertPrice(target, "setupInOrder");
  if (direction === "up") return stop < entry && entry < target;
  return stop > entry && entry > target;
}
