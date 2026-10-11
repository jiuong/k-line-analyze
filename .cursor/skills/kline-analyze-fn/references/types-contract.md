# Shared types contract

Extensible enums and the unified analysis result. Mirrored in [`src/types/analysis.ts`](../../../../src/types/analysis.ts). When adding a value, update **this file**, `src/types`, and the function’s `docs/spec/`.

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
| `K1` `K2` `Confirm` | Reversal setup, extreme, and confirm bar (`classifyReversalSignal`; price depends on bull vs bear) |

```ts
type LevelName =
  | "H1" | "H2" | "H3"
  | "L1" | "L2" | "L3"
  | "Top1" | "Top2"
  | "Bottom1" | "Bottom2"
  | "K1" | "K2" | "Confirm";
  // extend as needed
```

Each entry in `results[].levels` is a `Level` (`name` + `price` + `time`) for the candle that defines the point. `time` is the bar open time as `TimeString` unless a spec says otherwise; `price` semantics (high / low / close / etc.) are defined per `LevelName` in the function spec. The type allows duplicate `name` values; uniqueness is a function-spec concern.

```ts
type Level = {
  name: LevelName;
  price: number;
  time: TimeString;
};
```

## AnalysisLabel (extensible)

Machine-readable primary classification. Prefer stable professional terms.

| Label | Meaning |
|-------|---------|
| `bull_trend` | Segment opened by a `bull_reversal` `K2`, through the next opposite `K2` or the last bar (`classifySwingTrend`) |
| `bear_trend` | Segment opened by a `bear_reversal` `K2`, through the next opposite `K2` or the last bar (`classifySwingTrend`) |
| `trading_range` | Neither clear HH+HL nor LH+LL |
| `unclear` | Insufficient structure / data |
| `bull_reversal` | Confirmed bull reversal (bearish K1, lower-low K2, later HH+HL) |
| `bear_reversal` | Confirmed bear reversal (bullish K1, higher-high K2, later LH+LL) |
| `no_reversal` | Enough bars to scan, no reversal confirmed |

```ts
type AnalysisLabel =
  | "bull_trend"
  | "bear_trend"
  | "trading_range"
  | "unclear"
  | "bull_reversal"
  | "bear_reversal"
  | "no_reversal";
  // extend per function (document in docs/spec + here)
```

Functions may introduce new labels; never overload an existing label with a different meaning.

## AnalyzeResult

One detected structure. A function may return several.

```ts
type AnalyzeResult = {
  /** Classification for this structure (formerly top-level label) */
  name: AnalysisLabel;
  /** Time span of this structure (not necessarily the full input window) */
  range: { start: TimeString; end?: TimeString };
  levels: Level[];
};
```

## AnalysisResult

```ts
type AnalysisResult<TEvidence = unknown> = {
  functionId: string;
  results: AnalyzeResult[];
  /** Filled from the function’s summary template only */
  summary: string;
  /** Deterministic code path — always 1 for now */
  confidence: 1;
  /**
   * Function-specific extras not expressible as named levels.
   * Prefer a minimal object (or empty) when geometry fits in results/summary.
   */
  evidence: TEvidence;
};
```

### Field notes

- No `symbol` / `timeframe` on the result — instrument context stays with the caller (analyzers receive only `Bar[]`).
- `results`: required array. Each item carries `name`, `range`, and `levels`. `summary`, `confidence`, and `evidence` stay on the outer result and are shared.
- `range`: for a trend segment, typically from earliest used swing bar to latest used swing bar (or last bar of the structure). Define precisely in each `docs/spec`.
- `levels`: geometric authority for named anchors (`name` + `price` + `time`). Use `[]` only if that structure has no points.
- Insufficient structure still returns an `AnalyzeResult` whose `name` is a defined label (e.g. `unclear`). Do not use an empty `results` array in place of that label.
- `evidence`: always present, JSON-serializable; put only facts that cannot be derived from `results` / `summary` (e.g. resolved params, scores, counts). Schema is per function in `docs/spec`.

## Standard analyzer input

Analyzers receive MT5-aligned bars (same shape as `/bars` `data[]` / `src/types/bars.ts`). They do **not** fetch data.

```ts
type Bar = {
  time: UnixSeconds;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume?: number;
  spread?: number;
  real_volume?: number;
};
```

Every public analyzer:

```ts
(bars: Bar[], options?: TOptions) => AnalysisResult<TEvidence>
```

Prefer **sync** return (no I/O inside analyzers). `options` is function-specific; omit when unused.
