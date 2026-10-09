# Function contract

How to turn an intent into a consistent analyzer.

## Public API pattern

```ts
export async function classifySwingTrend(
  params: AnalyzeParams<{ swingStrength?: number }>
): Promise<AnalysisResult<SwingTrendEvidence>>;
```

- Export name = `functionId` (camelCase)
- File: `src/analyze/<functionId>.ts` (when `src/` exists)
- Spec: `docs/spec/<functionId-kebab>.md` (kebab-case filename)

## Required behavior

1. Resolve time window → call `fetchBars` once (or document why more).
2. Run pure analysis on `Bar[]`.
3. Build `AnalysisResult`:
   - `functionId` constant matching export
   - `symbol` / `timeframe` echoed from input (prefer `meta.symbol` from client if alias-resolved)
   - `range` / `levels` from detected structure (`levels` values are `{ time, price }`)
   - `label` from allowed set for that function
   - `confidence: 1`
   - `summary` via template fill only
   - `evidence` for extras not expressible as levels (minimal / empty when unused)

## Dependency checklist (per function)

| Dependency | Role |
|------------|------|
| `fetchBars` | OHLC foundation |
| time utils | `TimeString` ↔ Unix seconds |
| pure helpers | swings, pivots, etc. (shared under `src/utils/`) |
| types | `TimeFrame`, `LevelName`, `AnalysisLabel`, `AnalysisResult` |

If a helper is reusable (e.g. swing detection), extract once; do not copy into each analyzer.

## Summary templates

Each `docs/spec` defines:

1. Template string with `{placeholders}`
2. Allowed placeholder set
3. Example filled output

Rules:

- Short, factual, LLM-readable
- Include `symbol`, `timeframe`, `label`, and key level times (from `levels.*.time`) when relevant
- No markdown essays; one or two sentences

Example pattern:

```text
{symbol} {timeframe} structure={label}; H1@{H1} H2@{H2} L1@{L1} L2@{L2}
```

Implement a tiny `fillSummary(template, vars)` helper when scaffolding exists; reuse it.

## Label & level ownership

- Function spec lists **exact** `AnalysisLabel` and `LevelName` values it may emit
- New values ⇒ update [types-contract.md](types-contract.md) in the same change

## Evidence

- Always attach a structured `evidence` object (never omit the field)
- Prefer `levels` + `label` for geometry and classification; put in `evidence` only facts that cannot be derived from them (resolved params, scores, counts, thresholds)
- Prefer a minimal object when the function has little or no extra state; do not duplicate swing lists or rule tags already implied by `levels` / `label`
- Prefer numbers/times/flags over prose; schema is per function in `docs/spec`

## Errors

- Invalid params → throw typed error (or Result type once project standard exists)
- Empty bars / insufficient swings → still return `AnalysisResult` with `label: "unclear"` when that is a defined outcome; do not throw for “no pattern”
- Propagate `fetchBars` failures (network / 4xx / 5xx) — do not invent bars

## Target module layout

```text
src/
  types/analysis.ts
  data/fetchBars.ts
  utils/time.ts
  utils/summary.ts
  utils/swings.ts          # when needed
  analyze/<functionId>.ts
tests/
  analyze/<functionId>.test.ts
docs/spec/<functionId-kebab>.md
```
