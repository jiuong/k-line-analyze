# MT5 bars data contract

Source of truth for the live service: `D:\code\services\mt5\docs\API.md` (keep this digest aligned when that API changes).

## Base URL

`http://<host>:<port>/api/v1`

All MT5 API timestamps are **UTC Unix seconds**.

## Primary endpoint (single symbol)

`GET /api/v1/symbols/{symbol}/bars`

| Query | Type | Required | Notes |
|-------|------|----------|-------|
| `timeframe` | string | yes | See TimeFrame list below (case-insensitive on server) |
| `count` | int | no | Last N bars; default 100; capped by `MAX_BARS_COUNT` (default 5000) |
| `from` | int | no | Start Unix seconds; when present, range semantics apply |
| `to` | int | no | End Unix seconds; omit = now |

Path: encode `+` in symbols as `%2B` (e.g. `XAUUSD%2B`). Alias example: request `XAUUSD` → resolved `XAUUSD+` (see MT5 docs).

### Success response (shape)

```json
{
  "data": [
    {
      "time": 1704067200,
      "open": 1.1045,
      "high": 1.1052,
      "low": 1.1041,
      "close": 1.1048,
      "tick_volume": 1234,
      "spread": 5,
      "real_volume": 0
    }
  ],
  "meta": {
    "symbol": "EURUSD",
    "timeframe": "H1",
    "count": 100,
    "cached": false,
    "source": "local",
    "persisted": false,
    "degraded": false,
    "stale_tip": false,
    "mt5_error": null
  }
}
```

| `meta.source` | Meaning |
|---------------|---------|
| `local` | SQLite only |
| `mt5` | terminal only |
| `mixed` | local + MT5 fill |

HTTP 200 with `meta.degraded=true` means offline/local fallback — analyzers should still accept the bars unless the product rule says otherwise.

### Error envelope

```json
{
  "error": {
    "code": "SYMBOL_NOT_FOUND",
    "message": "Symbol 'INVALID' not found"
  }
}
```

Relevant status codes: 400 invalid params/timeframe, 403 IP whitelist, 404 symbol, 502/503 MT5 unavailable without local bars.

## Batch endpoint

`GET /api/v1/bars?symbols=EURUSD,GBPUSD&timeframe=H1&count=…` — use only when a function truly needs multi-symbol input. Prefer the single-symbol route for one-instrument analyzers.

## TimeFrame values (server)

`M1` `M2` `M3` `M4` `M5` `M6` `M10` `M12` `M15` `M20` `M30`  
`H1` `H2` `H3` `H4` `H6` `H8` `H12`  
`D1` `W1` `MN1`

## Client dependency rule

Analysis code must call a shared client, e.g.:

```ts
fetchBars(params: {
  symbol: string;
  timeframe: TimeFrame;
  from?: number; // Unix seconds
  to?: number;
  count?: number;
}): Promise<Bar[]>;
```

- Convert analysis `timeString` (ISO-8601 UTC) → Unix seconds **inside** the client or a shared time util, not ad hoc in every analyzer.
- Map each `Bar.time` → `timeString` when filling `AnalysisResult.range` / `levels`.
- Do not scatter raw `fetch`/`axios` calls inside `src/analyze/*`.

## Bar type (analysis-facing)

```ts
type Bar = {
  time: number; // UTC Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume?: number;
  spread?: number;
  real_volume?: number;
};
```
