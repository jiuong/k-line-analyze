---
name: kline-analyze-fn
description: >-
  Generate K-line (candlestick) analysis functions from intent for this repo.
  Use when the user asks to add/generate a K-line analysis function, pattern
  detector, trend classifier, swing/level finder, or any OHLC-based analyzer
  that accepts MT5-aligned Bar[] and returns a unified AnalysisResult.
---

# K-line analysis function generator

Read these references before implementing:

1. [references/mt5-bars-contract.md](references/mt5-bars-contract.md) — bar shape / data source for callers
2. [references/types-contract.md](references/types-contract.md) — shared types / enums
3. [references/function-contract.md](references/function-contract.md) — inputs, deps, summary templates
4. [references/generation-checklist.md](references/generation-checklist.md) — acceptance checklist
5. Authoritative function specs live under [`docs/spec/`](../../../docs/spec/) (not only skill examples)

## When to use

- User provides a **function intent** (natural language) for market-structure / pattern / trend analysis
- User asks to implement or extend analyzers that take `Bar[]` (+ optional `options`) and return `AnalysisResult`
- User asks to add labels, levels, or summary templates for an analysis function

## Hard rules

- **Do not** call MT5 HTTP or `fetchBars` from inside analysis functions. Caller / data module supplies `Bar[]`.
- If swing helpers / enums / types are missing, **list the dependency gap first** (and implement the dependency, or record it in `docs/project-tasks.md`) before finishing the analyzer.
- Every function returns the shared `AnalysisResult` shape; `confidence` is always `1`.
- `summary` **must** use the function’s declared string template — no free-form long prose.
- Authoritative function description: **`docs/spec/<functionId-kebab>.md`**. Skill `examples/` are templates only.
- Prefer TypeScript pure analysis over bars; reuse existing helpers; do not duplicate logic.
- New feature ⇒ corresponding tests (synthetic OHLCV injected as `Bar[]`; no live MT5 in unit tests).
- Update related docs (`docs/spec/…`, and types contract if enums grow).

## Forced workflow

```text
intent → clarify I/O & edges → list deps → fill gaps →
algorithm + label/levels/summary template → implement → tests → docs/spec
```

### 1. Clarify intent

Capture:

| Field | Required |
|-------|----------|
| `functionId` (camelCase export) | yes |
| Spec filename `docs/spec/<kebab>.md` | yes |
| `options` knobs beyond bare `Bar[]` | yes (may be none) |
| Output `results[].name` (`AnalysisLabel`) set | yes |
| `results[].levels` LevelNames used | yes if points matter |
| `summary` template | yes |
| `evidence` draft fields | yes (may stay provisional) |

Ask the user only when a decision would change algorithm or public API. Otherwise pick a sensible default, state it in the spec, and proceed.

### 2. List dependencies

Always include:

- Caller-supplied `Bar[]` (MT5 shape — see mt5-bars-contract / `src/types/bars.ts`)
- Shared types: `Bar`, `Level`, `LevelName`, `AnalysisLabel`, `AnalyzeResult`, `AnalysisResult`, `TimeString`
- Any pure helpers (e.g. swing high/low detection)

Mark each as: **exists** / **must create** / **blocked**.

### 3. Write or update `docs/spec/<functionId-kebab>.md`

Must include: intent, params, deps, algorithm steps, labels, levels, summary template, evidence draft, test cases outline.

Mirror a short pointer in skill `examples/` only when introducing a new canonical pattern for the skill itself.

### 4. Implement

Target layout (when scaffolding exists):

```text
src/
  types/analysis.ts          # shared result / enums
  data/fetchBars.ts          # used by callers / CLI, not analyzers
  analyze/<functionId>.ts    # analyzer: (bars, options?) => AnalysisResult
  utils/…                    # shared pure helpers
tests/
  analyze/<functionId>.test.ts
```

If `src/` does not exist yet, create the minimal modules needed for the function **or** stop after the spec and record the scaffolding gap in `docs/project-tasks.md` when the user asked for skill/spec-only work.

### 5. Tests

- Synthetic bars that encode the pattern (bull / bear / range / edge cases)
- Inject `Bar[]` directly; assert `results[].name`, `levels`, `range`, `summary` (template fill), `confidence === 1`

### 6. Docs sync

- Update `docs/spec/<…>.md` if behavior changed
- Extend `LevelName` / `AnalysisLabel` lists in [types-contract.md](references/types-contract.md) and future `src/types` when adding new values

## Example intent

See [examples/classify-swing-trend.md](examples/classify-swing-trend.md) and authoritative [docs/spec/classify-swing-trend.md](../../../docs/spec/classify-swing-trend.md).
