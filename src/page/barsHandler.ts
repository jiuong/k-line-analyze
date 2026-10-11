import {
  loadBarsWithMeta,
  type LoadBarsResult,
} from "../data/loadBars.js";
import {
  isTimeFrame,
  type FetchBarsParams,
  type TimeFrame,
} from "../types/bars.js";
import { toUnixSeconds } from "../utils/time.js";

export class BarsQueryError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BarsQueryError";
    this.status = status;
  }
}

export type BarsQueryInput = {
  symbol?: string;
  timeframe?: string;
  from?: string;
  to?: string;
  count?: string;
  refresh?: string;
};

export type BarsLoader = (
  params: FetchBarsParams,
  options: { refresh?: boolean },
) => Promise<LoadBarsResult>;

const defaultLoader: BarsLoader = (params, options) =>
  loadBarsWithMeta(params, options);

/** Parse a review-page query. Rejects missing fields. Ignores file paths. */
export function parseBarsQuery(input: BarsQueryInput): {
  params: FetchBarsParams;
  refresh: boolean;
} {
  const symbol = input.symbol?.trim() ?? "";
  if (!symbol) {
    throw new BarsQueryError(400, "symbol is required");
  }

  const timeframe = input.timeframe?.trim() ?? "";
  if (!isTimeFrame(timeframe)) {
    throw new BarsQueryError(400, "timeframe is invalid");
  }

  const params: FetchBarsParams = {
    symbol,
    timeframe: timeframe as TimeFrame,
  };

  if (input.from?.trim()) {
    params.from = parseTime(input.from, "from");
  }
  if (input.to?.trim()) {
    params.to = parseTime(input.to, "to");
  }
  if (input.count?.trim()) {
    params.count = parseCount(input.count);
  }

  return { params, refresh: parseRefresh(input.refresh) };
}

export async function loadBarsForQuery(
  input: BarsQueryInput,
  load: BarsLoader = defaultLoader,
): Promise<LoadBarsResult> {
  const { params, refresh } = parseBarsQuery(input);
  try {
    return await load(params, { refresh });
  } catch (err) {
    if (err instanceof BarsQueryError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new BarsQueryError(502, message);
  }
}

function parseTime(value: string, field: string): number {
  try {
    return toUnixSeconds(value.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new BarsQueryError(400, `${field}: ${message}`);
  }
}

function parseCount(value: string): number {
  const count = Number(value.trim());
  if (!Number.isInteger(count) || count <= 0) {
    throw new BarsQueryError(400, "count must be a positive integer");
  }
  return count;
}

function parseRefresh(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase() ?? "";
  if (raw === "" || raw === "0" || raw === "false") {
    return false;
  }
  if (raw === "1" || raw === "true") {
    return true;
  }
  throw new BarsQueryError(400, "refresh must be true or false");
}
