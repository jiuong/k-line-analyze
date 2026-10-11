import type { Bar } from "../types/bars.js";

export function isBar(value: unknown): value is Bar {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.time === "number" &&
    typeof b.open === "number" &&
    typeof b.high === "number" &&
    typeof b.low === "number" &&
    typeof b.close === "number"
  );
}
