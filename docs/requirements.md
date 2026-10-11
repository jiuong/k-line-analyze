# Requirements

Parent goal: [`goal.md`](goal.md).

Status legend for “现状”: `done` | `partial` | `todo`.

---

## FR-1 Data (fetch + local persistence)

Module spec: [`specification/data.md`](specification/data.md).  
Architecture: [`architecture/data.md`](architecture/data.md).

### Intent

Load OHLC bars for `symbol + timeframe` over a time window (or last-N), persist after a successful MT5 pull, and serve later calls from local storage when possible (including offline).

### Inputs

| Field | Required | Notes |
|-------|----------|-------|
| `symbol` | yes | MT5 alias rules apply in the client |
| `timeframe` | yes | Aligned with MT5 `TimeFrame` |
| `start` | yes* | Window start (`TimeString` or Unix seconds) |
| `end` | no | Omit = now |
| `count` | no | Last-N mode when used instead of / with range per client rules |

\*Count-only pulls may omit an explicit start when the API supports it (see `fetchBars` / pull-bars CLI).

### Behaviors

1. **Fetch** — Use the shared MT5 client ([`src/data/fetchBars.ts`](../src/data/fetchBars.ts)). Accept responses with `meta.degraded` (local fallback on the service). Propagate network / 4xx / 5xx; never invent bars.
2. **Persist** — After a successful pull, write bars into this project’s local store for fast reuse and offline use.
3. **Read path** — Prefer local hit → on miss or explicit refresh, call MT5 → write back local.
4. **Offline** — If MT5 is unavailable and local data covers the query window, return that data for analysis / chart consumers.
5. **Keying** — Retrievable at least by `symbol + timeframe + time range` (exact store schema left to the implementation task).
6. **Git** — Large local dumps stay gitignored; do not commit bulk bar files.

### Current vs target

| Piece | 现状 | Notes |
|-------|------|-------|
| HTTP fetch | done | `fetchBars` + unit tests (mocked) |
| CLI dump / fixture load | done | [`scripts/pull-bars.ts`](../scripts/pull-bars.ts) → `writeBarsFixture` |
| Product local persist + read-through / offline | done | [`loadBars`](../src/data/loadBars.ts) + JSON under `testdata/bars/` |

Storage engine for product persist: **JSON files** (see architecture / tasks); not SQLite in this phase.

### Acceptance

| # | Criterion |
|---|-----------|
| A1 | Range and “to now” (omit end) pulls succeed against MT5 when available |
| A2 | Successful pull leaves data readable from local store without a second MT5 call |
| A3 | With MT5 down and local coverage present, load still succeeds |
| A4 | Unit tests use mock HTTP / local fixtures; no live MT5 in CI unit tests |

Contract digest: skill [`mt5-bars-contract.md`](../.cursor/skills/kline-analyze-fn/references/mt5-bars-contract.md) (source: `D:\code\services\mt5\docs\API.md`).

---

## FR-2 Price-action analysis (composable functions)

Module spec: [`specification/analyze.md`](specification/analyze.md).  
Architecture: [`architecture/analyze.md`](architecture/analyze.md).

### Intent

Split price-action detection into multiple analysis functions. Each may depend on helpers or prior results; all share one return shape for chaining and for FR-3.

### Rules

1. One capability → one exported function + authoritative [`docs/spec/<functionId-kebab>.md`](spec/).
2. Public I/O: `(bars: Bar[], options?) => AnalysisResult` — `Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../src/types/bars.ts)); see skill [`types-contract.md`](../.cursor/skills/kline-analyze-fn/references/types-contract.md). Analyzers do not fetch bars.
3. Geometry authority: `results[].levels` (`Level`: `name`, `price`, `time`). Classification: `results[].name`. Non-derivable facts: `evidence`. Summaries from templates only. `summary` / `confidence` / `evidence` stay on the outer `AnalysisResult`.
4. Spec documents dependencies (e.g. swing helper → `classifySwingTrend`). Reuse shared logic under `src/utils/`; do not copy.
5. Chaining: downstream may consume upstream `AnalysisResult` and/or shared helpers. No mandatory pipeline framework; return shape must stay stable and JSON-serializable.
6. Generate new functions via skill [`kline-analyze-fn`](../.cursor/skills/kline-analyze-fn/SKILL.md).

### Seed function

| functionId | Spec | 现状 |
|------------|------|------|
| `classifySwingTrend` | [`spec/classify-swing-trend.md`](spec/classify-swing-trend.md) | spec only |

This phase (types + scaffolding): `scaffold-types`, `util-fill-summary`, `scaffold-analyze-module` — **done** (see [`project-tasks.md`](project-tasks.md)).  
Analyzer impl (`util-swings`, `impl-classify-swing-trend`) is **deferred** to later function tasks.

### Acceptance

| # | Criterion |
|---|-----------|
| B1 | Each public analyzer has `docs/spec` + matching export / tests |
| B2 | Results conform to `AnalysisResult`; new labels/levels update types-contract + `src/types` |
| B3 | Unit tests inject `Bar[]`; “no pattern” → `results` item with a defined `name` (e.g. `unclear`), not throw |
| B4 | Shared swing/time helpers are reused, not duplicated per function |

---

## FR-3 Chart render + annotation (third-party library)

Module spec: [`specification/chart.md`](specification/chart.md).  
Architecture: [`architecture/chart.md`](architecture/chart.md).

### Intent

Show the same query window’s candles and overlay analysis markers (`results[].levels`, optional range, name/summary).

### Implementation strategy (confirmed)

- **Library:** `@trading-playback/kline-chart` (pure TS, host `canvas`). Install via `file:` to the local package (`chart-dep-kline-chart`; not `workspace:*`).
- **Rendering** is `setBars` after mapping `Bar[]` → `KlineBar` (East-8 `+08:00` times). **Annotation** is a `layer_drawings` overlay, not a native marker API.
- **Modes:** static snapshot, or live candle refresh by calling `setBars` again. Do not use playback (`setPlaybackStatus`).
- Analyzers must not depend on the chart package.

### Integration boundary

| Side | Responsibility |
|------|----------------|
| This repo | Bars for the window + one or more `AnalysisResult` (`results[].levels`, `range`, `name` / `summary`); caller holds `symbol` / `timeframe` |
| `@trading-playback/kline-chart` | Candles, axes, crosshair, coordinate conversion, overlay paint slots |
| Thin adapter | `mount` / `setBars` / `registerOverlay('layer_drawings')`; times converted to `+08:00`; anchor remains bar open |

### Acceptance (after library integration)

| # | Criterion |
|---|-----------|
| C1 | Given fixture bars + fixed `AnalysisResult`, `layer_drawings` marks match `results[].levels` entries 1:1 |
| C2 | Query window (symbol / timeframe / range) matches the candles from `setBars` |
| C3 | Analysis packages remain importable without chart dependencies |
| C4 | Window refresh updates candles via `setBars` only; playback status is never set |

Tasks: Linear [JIU-301](https://linear.app/jiuong/issue/JIU-301/fr-3-chart-k-line-analyze); `chart-dep-kline-chart`…`chart-adapter-host` in [`project-tasks.md`](project-tasks.md).

---

## Non-functional requirements

| ID | Requirement |
|----|-------------|
| N1 | TypeScript, Node.js 18+ |
| N2 | Deterministic analyzers: `confidence: 1` until product rules change |
| N3 | New feature ⇒ tests; capability change ⇒ update related docs / `docs/spec` |
| N4 | Call only trusted / configured `MT5_BASE_URL`; never commit secrets or bulk bar dumps |
| N5 | Prefer reuse of existing modules (`fetchBars`, time utils, skill contracts) |

---

## Out of scope (this requirements baseline)

- Full trading terminal / order routing
- WebSocket tick or bar push
- Complete catalog of all price-action patterns (only the split rules + seed function)
- Playback / scrubbing UI (chart is static or live-updated candles only)
- SQLite (or other non-JSON) local store engines in this phase

---

## Traceability

| Requirement | Tasks / code |
|-------------|----------------|
| FR-1 fetch | `scaffold-fetchBars` (done), `pull-bars-cli-fixture` (done) |
| FR-1 persist product | `persist-store-schema`, `persist-coverage`, `persist-read-through` (done); `persist-local-bars` superseded |
| FR-2 this phase | `scaffold-types`, `util-fill-summary`, `scaffold-analyze-module` (done) |
| FR-2 analyzers | `util-swings`, `impl-classify-swing-trend` (deferred) |
| FR-3 | Linear [JIU-301](https://linear.app/jiuong/issue/JIU-301/fr-3-chart-k-line-analyze); `chart-dep-kline-chart`…`chart-adapter-host` (todo); `viz-third-party-chart` superseded |
| Docs baseline | `docs-goal-requirements` (done) |
| Module specs | `docs-specification-modules` (done) — [`specification/`](specification/) |
| Data architecture | `docs-architecture-data` (done) — [`architecture/data.md`](architecture/data.md) |
| Analyze architecture | `docs-architecture-analyze` (done) — [`architecture/analyze.md`](architecture/analyze.md) |
| Chart architecture | `docs-architecture-chart` (done) — [`architecture/chart.md`](architecture/chart.md) |
