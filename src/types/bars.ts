/** UTC Unix seconds — MT5 wire format */
export type UnixSeconds = number;

/** ISO-8601 UTC, e.g. "2024-01-01T00:00:00Z" */
export type TimeString = string;

/** Aligned with MT5 `/bars` timeframe */
export const TIME_FRAMES = [
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M10",
  "M12",
  "M15",
  "M20",
  "M30",
  "H1",
  "H2",
  "H3",
  "H4",
  "H6",
  "H8",
  "H12",
  "D1",
  "W1",
  "MN1",
] as const;

export type TimeFrame = (typeof TIME_FRAMES)[number];

export function isTimeFrame(value: string): value is TimeFrame {
  return (TIME_FRAMES as readonly string[]).includes(value);
}

export type Bar = {
  time: UnixSeconds;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume?: number;
  spread?: number;
  real_volume?: number;
};

export type BarsMeta = {
  symbol: string;
  timeframe: string;
  count: number;
  cached?: boolean;
  source?: "local" | "mt5" | "mixed" | string;
  persisted?: boolean;
  degraded?: boolean;
  stale_tip?: boolean;
  mt5_error?: string | null;
};

export type BarsApiResponse = {
  data: Bar[];
  meta: BarsMeta;
};

export type FetchBarsParams = {
  symbol: string;
  timeframe: TimeFrame;
  from?: UnixSeconds;
  to?: UnixSeconds;
  count?: number;
};

/** On-disk fixture: API envelope plus optional pull metadata */
export type BarsFixtureFile = BarsApiResponse & {
  pulledAt?: TimeString;
};
