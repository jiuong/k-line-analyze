# Function contract

How to turn an intent into a consistent analyzer.

## Public API pattern

```ts
export function classifySwingTrend(
  bars: Bar[],
): AnalysisResult<Record<string, never>>;
```

- Export name = `functionId` (camelCase)
- File: `src/analyze/<functionId>.ts` (when `src/` exists)
- Spec: `docs/spec/<functionId-kebab>.md` (kebab-case filename)
- Input bars = MT5 `/bars` `data[]` shape (`src/types/bars.ts`)
- Prefer sync; caller / data module owns `fetchBars` / fixtures

## Required behavior

1. Validate `bars` (and `options` when present).
2. Run pure analysis on `Bar[]` (and shared helpers).
3. Build `AnalysisResult`:
   - `functionId` constant matching export
   - `results`: one or more `AnalyzeResult` (`name`, `range`, `levels` as `Level[]`)
   - `confidence: 1`
   - `summary` via template fill only
   - `evidence` for extras not expressible as levels (minimal / empty when unused)

## Dependency checklist (per function)

| Dependency | Role |
|------------|------|
| Caller-supplied `Bar[]` | OHLC foundation (loaded outside analyzer) |
| time utils | `TimeString` ↔ Unix seconds (for `results[].levels` / `results[].range`) |
| pure helpers | swings, pivots, etc. (shared under `src/utils/`) |
| types | `Bar`, `Level`, `LevelName`, `AnalysisLabel`, `AnalyzeResult`, `AnalysisResult` |

If a helper is reusable (e.g. swing detection), extract once; do not copy into each analyzer.

## Summary templates

Each `docs/spec` defines:

1. Template string with `{placeholders}`
2. Allowed placeholder set
3. Example filled output

Rules:

- Short, factual, LLM-readable
- Include each structure’s `name` and key level times (from `results[].levels`) when relevant
- Do **not** require `symbol` / `timeframe` (caller holds instrument context)
- No markdown essays; one or two sentences

Example pattern:

```text
trends={count}; last={lastName} from={from} to={to}
```

Reuse `fillSummary(template, vars)` from `src/utils/summary.ts` (missing/`null`/`undefined` keys throw).

## Label & level ownership

- Function spec lists **exact** `AnalysisLabel` and `LevelName` values it may emit
- New values ⇒ update [types-contract.md](types-contract.md) in the same change

## Evidence

- Always attach a structured `evidence` object (never omit the field)
- Prefer `results[].levels` + `results[].name` for geometry and classification; put in `evidence` only facts that cannot be derived from them (resolved params, scores, counts, thresholds)
- Prefer a minimal object when the function has little or no extra state; do not duplicate swing lists or rule tags already implied by `results`
- Prefer numbers/times/flags over prose; schema is per function in `docs/spec`

## Errors

- Invalid args → throw typed error (or Result type once project standard exists)
- Empty bars / insufficient swings → still return `AnalysisResult` with a `results` item whose `name` is `"unclear"` when that is a defined outcome; do not throw for “no pattern”
- Analyzers never call `fetchBars`; fetch failures are handled by the caller / data module

## Target module layout

```text
src/
  types/analysis.ts
  data/fetchBars.ts          # caller / data module only
  utils/time.ts
  utils/summary.ts
  utils/swings.ts          # when needed
  analyze/<functionId>.ts
tests/
  analyze/<functionId>.test.ts
docs/spec/<functionId-kebab>.md
```
