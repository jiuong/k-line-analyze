import { describe, expect, it } from "vitest";
import { mapBarsToKline } from "../../src/chart/mapBars.js";
import type { Bar } from "../../src/types/bars.js";

const bars: Bar[] = [
  {
    time: 1704067200,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    tick_volume: 5,
    real_volume: 7,
  },
  { time: 1704070800, open: 11, high: 13, low: 10, close: 12 },
];

describe("mapBarsToKline", () => {
  it("copies OHLC, stamps timeframe, and converts time to +08:00", () => {
    expect(mapBarsToKline(bars, "M15")).toEqual([
      {
        timeframe: "M15",
        time: "2024-01-01T08:00:00+08:00",
        open: 10,
        high: 12,
        low: 9,
        close: 11,
      },
      {
        timeframe: "M15",
        time: "2024-01-01T09:00:00+08:00",
        open: 11,
        high: 13,
        low: 10,
        close: 12,
      },
    ]);
  });
});
