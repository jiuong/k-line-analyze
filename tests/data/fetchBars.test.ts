import { afterEach, describe, expect, it, vi } from "vitest";
import {
  barsFixtureFileName,
  fetchBars,
  fetchBarsWithMeta,
  Mt5ApiError,
} from "../../src/data/fetchBars.js";

const sampleBody = {
  data: [
    {
      time: 1704067200,
      open: 1.1,
      high: 1.2,
      low: 1.0,
      close: 1.15,
      tick_volume: 10,
    },
  ],
  meta: {
    symbol: "XAUUSD+",
    timeframe: "H1",
    count: 1,
    source: "local",
    degraded: false,
    mt5_error: null,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MT5_BASE_URL;
});

describe("fetchBars", () => {
  it("returns bars from success envelope", async () => {
    process.env.MT5_BASE_URL = "http://127.0.0.1:8000/api/v1";
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toBe(
        "http://127.0.0.1:8000/api/v1/symbols/EURUSD/bars?timeframe=H1&count=2",
      );
      return new Response(JSON.stringify(sampleBody), { status: 200 });
    });

    const bars = await fetchBars(
      { symbol: "EURUSD", timeframe: "H1", count: 2 },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].close).toBe(1.15);
  });

  it("encodes + in symbol path as %2B", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("/symbols/XAUUSD%2B/bars?");
      return new Response(JSON.stringify(sampleBody), { status: 200 });
    });

    await fetchBarsWithMeta(
      { symbol: "XAUUSD+", timeframe: "M5", from: 1, to: 2 },
      {
        baseUrl: "http://localhost:8000/api/v1",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
  });

  it("throws Mt5ApiError on error envelope", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "SYMBOL_NOT_FOUND",
              message: "Symbol 'BAD' not found",
            },
          }),
          { status: 404 },
        ),
    );

    await expect(
      fetchBars(
        { symbol: "BAD", timeframe: "H1", count: 1 },
        {
          baseUrl: "http://127.0.0.1:8000/api/v1",
          fetchImpl: fetchImpl as unknown as typeof fetch,
        },
      ),
    ).rejects.toMatchObject({
      name: "Mt5ApiError",
      code: "SYMBOL_NOT_FOUND",
      status: 404,
    } satisfies Partial<Mt5ApiError>);
  });

  it("requires MT5_BASE_URL when not passed", async () => {
    await expect(
      fetchBars({ symbol: "EURUSD", timeframe: "H1", count: 1 }),
    ).rejects.toThrow(/MT5_BASE_URL/);
  });
});

describe("barsFixtureFileName", () => {
  it("uses from/to when present", () => {
    expect(
      barsFixtureFileName({
        symbol: "EURUSD",
        timeframe: "H1",
        from: 100,
        to: 200,
      }),
    ).toBe("EURUSD_H1_100_200.json");
  });

  it("uses count mode otherwise", () => {
    expect(
      barsFixtureFileName({ symbol: "XAUUSD+", timeframe: "M5", count: 50 }),
    ).toBe("XAUUSD+_M5_count50.json");
  });
});
