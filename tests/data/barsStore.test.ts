import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  barsStorePath,
  writeBarsFixture,
} from "../../src/data/barsStore.js";
import { loadBarsFixtureFile } from "../../src/data/loadBarsFixture.js";
import type { FetchBarsParams } from "../../src/types/bars.js";

const sampleEnvelope = {
  data: [
    {
      time: 1704067200,
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
    },
  ],
  meta: { symbol: "EURUSD", timeframe: "H1" as const, count: 1 },
};

describe("barsStore", () => {
  it("barsStorePath joins root and barsFixtureFileName", () => {
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 100,
      to: 200,
    };
    const p = barsStorePath(params, "/tmp/store");
    expect(p).toBe(path.join("/tmp/store", "EURUSD_H1_100_200.json"));
  });

  it("writeBarsFixture by params then loadBarsFixtureFile round-trips", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "kline-store-"));
    const params: FetchBarsParams = {
      symbol: "EURUSD",
      timeframe: "H1",
      from: 1704067200,
      to: 1704070800,
    };

    const written = await writeBarsFixture(params, sampleEnvelope, {
      storeRoot: root,
    });
    expect(written).toBe(barsStorePath(params, root));

    const loaded = await loadBarsFixtureFile(written);
    expect(loaded.data).toEqual(sampleEnvelope.data);
    expect(loaded.meta.symbol).toBe("EURUSD");
    expect(loaded.pulledAt).toMatch(/Z$/);
  });

  it("writeBarsFixture by path preserves explicit pulledAt", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kline-store-"));
    const file = path.join(dir, "custom.json");
    await writeBarsFixture(file, {
      ...sampleEnvelope,
      pulledAt: "2024-01-01T00:00:00Z",
    });
    const loaded = await loadBarsFixtureFile(file);
    expect(loaded.pulledAt).toBe("2024-01-01T00:00:00Z");
  });

  it("rejects invalid envelope", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "kline-store-"));
    await expect(
      writeBarsFixture(path.join(dir, "bad.json"), {
        data: [],
        meta: undefined as unknown as { symbol: string; timeframe: string; count: number },
      }),
    ).rejects.toThrow(/meta/);
  });
});
