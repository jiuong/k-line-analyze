# Module: Analyze (FR-2)

Maps to: [`../requirements.md`](../requirements.md) § FR-2.  
Parent goal: [`../goal.md`](../goal.md).

## Purpose

Split price-action detection into composable analysis functions. Each may depend on shared helpers or prior results; all share one I/O contract for chaining and for the chart module (FR-3).

## Responsibilities & non-goals

| In scope | Out of scope |
|----------|--------------|
| Unified `Bar[]` (+ optional `options`) → `AnalysisResult` | Chart / UI dependencies inside analyzers |
| Shared helpers under `src/utils/` | Mandatory pipeline framework |
| Per-function authoritative specs in `docs/spec/` | Full catalog of every PA pattern in this module doc |
| Deterministic classification (`confidence: 1`) | Fetching bars / inventing OHLC inside analyzers |

## Shared contract across all analysis functions

This section is the **common part** for every K-line analyzer. Per-function algorithms (pivots, label sets, summary templates) live only in [`../spec/`](../spec/).

Authoritative digests:

- [`.cursor/skills/kline-analyze-fn/references/types-contract.md`](../../.cursor/skills/kline-analyze-fn/references/types-contract.md)
- [`.cursor/skills/kline-analyze-fn/references/function-contract.md`](../../.cursor/skills/kline-analyze-fn/references/function-contract.md)

### Unified I/O

```ts
(bars: Bar[], options?: TOptions) => AnalysisResult<TEvidence>
```

**Input**

Caller supplies the candle array (and optional function knobs). Analyzers do **not** call `fetchBars`; the data module / caller owns loading.

```ts
// Bar — same shape as MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts))
type Bar = {
  time: UnixSeconds; // UTC Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume?: number;
  spread?: number;
  real_volume?: number;
};
```

| Argument | Required | Notes |
|----------|----------|-------|
| `bars` | yes | MT5-aligned `Bar[]` |
| `options` | no | Function-specific knobs (`TOptions`) |

Instrument context (`symbol` / `timeframe`) stays with the caller; it is not part of analyzer input or `AnalysisResult`.

**Output (`AnalysisResult`)**

| Field | Role |
|-------|------|
| `functionId` | Constant matching the export name |
| `results` | Detected structures: `AnalyzeResult[]` |
| `summary` | Filled from the function’s summary template only |
| `confidence` | Always `1` until product rules change |
| `evidence` | Always present; only facts not derivable from `results` / `summary` |

`summary`, `confidence`, and `evidence` stay on the outer result and are shared across every item in `results`.

```ts
type AnalyzeResult = {
  name: AnalysisLabel; // formerly top-level label
  range: { start: TimeString; end?: TimeString }; // formerly top-level range
  levels: Level[];
};

type Level = {
  name: LevelName; // string-literal enum
  price: number;
  time: TimeString; // bar open time
};
```

### Naming & file layout

| Item | Convention |
|------|------------|
| Export / `functionId` | camelCase (e.g. `classifySwingTrend`) |
| Implementation | `src/analyze/<functionId>.ts` |
| Unit tests | `tests/analyze/<functionId>.test.ts` |
| Authoritative function spec | `docs/spec/<functionId-kebab>.md` |

### Standard execution steps

1. Validate `bars` (and `options` when present).
2. Run **pure** analysis on bars (and any shared helpers).
3. Assemble `AnalysisResult`: `results` (`name`, `range`, `levels`), template summary, evidence, `confidence: 1`.

### Levels, labels, evidence, summary

- **Geometry** lives in `results[].levels`. Each `Level` is `{ name, price, time }`. `time` is the bar open as `TimeString` unless a function spec says otherwise; `price` semantics are per `LevelName` in that spec. The type does not force unique `name` values.
- **Classification** lives in `results[].name` (`AnalysisLabel`). Never overload an existing label with a new meaning. One function may return multiple `AnalyzeResult` items.
- **Evidence** holds resolved params, scores, counts, thresholds — not a duplicate of swing lists already implied by `results`.
- **Summary** is produced only via the function’s template + shared `fillSummary`. No free-form prose. Templates use result names and level times; they do **not** require `symbol` / `timeframe`.

### Shared dependencies

| Dependency | Role |
|------------|------|
| Caller / data module | Supply `Bar[]` (`fetchBars` / fixture load outside analyzers) |
| `src/utils/time.ts` | `TimeString` ↔ Unix seconds (for `results[].levels` / `results[].range`) |
| `src/utils/*` helpers | Swings, pivots, `fillSummary`, etc. |
| `src/types` (planned beyond bars) | Mirror skill types-contract |

Reusable logic must be extracted once under `src/utils/`. **Do not copy** the same algorithm into multiple analyzers.

### Chaining

- Downstream functions may read an upstream `AnalysisResult` and/or call shared helpers.
- No required pipeline runtime; results must stay JSON-serializable for FR-3 and external consumers.

### Errors & “no pattern”

| Case | Behavior |
|------|----------|
| Invalid args (e.g. non-array `bars`) | Throw typed error (or project Result type once standardized) |
| Empty / insufficient structure | Return `AnalysisResult` with a `results` item whose `name` is a defined label (e.g. `unclear`); **do not throw**. Do not use an empty `results` array in place of that label |

### Extending the module

1. Add or update `docs/spec/<functionId-kebab>.md`.
2. If new `AnalysisLabel` / `LevelName` values are needed: update types-contract, `src/types`, and the function spec in the same change.
3. Prefer generating via skill [`kline-analyze-fn`](../../.cursor/skills/kline-analyze-fn/SKILL.md).

## Per-function specs (index only)

Algorithm details are **not** duplicated here.

| functionId | Spec | 现状 |
|------------|------|------|
| `classifySwingTrend` | [`../spec/classify-swing-trend.md`](../spec/classify-swing-trend.md) | spec only |

## Public surface (code map)

| Path | Status |
|------|--------|
| `src/analyze/*` skeleton | done (`scaffold-analyze-module`) — `index.ts` + `AnalyzerFn`; no concrete analyzers yet |
| `src/types` analysis enums / `AnalysisResult` | done (`scaffold-types`) — `src/types/analysis.ts` |
| `src/utils/time.ts` | done |
| `src/utils/summary.ts` | done (`util-fill-summary`) |
| `src/utils/swings.ts` | deferred (`util-swings`) |
| Skill `kline-analyze-fn` | done |

## Current vs target

| Piece | 现状 | Notes |
|-------|------|-------|
| Types / shared `AnalysisResult` | done | `src/types/analysis.ts` |
| Summary helper | done | `src/utils/summary.ts` (`fillSummary`) |
| Analyze module skeleton | done | `src/analyze/index.ts`; no concrete analyzers |
| Swing helper + `classifySwingTrend` | deferred | Separate analyzer function tasks later |

## Acceptance (from requirements)

| # | Criterion |
|---|-----------|
| B1 | Each public analyzer has `docs/spec` + matching export / tests |
| B2 | Results conform to `AnalysisResult` (`results: AnalyzeResult[]`); new labels/levels update types-contract + `src/types` |
| B3 | Unit tests inject `Bar[]`; “no pattern” → `results` item with a defined `name` (e.g. `unclear`), not throw |
| B4 | Shared swing/time helpers are reused, not duplicated |

## Related

- Architecture: [`../architecture/analyze.md`](../architecture/analyze.md)  
- Requirements: [`../requirements.md`](../requirements.md) FR-2  
- Tasks: [`../project-tasks.md`](../project-tasks.md) (FR-2 this phase scaffolding: done)  
- Module index: [`README.md`](README.md)
