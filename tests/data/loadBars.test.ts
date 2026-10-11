import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { writeBarsFixture } from "../../src/data/barsStore.js";
import { Mt5ApiError } from "../../src/data/fetchBars.js";
import { loadBars, loadBarsWithMeta } from "../../src/data/loadBars.js";
import type { FetchBarsParams } from "../../src/types/bars.js";

const params: FetchBarsParams = {
  symbol: "EURUSD",
  timeframe: "H1",
  from: 100,
  to: 300,
};

const coveringBars = [
  { time: 100, open: 1, high: 1, low: 1, close: 1 },
  { time: 200, open: 1, high: 1, low: 1, close: 1 },
  { time: 300, open: 1, high: 1, low: 1, close: 1 },
];

const remoteBody = {
  data: [
    { time: 100, open: 2, high: 2, low: 2, close: 2 },
    { time: 200, open: 2, high: 2, low: 2, close: 2 },
    { time: 300, open: 2, high: 2, low: 2, close: 2 },
  ],
  meta: {
    symbol: "EURUSD",
    timeframe: "H1",
    count: 3,
    source: "mt5",
  },
};

describe("loadBars read-through", () => {
  it("local hit does not call fetch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-rt-"));
    await writeBarsFixture(
      params,
      { data: coveringBars, meta: { symbol: "EURUSD", timeframe: "H1", count: 3 } },
      { storeRoot: root },
    );

    const fetchImpl = vi.fn();
    const result = await loadBarsWithMeta(params, {
      storeRoot: root,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "http://127.0.0.1:8000/api/v1",
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.source).toBe("local");
    expect(result.data[0]!.close).toBe(1);
  });

  it("miss fetches, write-backs, then second call hits local", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-rt-"));
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(remoteBody), { status: 200 }),
    );

    const first = await loadBarsWithMeta(params, {
      storeRoot: root,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "http://127.0.0.1:8000/api/v1",
    });
    expect(first.source).toBe("mt5");
    expect(first.data[0]!.close).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const second = await loadBarsWithMeta(params, {
      storeRoot: root,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "http://127.0.0.1:8000/api/v1",
    });
    expect(second.source).toBe("local");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refresh forces MT5 even when local covers", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-rt-"));
    await writeBarsFixture(
      params,
      { data: coveringBars, meta: { symbol: "EURUSD", timeframe: "H1", count: 3 } },
      { storeRoot: root },
    );

    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(remoteBody), { status: 200 }),
    );

    const result = await loadBarsWithMeta(params, {
      storeRoot: root,
      refresh: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "http://127.0.0.1:8000/api/v1",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("mt5");
    expect(result.data[0]!.close).toBe(2);
  });

  it("offline: MT5 down with covering local returns local", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-rt-"));
    await writeBarsFixture(
      params,
      { data: coveringBars, meta: { symbol: "EURUSD", timeframe: "H1", count: 3 } },
      { storeRoot: root },
    );

    const fetchImpl = vi.fn(async () => {
      throw new Mt5ApiError("NETWORK", "down", 0);
    });

    const result = await loadBarsWithMeta(params, {
      storeRoot: root,
      refresh: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseUrl: "http://127.0.0.1:8000/api/v1",
    });

    expect(result.source).toBe("local");
    expect(result.meta.degraded).toBe(true);
    expect(result.data[0]!.close).toBe(1);
  });

  it("MT5 down without covering local rethrows", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-rt-"));
    const incomplete = [
      { time: 200, open: 1, high: 1, low: 1, close: 1 },
      { time: 300, open: 1, high: 1, low: 1, close: 1 },
    ];
    await writeBarsFixture(
      params,
      { data: incomplete, meta: { symbol: "EURUSD", timeframe: "H1", count: 2 } },
      { storeRoot: root },
    );

    const fetchImpl = vi.fn(async () => {
      throw new Mt5ApiError("NETWORK", "down", 0);
    });

    await expect(
      loadBars(params, {
        storeRoot: root,
        refresh: true,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        baseUrl: "http://127.0.0.1:8000/api/v1",
      }),
    ).rejects.toBeInstanceOf(Mt5ApiError);
  });
});
