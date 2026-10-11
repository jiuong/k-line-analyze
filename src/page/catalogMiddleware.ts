import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "./sendJson.js";
import {
  loadTradingCatalog,
  type TradingCatalog,
} from "./tradingCatalog.js";

export type CatalogLoader = () => Promise<TradingCatalog>;

/** Dev-server gate for `GET /api/catalog`. The file path is not taken from the request. */
export async function handleCatalogHttp(
  req: IncomingMessage,
  res: ServerResponse,
  load: CatalogLoader = () => loadTradingCatalog(),
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/api/catalog") {
    return false;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method not allowed" });
    return true;
  }

  try {
    const catalog = await load();
    sendJson(res, 200, catalog);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 502, { error: message });
  }
  return true;
}
