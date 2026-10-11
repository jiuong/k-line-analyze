#!/usr/bin/env node
import path from "node:path";
import {
  barsFixtureFileName,
  fetchBarsWithMeta,
} from "../src/data/fetchBars.js";
import { writeBarsFixture } from "../src/data/barsStore.js";
import type { FetchBarsParams, TimeFrame } from "../src/types/bars.js";
import { toUnixSeconds } from "../src/utils/time.js";

const TIMEFRAMES = new Set<string>([
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M10",
  "M12",
  "M15",
  "M20",
  "M30",
  "H1",
  "H2",
  "H3",
  "H4",
  "H6",
  "H8",
  "H12",
  "D1",
  "W1",
  "MN1",
]);

function printUsage(): void {
  console.log(`Usage:
  npm run pull-bars -- --symbol <SYM> --timeframe <TF> (--from <t> --to <t> | --count <n>) [--out <path>]

Options:
  --symbol       Trading symbol (e.g. EURUSD, XAUUSD)
  --timeframe    MT5 timeframe (M1…MN1)
  --from         Range start: Unix seconds or ISO-8601 UTC
  --to           Range end: Unix seconds or ISO-8601 UTC (omit = now on server)
  --count        Last N bars (alternative to from/to)
  --out          Output file path (default: testdata/bars/<auto>.json)
  --base-url     Override MT5_BASE_URL

Env:
  MT5_BASE_URL   e.g. http://127.0.0.1:8000/api/v1
`);
}

function parseArgs(argv: string[]): {
  symbol?: string;
  timeframe?: string;
  from?: string;
  to?: string;
  count?: string;
  out?: string;
  baseUrl?: string;
  help?: boolean;
} {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (!a.startsWith("--")) {
      throw new Error(`Unexpected argument: ${a}`);
    }
    const key = a.slice(2);
    const value = argv[++i];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    out[key === "base-url" ? "baseUrl" : key] = value;
  }
  return out as ReturnType<typeof parseArgs>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }
  if (!args.symbol?.trim()) {
    throw new Error("--symbol is required");
  }
  if (!args.timeframe || !TIMEFRAMES.has(args.timeframe)) {
    throw new Error(
      `--timeframe must be one of: ${[...TIMEFRAMES].join(", ")}`,
    );
  }
  const tf = args.timeframe;
  const hasRange = args.from !== undefined || args.to !== undefined;
  const hasCount = args.count !== undefined;
  if (hasRange === hasCount) {
    throw new Error("Specify either (--from/--to) or --count, not both/neither");
  }
  if (hasRange && args.from === undefined) {
    throw new Error("--from is required when using range mode");
  }

  const params: FetchBarsParams = {
    symbol: args.symbol,
    timeframe: tf as TimeFrame,
  };
  if (hasCount) {
    const n = Number(args.count);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`--count must be a positive integer, got ${args.count}`);
    }
    params.count = n;
  } else {
    params.from = toUnixSeconds(args.from!);
    if (args.to !== undefined) {
      params.to = toUnixSeconds(args.to);
    }
  }

  const response = await fetchBarsWithMeta(params, {
    baseUrl: args.baseUrl,
  });

  const target = args.out
    ? path.resolve(process.cwd(), args.out)
    : params;

  const outPath = await writeBarsFixture(target, response);

  console.log(
    `Wrote ${response.data.length} bars → ${outPath}` +
      (response.meta.degraded ? " (degraded)" : "") +
      (args.out ? "" : ` (${barsFixtureFileName(params)})`),
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
