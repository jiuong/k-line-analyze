import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bar, BarsFixtureFile } from "../types/bars.js";
import { isBar } from "./barGuards.js";

/**
 * Load a local bars fixture JSON (`{ data, meta, pulledAt? }`) and return bars.
 * Path may be absolute or relative to `process.cwd()`.
 */
export async function loadBarsFixture(filePath: string): Promise<Bar[]> {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const raw = await readFile(absolute, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in bars fixture: ${absolute}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Bars fixture must be an object: ${absolute}`);
  }
  const file = parsed as BarsFixtureFile;
  if (!Array.isArray(file.data) || !file.data.every(isBar)) {
    throw new Error(`Bars fixture missing valid data[]: ${absolute}`);
  }
  return file.data;
}

export async function loadBarsFixtureFile(
  filePath: string,
): Promise<BarsFixtureFile> {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const raw = await readFile(absolute, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in bars fixture: ${absolute}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Bars fixture must be an object: ${absolute}`);
  }
  const file = parsed as BarsFixtureFile;
  if (!Array.isArray(file.data) || !file.data.every(isBar)) {
    throw new Error(`Bars fixture missing valid data[]: ${absolute}`);
  }
  if (!file.meta || typeof file.meta !== "object") {
    throw new Error(`Bars fixture missing meta: ${absolute}`);
  }
  return file;
}
