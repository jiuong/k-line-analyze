import type { Bar, FetchBarsParams } from "../types/bars.js";

/**
 * v1 endpoint coverage: bars must be time-ascending.
 * - Count mode (`count` set): `bars.length >= count` (count takes precedence).
 * - Range mode: requires `from`; `bars[0].time <= from` and, if `to` set,
 *   `bars[last].time >= to`. Omitting `to` only checks the start endpoint.
 * Does not scan for session gaps (e.g. FX weekends).
 */
export function barsCoverQuery(bars: Bar[], params: FetchBarsParams): boolean {
  if (params.count !== undefined) {
    return bars.length >= params.count;
  }

  if (params.from === undefined) {
    return false;
  }
  if (bars.length === 0) {
    return false;
  }

  const sorted = isTimeAscending(bars) ? bars : sortByTime(bars);
  if (sorted[0]!.time > params.from) {
    return false;
  }
  if (params.to !== undefined && sorted[sorted.length - 1]!.time < params.to) {
    return false;
  }
  return true;
}

function isTimeAscending(bars: Bar[]): boolean {
  for (let i = 1; i < bars.length; i++) {
    if (bars[i]!.time < bars[i - 1]!.time) return false;
  }
  return true;
}

function sortByTime(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => a.time - b.time);
}
