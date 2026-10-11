import type { KlineBar } from "@trading-playback/kline-chart";
import type { Bar, TimeFrame } from "../types/bars.js";
import { toEast8TimeString } from "../utils/time.js";

/** Map repo bars to library candles. Volume fields are dropped. Times are East-8. */
export function mapBarsToKline(
  bars: readonly Bar[],
  timeframe: TimeFrame,
): KlineBar[] {
  return bars.map((bar) => ({
    timeframe,
    time: toEast8TimeString(bar.time),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}
