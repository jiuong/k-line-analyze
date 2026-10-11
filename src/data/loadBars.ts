import { access } from "node:fs/promises";
import type {
  Bar,
  BarsApiResponse,
  BarsFixtureFile,
  FetchBarsParams,
} from "../types/bars.js";
import { barsCoverQuery } from "./barsCoverage.js";
import {
  barsStorePath,
  writeBarsFixture,
  type WriteBarsFixtureOptions,
} from "./barsStore.js";
import {
  fetchBarsWithMeta,
  type FetchBarsOptions,
} from "./fetchBars.js";
import { loadBarsFixtureFile } from "./loadBarsFixture.js";

export type LoadBarsOptions = FetchBarsOptions &
  WriteBarsFixtureOptions & {
    /** When true, skip local hit and always call MT5 (then write-back on success). */
    refresh?: boolean;
  };

export type LoadBarsResult = BarsApiResponse & {
  /** Where bars came from for this call */
  source: "local" | "mt5";
  pulledAt?: string;
};

async function tryReadLocal(
  filePath: string,
): Promise<BarsFixtureFile | null> {
  try {
    await access(filePath);
  } catch {
    return null;
  }
  return loadBarsFixtureFile(filePath);
}

/**
 * Read-through bars loader: prefer local JSON store when it covers the query;
 * otherwise fetch MT5 and write-back. On MT5 failure, return covering local data
 * when available (offline).
 */
export async function loadBarsWithMeta(
  params: FetchBarsParams,
  options: LoadBarsOptions = {},
): Promise<LoadBarsResult> {
  const filePath = barsStorePath(params, options.storeRoot);
  const local = await tryReadLocal(filePath);
  const localCovers =
    local !== null && barsCoverQuery(local.data, params);

  if (!options.refresh && localCovers && local) {
    return {
      data: local.data,
      meta: { ...local.meta, source: local.meta.source ?? "local" },
      pulledAt: local.pulledAt,
      source: "local",
    };
  }

  try {
    const remote = await fetchBarsWithMeta(params, {
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl,
    });
    const writtenPath = await writeBarsFixture(params, remote, {
      storeRoot: options.storeRoot,
    });
    const saved = await loadBarsFixtureFile(writtenPath);
    return {
      data: saved.data,
      meta: { ...saved.meta, persisted: true },
      pulledAt: saved.pulledAt,
      source: "mt5",
    };
  } catch (err) {
    if (localCovers && local) {
      return {
        data: local.data,
        meta: {
          ...local.meta,
          source: "local",
          degraded: true,
          mt5_error: err instanceof Error ? err.message : String(err),
        },
        pulledAt: local.pulledAt,
        source: "local",
      };
    }
    throw err;
  }
}

export async function loadBars(
  params: FetchBarsParams,
  options: LoadBarsOptions = {},
): Promise<Bar[]> {
  const { data } = await loadBarsWithMeta(params, options);
  return data;
}
