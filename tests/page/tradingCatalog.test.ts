import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultTradingCatalogPath,
  loadTradingCatalog,
  parseTradingCatalog,
} from "../../src/page/tradingCatalog.js";

const sample = {
  symbols: [
    { code: "XAUUSD", label: "黄金", contractSize: 100 },
    { code: "EURUSD", label: "欧元/美元" },
  ],
  timeframes: [
    { code: "M5", label: "5分钟" },
    { code: "H1", label: "1小时" },
  ],
};

describe("parseTradingCatalog", () => {
  it("keeps code and label in file order", () => {
    expect(parseTradingCatalog(sample)).toEqual({
      symbols: [
        { code: "XAUUSD", label: "黄金" },
        { code: "EURUSD", label: "欧元/美元" },
      ],
      timeframes: [
        { code: "M5", label: "5分钟" },
        { code: "H1", label: "1小时" },
      ],
    });
  });

  it("rejects an unknown timeframe", () => {
    expect(() =>
      parseTradingCatalog({
        symbols: [{ code: "EURUSD", label: "欧元/美元" }],
        timeframes: [{ code: "H9", label: "nope" }],
      }),
    ).toThrow(/H9/);
  });

  it("rejects an empty symbol list", () => {
    expect(() =>
      parseTradingCatalog({ symbols: [], timeframes: sample.timeframes }),
    ).toThrow(/symbols/);
  });
});

describe("loadTradingCatalog", () => {
  it("reads a catalog file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "catalog-"));
    const file = path.join(dir, "trading.json");
    await writeFile(file, JSON.stringify(sample));
    const catalog = await loadTradingCatalog(file);
    expect(catalog.symbols[0]).toEqual({ code: "XAUUSD", label: "黄金" });
  });

  it("reports a missing file", async () => {
    await expect(
      loadTradingCatalog(path.join(tmpdir(), "missing-trading.json")),
    ).rejects.toThrow(/Cannot read trading catalog/);
  });

  it("loads the sibling trading.json", async () => {
    const catalog = await loadTradingCatalog(defaultTradingCatalogPath);
    expect(catalog.symbols[0]?.code).toBe("XAUUSD");
    expect(catalog.timeframes[0]?.code).toBe("M5");
    expect(catalog.timeframes.map((item) => item.code)).not.toContain("M1");
  });
});
