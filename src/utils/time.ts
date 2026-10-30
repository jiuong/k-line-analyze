import type { Bar, TimeString, UnixSeconds } from "../types/bars.js";

/**
 * Parse CLI / analysis time input to UTC Unix seconds.
 * Accepts Unix seconds (number or digit string) or ISO-8601 UTC.
 */
export function toUnixSeconds(input: string | number): UnixSeconds {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new Error(`Invalid Unix seconds: ${input}`);
    }
    return Math.trunc(input);
  }

  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    throw new Error(
      `Invalid time "${input}"; use Unix seconds or ISO-8601 UTC (e.g. 2024-01-01T00:00:00Z)`,
    );
  }
  return Math.floor(ms / 1000);
}

export function toTimeString(unix: UnixSeconds): TimeString {
  return new Date(unix * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Bar index whose open time formats as `time`. Missing time throws. */
export function barIndexAt(bars: readonly Bar[], time: string, functionId: string): number {
  const index = bars.findIndex((bar) => toTimeString(bar.time) === time);
  if (index < 0) {
    throw new Error(`${functionId}: segment time is not in bars`);
  }
  return index;
}

const EAST8_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * East-8 ISO-8601 with an explicit `+08:00` suffix.
 * Chart library input only. Do not pass `toTimeString` (`…Z`) into the chart.
 */
export function toEast8TimeString(input: UnixSeconds | TimeString): string {
  const unix = toUnixSeconds(input);
  const shifted = new Date(unix * 1000 + EAST8_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = shifted.getUTCFullYear();
  const month = pad(shifted.getUTCMonth() + 1);
  const day = pad(shifted.getUTCDate());
  const hours = pad(shifted.getUTCHours());
  const minutes = pad(shifted.getUTCMinutes());
  const seconds = pad(shifted.getUTCSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}
