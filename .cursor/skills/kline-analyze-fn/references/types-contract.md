# Shared types contract

Extensible enums and the unified analysis result. When scaffolding lands, mirror these in `src/types/analysis.ts` (or equivalent). When adding a value, update **this file**, `src/types`, and the function’s `docs/spec/`.

## Primitive aliases

```ts
/** ISO-8601 UTC, e.g. "2024-01-01T00:00:00Z" — LLM-friendly */
type TimeString = string;

/** UTC Unix seconds — MT5 wire format */
type UnixSeconds = number;
```

## TimeFrame

Must stay aligned with MT5 `/bars` `timeframe`:

```ts
type TimeFrame =
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M10" | "M12" | "M15" | "M20" | "M30"
  | "H1" | "H2" | "H3" | "H4" | "H6" | "H8" | "H12"
  | "D1" | "W1" | "MN1";
```

## LevelName (extensible)

Point / swing / pattern anchors. Add names in specs when a function needs them; keep semantics stable once published.

| LevelName | Typical use |
|-----------|-------------|
| `H1` `H2` `H3` … | Swing highs (older → newer or as defined in spec) |
| `L1` `L2` `L3` … | Swing lows |
| `Top1` `Top2` | Double-top peaks |
| `Bottom1` `Bottom2` | Double-bottom troughs |

```ts
type LevelName =
  | "H1" | "H2" | "H3"
  | "L1" | "L2" | "L3"
  | "Top1" | "Top2"
  | "Bottom1" | "Bottom2";
  // extend as needed
```

Each `levels` value is a `LevelPoint` (`time` + `price`) for the candle that defines the point. `time` is the bar open time as `TimeString` unless a spec says otherwise; `price` semantics (high / low / close / etc.) are defined per `LevelName` in the function spec.

```ts
type LevelPoint = {
  time: TimeString;
  price: number;
};
```

## AnalysisLabel (extensible)

Machine-readable primary classification. Prefer stable professional terms.

| Label | Meaning |
|-------|---------|
| `bull_trend` | Higher High + Higher Low structure |
| `bear_trend` | Lower High + Lower Low structure |
| `trading_range` | Neither clear HH+HL nor LH+LL |
| `unclear` | Insufficient swings / data |

```ts
type AnalysisLabel =
  | "bull_trend"
  | "bear_trend"
  | "trading_range"
  | "unclear";
  // extend per function (document in docs/spec + here)
```

Functions may introduce new labels; never overload an existing label with a different meaning.

## AnalysisResult

```ts
type AnalysisResult<TEvidence = unknown> = {
  functionId: string;
  symbol: string;
  timeframe: TimeFrame;
  /** Time span of the detected structure / signals (not necessarily the full fetch window) */
  range: { start: TimeString; end?: TimeString };
  /** Named point → { time, price }; omit unused keys */
  levels: Partial<Record<LevelName, LevelPoint>>;
  /** Filled from the function’s summary template only */
  summary: string;
  label: AnalysisLabel;
  /** Deterministic code path — always 1 for now */
  confidence: 1;
  /**
   * Function-specific extras not expressible as named levels.
   * Prefer a minimal object (or empty) when geometry fits in levels/label/summary.
   */
  evidence: TEvidence;
};
```

### Field notes

- `range`: for a trend segment, typically from earliest used swing bar to latest used swing bar (or last bar of the structure). Define precisely in each `docs/spec`.
- `levels`: required object; geometric authority for named anchors (`time` + `price`). Use `{}` only if the function has no points.
- `evidence`: always present, JSON-serializable; put only facts that cannot be derived from `levels` / `label` / `summary` (e.g. resolved params, scores, counts). Schema is per function in `docs/spec`.

## Standard analyzer input

```ts
type AnalyzeParams<TOptions = Record<string, never>> = {
  symbol: string;
  timeframe: TimeFrame;
  /** Request window start (TimeString or UnixSeconds — normalize before fetchBars) */
  start: TimeString | UnixSeconds;
  end?: TimeString | UnixSeconds;
  count?: number;
  options?: TOptions;
};
```

Every public analyzer: `(params: AnalyzeParams<…>) => Promise<AnalysisResult<…>>` (or sync if bars are injected for tests — prefer async + `fetchBars`).
