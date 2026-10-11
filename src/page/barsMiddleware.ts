import type { IncomingMessage, ServerResponse } from "node:http";
import {
  BarsQueryError,
  loadBarsForQuery,
  type BarsLoader,
  type BarsQueryInput,
} from "./barsHandler.js";
import { sendJson } from "./sendJson.js";

/** Dev-server gate for `GET /api/bars`. Returns false when the path is not ours. */
export async function handleBarsHttp(
  req: IncomingMessage,
  res: ServerResponse,
  load?: BarsLoader,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/api/bars") {
    return false;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method not allowed" });
    return true;
  }

  const input: BarsQueryInput = {
    symbol: url.searchParams.get("symbol") ?? undefined,
    timeframe: url.searchParams.get("timeframe") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    count: url.searchParams.get("count") ?? undefined,
    refresh: url.searchParams.get("refresh") ?? undefined,
  };

  try {
    const result = await loadBarsForQuery(input, load);
    sendJson(res, 200, result);
  } catch (err) {
    const status = err instanceof BarsQueryError ? err.status : 502;
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, status, { error: message });
  }
  return true;
}
