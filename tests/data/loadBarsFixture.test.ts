import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadBarsFixture,
  loadBarsFixtureFile,
} from "../../src/data/loadBarsFixture.js";

describe("loadBarsFixture", () => {
  it("loads bars from a local fixture file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kline-bars-"));
    const file = path.join(dir, "sample.json");
    await writeFile(
      file,
      JSON.stringify({
        data: [
          {
            time: 1704067200,
            open: 1,
            high: 2,
            low: 0.5,
            close: 1.5,
          },
        ],
        meta: { symbol: "EURUSD", timeframe: "H1", count: 1 },
        pulledAt: "2024-01-01T00:00:00Z",
      }),
      "utf8",
    );

    const bars = await loadBarsFixture(file);
    expect(bars).toEqual([
      { time: 1704067200, open: 1, high: 2, low: 0.5, close: 1.5 },
    ]);

    const full = await loadBarsFixtureFile(file);
    expect(full.meta.symbol).toBe("EURUSD");
    expect(full.pulledAt).toBe("2024-01-01T00:00:00Z");
  });

  it("rejects invalid fixture shape", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kline-bars-"));
    const file = path.join(dir, "bad.json");
    await writeFile(file, JSON.stringify({ meta: {} }), "utf8");
    await expect(loadBarsFixture(file)).rejects.toThrow(/data\[\]/);
  });
});
