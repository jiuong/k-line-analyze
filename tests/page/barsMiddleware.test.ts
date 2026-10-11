import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { LoadBarsResult } from "../../src/data/loadBars.js";
import { handleBarsHttp } from "../../src/page/barsMiddleware.js";
import type { BarsLoader } from "../../src/page/barsHandler.js";

function mockRes() {
  let body = "";
  const res = {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn((chunk?: string) => {
      body = chunk ?? "";
    }),
    json() {
      return JSON.parse(body) as { error?: string; source?: string };
    },
  };
  return res;
}

describe("handleBarsHttp", () => {
  it("ignores other paths", async () => {
    const res = mockRes();
    const handled = await handleBarsHttp(
      { url: "/index.html", method: "GET" } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(handled).toBe(false);
    expect(res.end).not.toHaveBeenCalled();
  });

  it("rejects an invalid query before loading", async () => {
    const load = vi.fn<BarsLoader>();
    const res = mockRes();
    const handled = await handleBarsHttp(
      {
        url: "/api/bars?symbol=EURUSD&timeframe=NOPE&storeRoot=/tmp/secret",
        method: "GET",
      } as IncomingMessage,
      res as unknown as ServerResponse,
      load,
    );
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/timeframe/);
    expect(load).not.toHaveBeenCalled();
  });

  it("returns loader JSON for a valid query", async () => {
    const payload: LoadBarsResult = {
      data: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }],
      meta: { symbol: "EURUSD", timeframe: "H1", count: 1 },
      source: "local",
    };
    const load = vi.fn<BarsLoader>(async () => payload);
    const res = mockRes();
    await handleBarsHttp(
      {
        url: "/api/bars?symbol=EURUSD&timeframe=H1&refresh=false",
        method: "GET",
      } as IncomingMessage,
      res as unknown as ServerResponse,
      load,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe("local");
    expect(load).toHaveBeenCalledWith(
      { symbol: "EURUSD", timeframe: "H1" },
      { refresh: false },
    );
  });
});
