import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { handleCatalogHttp } from "../../src/page/catalogMiddleware.js";
import type { TradingCatalog } from "../../src/page/tradingCatalog.js";

const catalog: TradingCatalog = {
  symbols: [{ code: "XAUUSD", label: "黄金" }],
  timeframes: [{ code: "M5", label: "5分钟" }],
};

function mockRes() {
  let body = "";
  return {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn((chunk?: string) => {
      body = chunk ?? "";
    }),
    json() {
      return JSON.parse(body) as TradingCatalog & { error?: string };
    },
  };
}

describe("handleCatalogHttp", () => {
  it("ignores other paths", async () => {
    const res = mockRes();
    const handled = await handleCatalogHttp(
      { url: "/api/bars", method: "GET" } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(handled).toBe(false);
    expect(res.end).not.toHaveBeenCalled();
  });

  it("returns the loader catalog and ignores a path query", async () => {
    const res = mockRes();
    const load = vi.fn(async () => catalog);
    const handled = await handleCatalogHttp(
      {
        url: "/api/catalog?path=C:/secret/trading.json",
        method: "GET",
      } as IncomingMessage,
      res as unknown as ServerResponse,
      load,
    );
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.json().symbols[0]?.code).toBe("XAUUSD");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("propagates a missing catalog", async () => {
    const res = mockRes();
    await handleCatalogHttp(
      { url: "/api/catalog", method: "GET" } as IncomingMessage,
      res as unknown as ServerResponse,
      async () => {
        throw new Error("Cannot read trading catalog: ENOENT");
      },
    );
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toMatch(/ENOENT/);
  });
});
