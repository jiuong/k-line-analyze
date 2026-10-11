# Generation checklist

Use before marking an analyzer task done.

## Spec

- [ ] `docs/spec/<functionId-kebab>.md` created or updated (authoritative)
- [ ] Intent, params, algorithm steps, edges documented
- [ ] `results[].name` (`AnalysisLabel`) set and `LevelName`s listed
- [ ] `summary` template + example fill documented
- [ ] `evidence` draft fields documented (even if provisional)
- [ ] Dependencies listed with exists / create / blocked

## Types & reuse

- [ ] New `AnalysisLabel` / `LevelName` values added to [types-contract.md](types-contract.md) (and `src/types` if present)
- [ ] Reused existing helpers; no duplicated swing/time/summary logic
- [ ] No raw HTTP / `fetchBars` inside `src/analyze/*`

## Data

- [ ] Public input is MT5-aligned `Bar[]` (+ optional `options`); loading is outside the analyzer
- [ ] Times converted correctly (Unix on `Bar.time`, `TimeString` in `results[].levels` / `results[].range`)

## Implementation

- [ ] Returns full `AnalysisResult` with `confidence: 1` (no `symbol` / `timeframe` fields)
- [ ] `summary` built only from the declared template
- [ ] `results[].levels` / `range` match algorithm description in spec

## Tests

- [ ] Unit tests with synthetic `Bar[]` injected directly
- [ ] Cases: positive pattern, opposite pattern, range/unclear, insufficient data
- [ ] Assertions on `results[].name`, key `levels`, `summary`, `confidence`

## Docs / tasks

- [ ] Related README / project docs updated if user-facing behavior changed
- [ ] Scaffolding gaps recorded in `docs/project-tasks.md` when not implemented in this change
