import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  BarsApiResponse,
  BarsFixtureFile,
  FetchBarsParams,
} from "../types/bars.js";
import { toTimeString } from "../utils/time.js";
import { isBar } from "./barGuards.js";
import { barsFixtureFileName } from "./fetchBars.js";

/** Repo-relative default root for local bars JSON store */
export const DEFAULT_BARS_STORE_ROOT = path.join("testdata", "bars");

export type WriteBarsFixtureOptions = {
  /** Store root when resolving from `FetchBarsParams` (default: {@link DEFAULT_BARS_STORE_ROOT}) */
  storeRoot?: string;
};

/**
 * Absolute path for a query key under the local JSON store.
 */
export function barsStorePath(
  params: FetchBarsParams,
  storeRoot: string = DEFAULT_BARS_STORE_ROOT,
): string {
  const root = path.isAbsolute(storeRoot)
    ? storeRoot
    : path.resolve(process.cwd(), storeRoot);
  return path.join(root, barsFixtureFileName(params));
}

function assertEnvelope(envelope: BarsApiResponse | BarsFixtureFile): void {
  if (!Array.isArray(envelope.data) || !envelope.data.every(isBar)) {
    throw new Error("Bars fixture missing valid data[]");
  }
  if (!envelope.meta || typeof envelope.meta !== "object") {
    throw new Error("Bars fixture missing meta");
  }
}

/**
 * Write a `BarsFixtureFile` to disk. `target` is either an absolute/relative
 * file path or `FetchBarsParams` (resolved under `storeRoot`).
 * Returns the absolute path written.
 */
export async function writeBarsFixture(
  target: string | FetchBarsParams,
  envelope: BarsApiResponse | BarsFixtureFile,
  options: WriteBarsFixtureOptions = {},
): Promise<string> {
  assertEnvelope(envelope);

  const outPath =
    typeof target === "string"
      ? path.isAbsolute(target)
        ? target
        : path.resolve(process.cwd(), target)
      : barsStorePath(target, options.storeRoot);

  const pulledAt =
    "pulledAt" in envelope && envelope.pulledAt
      ? envelope.pulledAt
      : toTimeString(Math.floor(Date.now() / 1000));

  const file: BarsFixtureFile = {
    data: envelope.data,
    meta: envelope.meta,
    pulledAt,
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return outPath;
}
