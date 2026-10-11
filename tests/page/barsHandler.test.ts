import { describe, expect, it, vi } from "vitest";
import {
  BarsQueryError,
  loadBarsForQuery,
  parseBarsQuery,
  type BarsLoader,
} from "../../src/page/barsHandler.js";
import type { LoadBarsResult } from "../../src/data/loadBars.js";

const localHit: LoadBarsResult = {
  data: [{ time: 100, open: 1, high: 2, low: 0.5, close: 1.5 }],
  meta: {
    symbol: "EURUSD",
    timeframe: "H1",
    count: 1,
    source: "local",
  },
  source: "local",
  pulledAt: "2024-01-01T00:00:00Z",
};

describe("parseBarsQuery", () => {
  it("requires symbol and a known timeframe", () => {
    expect(() => parseBarsQuery({ timeframe: "H1" })).toThrow(BarsQueryError);
    expect(() =>
      parseBarsQuery({ symbol: "EURUSD", timeframe: "H9" }),
    ).toThrow(/timeframe/);
  });

  it("parses range, count, and refresh", () => {
    expect(
      parseBarsQuery({
        symbol: "EURUSD",
        timeframe: "H1",
        from: "1704067200",
        to: "2024-01-01T01:00:00Z",
        count: "20",
        refresh: "true",
      }),
    ).toEqual({
      params: {
        symbol: "EURUSD",
        timeframe: "H1",
        from: 1704067200,
        to: 1704070800,
        count: 20,
      },
      refresh: true,
    });
  });

  it("rejects a bad count", () => {
    expect(() =>
      parseBarsQuery({ symbol: "EURUSD", timeframe: "H1", count: "0" }),
    ).toThrow(/count/);
  });
});

describe("loadBarsForQuery", () => {
  it("returns a local hit without forcing refresh", async () => {
    const load = vi.fn<BarsLoader>(async () => localHit);
    const result = await loadBarsForQuery(
      { symbol: "EURUSD", timeframe: "H1" },
      load,
    );
    expect(result.source).toBe("local");
    expect(load).toHaveBeenCalledWith(
      { symbol: "EURUSD", timeframe: "H1" },
      { refresh: false },
    );
  });

  it("passes refresh through", async () => {
    const load = vi.fn<BarsLoader>(async () => ({ ...localHit, source: "mt5" }));
    const result = await loadBarsForQuery(
      { symbol: "EURUSD", timeframe: "H1", refresh: "1" },
      load,
    );
    expect(result.source).toBe("mt5");
    expect(load).toHaveBeenCalledWith(
      { symbol: "EURUSD", timeframe: "H1" },
      { refresh: true },
    );
  });

  it("returns degraded local data when the loader does", async () => {
    const degraded: LoadBarsResult = {
      ...localHit,
      meta: { ...localHit.meta, degraded: true, mt5_error: "down" },
    };
    const load = vi.fn<BarsLoader>(async () => degraded);
    const result = await loadBarsForQuery(
      { symbol: "EURUSD", timeframe: "H1" },
      load,
    );
    expect(result.source).toBe("local");
    expect(result.meta.degraded).toBe(true);
  });

  it("surfaces loader failure when nothing covers the window", async () => {
    const load = vi.fn<BarsLoader>(async () => {
      throw new Error("MT5 unavailable");
    });
    await expect(
      loadBarsForQuery({ symbol: "EURUSD", timeframe: "H1" }, load),
    ).rejects.toMatchObject({ status: 502, message: "MT5 unavailable" });
  });
});
