import type {
  Bar,
  BarsApiResponse,
  BarsMeta,
  FetchBarsParams,
} from "../types/bars.js";
import { isBar } from "./barGuards.js";

export class Mt5ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "Mt5ApiError";
    this.code = code;
    this.status = status;
  }
}

export type FetchBarsOptions = {
  /** Defaults to `process.env.MT5_BASE_URL` */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export function resolveMt5BaseUrl(explicit?: string): string {
  const raw = explicit ?? process.env.MT5_BASE_URL;
  if (!raw?.trim()) {
    throw new Error(
      "MT5_BASE_URL is not set. Example: http://127.0.0.1:8000/api/v1",
    );
  }
  return raw.replace(/\/+$/, "");
}

function encodeSymbolPath(symbol: string): string {
  return encodeURIComponent(symbol);
}

function buildBarsUrl(baseUrl: string, params: FetchBarsParams): string {
  const url = new URL(
    `${baseUrl}/symbols/${encodeSymbolPath(params.symbol)}/bars`,
  );
  url.searchParams.set("timeframe", params.timeframe);
  if (params.from !== undefined) {
    url.searchParams.set("from", String(params.from));
  }
  if (params.to !== undefined) {
    url.searchParams.set("to", String(params.to));
  }
  if (params.count !== undefined) {
    url.searchParams.set("count", String(params.count));
  }
  return url.toString();
}

function parseSuccessBody(body: unknown, status: number): BarsApiResponse {
  if (!body || typeof body !== "object") {
    throw new Mt5ApiError(
      "INVALID_RESPONSE",
      "MT5 bars response is not a JSON object",
      status,
    );
  }
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.data) || !obj.data.every(isBar)) {
    throw new Mt5ApiError(
      "INVALID_RESPONSE",
      "MT5 bars response missing valid data[]",
      status,
    );
  }
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Mt5ApiError(
      "INVALID_RESPONSE",
      "MT5 bars response missing meta",
      status,
    );
  }
  const meta = obj.meta as BarsMeta;
  return { data: obj.data as Bar[], meta };
}

/**
 * Fetch bars with full API envelope (`data` + `meta`).
 * Analysis code should prefer {@link fetchBars}.
 */
export async function fetchBarsWithMeta(
  params: FetchBarsParams,
  options: FetchBarsOptions = {},
): Promise<BarsApiResponse> {
  const baseUrl = resolveMt5BaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("global fetch is unavailable; use Node.js 18+");
  }

  const url = buildBarsUrl(baseUrl, params);
  const res = await fetchImpl(url);

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Mt5ApiError(
      "INVALID_RESPONSE",
      `MT5 bars response is not JSON (HTTP ${res.status})`,
      res.status,
    );
  }

  if (!res.ok) {
    const errObj = body as { error?: { code?: string; message?: string } };
    const code = errObj?.error?.code ?? "HTTP_ERROR";
    const message =
      errObj?.error?.message ?? `MT5 bars request failed (HTTP ${res.status})`;
    throw new Mt5ApiError(code, message, res.status);
  }

  return parseSuccessBody(body, res.status);
}

/**
 * Shared MT5 bars client. Analyzers must use this — not raw fetch/axios.
 */
export async function fetchBars(
  params: FetchBarsParams,
  options: FetchBarsOptions = {},
): Promise<Bar[]> {
  const { data } = await fetchBarsWithMeta(params, options);
  return data;
}

/** Build default local fixture filename (no directory). */
export function barsFixtureFileName(params: FetchBarsParams): string {
  const symbol = params.symbol.replace(/[^\w.+-]/g, "_");
  const tf = params.timeframe;
  if (params.from !== undefined || params.to !== undefined) {
    const from = params.from ?? "start";
    const to = params.to ?? "now";
    return `${symbol}_${tf}_${from}_${to}.json`;
  }
  const count = params.count ?? 100;
  return `${symbol}_${tf}_count${count}.json`;
}
