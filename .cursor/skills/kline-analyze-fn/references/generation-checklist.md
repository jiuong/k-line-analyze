# Generation checklist

Use before marking an analyzer task done.

## Spec

- [ ] `docs/spec/<functionId-kebab>.md` created or updated (authoritative)
- [ ] Intent, params, algorithm steps, edges documented
- [ ] `label` set and `LevelName`s listed
- [ ] `summary` template + example fill documented
- [ ] `evidence` draft fields documented (even if provisional)
- [ ] Dependencies listed with exists / create / blocked

## Types & reuse

- [ ] New `AnalysisLabel` / `LevelName` values added to [types-contract.md](types-contract.md) (and `src/types` if present)
- [ ] Reused existing helpers; no duplicated swing/time/summary logic
- [ ] No raw HTTP inside `src/analyze/*`

## Data

- [ ] Uses `fetchBars` with `symbol` + `timeframe` + `from`/`to` or `count`
- [ ] Times converted correctly (Unix for MT5, `TimeString` in result)
- [ ] Symbol alias / `%2B` handled in client, not ad hoc in analyzer

## Implementation

- [ ] Returns full `AnalysisResult` with `confidence: 1`
- [ ] `summary` built only from the declared template
- [ ] `levels` / `range` match algorithm description in spec

## Tests

- [ ] Unit tests with synthetic bars + mocked `fetchBars`
- [ ] Cases: positive pattern, opposite pattern, range/unclear, insufficient data
- [ ] Assertions on `label`, key `levels`, `summary`, `confidence`

## Docs / tasks

- [ ] Related README / project docs updated if user-facing behavior changed
- [ ] Scaffolding gaps recorded in `docs/project-tasks.md` when not implemented in this change
