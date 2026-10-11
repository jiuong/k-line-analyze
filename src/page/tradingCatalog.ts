import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTimeFrame } from "../types/bars.js";

export type CatalogOption = {
  code: string;
  label: string;
};

export type TradingCatalog = {
  symbols: CatalogOption[];
  timeframes: CatalogOption[];
};

/** Sibling checkout: `../trading-playback/config/trading.json`. */
export const defaultTradingCatalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../trading-playback/config/trading.json",
);

export function parseTradingCatalog(raw: unknown): TradingCatalog {
  if (!raw || typeof raw !== "object") {
    throw new Error("trading.json must be an object");
  }
  const body = raw as { symbols?: unknown; timeframes?: unknown };
  return {
    symbols: parseOptions(body.symbols, "symbols"),
    timeframes: parseTimeframes(body.timeframes),
  };
}

export async function loadTradingCatalog(
  filePath: string = defaultTradingCatalogPath,
): Promise<TradingCatalog> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read trading catalog: ${message}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("trading.json is not valid JSON");
  }
  return parseTradingCatalog(raw);
}

function parseOptions(value: unknown, field: string): CatalogOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`trading.json ${field} must be a non-empty array`);
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`trading.json ${field}[${index}] is invalid`);
    }
    const code = (item as { code?: unknown }).code;
    const label = (item as { label?: unknown }).label;
    if (typeof code !== "string" || !code.trim()) {
      throw new Error(`trading.json ${field}[${index}] needs a code`);
    }
    if (typeof label !== "string" || !label.trim()) {
      throw new Error(`trading.json ${field}[${index}] needs a label`);
    }
    return { code: code.trim(), label: label.trim() };
  });
}

function parseTimeframes(value: unknown): CatalogOption[] {
  const options = parseOptions(value, "timeframes");
  for (const option of options) {
    if (!isTimeFrame(option.code)) {
      throw new Error(
        `trading.json timeframe "${option.code}" is not a known TimeFrame`,
      );
    }
  }
  return options;
}
