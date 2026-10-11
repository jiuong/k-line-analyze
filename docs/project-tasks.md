# Project tasks

Local tracker when Linear is unavailable. Status: `todo` | `doing` | `done` | `blocked` | `deferred` | `superseded`.

Product goal / requirements: [`goal.md`](goal.md), [`requirements.md`](requirements.md).

Architecture: [`architecture/data.md`](architecture/data.md), [`architecture/analyze.md`](architecture/analyze.md), [`architecture/chart.md`](architecture/chart.md).

## Parent: Docs & product baseline

| ID | Task | Status | Notes |
|----|------|--------|-------|
| docs-goal-requirements | Goal + requirements docs | done | `docs/goal.md`, `docs/requirements.md` |
| docs-specification-modules | Module specs under `docs/specification/` | done | `data` / `analyze` / `chart` + README index |
| docs-architecture-data | Data module architecture doc | done | lean arc42; callers load `Bar[]`, analyzers stay fetch-free |
| docs-architecture-analyze | Analyze module architecture doc | done | lean arc42; `Bar[]` → `AnalysisResult`; pure, no fetch |
| docs-architecture-chart | Chart module architecture doc | done | lean arc42; `@trading-playback/kline-chart`; `setBars` + `layer_drawings`; no playback |

## Parent: FR-1 Data (MT5 + local persist)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| scaffold-fetchBars | MT5 bars HTTP client | done | `src/data/fetchBars.ts` + mock tests |
| pull-bars-cli-fixture | CLI pull + local fixture loader | done | `scripts/pull-bars.ts`, `testdata/bars/` gitignored |
| docs-local-testdata | README + contract local fixture notes | done | |
| persist-store-schema | Local JSON store layout + write API | done | `src/data/barsStore.ts`; CLI uses `writeBarsFixture`; root `testdata/bars/` |
| persist-coverage | Query-window coverage check | done | `src/data/barsCoverage.ts` — v1 endpoint coverage (`barsCoverQuery`) |
| persist-read-through | Read-through + offline load | done | `src/data/loadBars.ts` — local hit / refresh / write-back / offline; mock tests |
| persist-local-bars | *(umbrella)* Product persist + read-through / offline | superseded | Split into `persist-store-schema`, `persist-coverage`, `persist-read-through`. Engine = JSON files |

Order: `persist-store-schema` → `persist-coverage` → `persist-read-through`.

## Parent: FR-2 Analyze (price action)

### This phase (public types + scaffolding)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| skill-kline-analyze-fn | Project Cursor skill for generating analyzers | done | `.cursor/skills/kline-analyze-fn/` |
| spec-classify-swing-trend | Spec for swing trend classifier | done | `docs/spec/classify-swing-trend.md` — reversal K2 segments; see `impl-classify-swing-trend` |
| scaffold-pkg-types | Node/TS/Vitest + bars types (`Bar`/`TimeFrame`) | done | `package.json`, `src/types/bars.ts` |
| docs-analyze-input-bars | Analyze Input = MT5 `Bar[]`; sync contracts | done | Drop `AnalyzeParams`; analyzers sync; no internal fetch |
| scaffold-types | Shared `AnalysisResult` / enums in `src/types` | done | `src/types/analysis.ts` mirrors skill types-contract; no `symbol`/`timeframe` on result |
| util-fill-summary | `fillSummary(template, vars)` helper | done | `src/utils/summary.ts` — `{key}` placeholders; missing/nullish throws |
| reshape-analysis-result | Move `range` / `levels` / `label` into `results: AnalyzeResult[]` | done | Breaking for the result type: `LevelPoint` removed; `Level` is `{ name, price, time }`. No concrete analyzers yet. No FR-2 Linear parent — tracked here |
| scaffold-analyze-module | Analyze package skeleton | done | `src/analyze/index.ts` + `tests/analyze/`; `AnalyzerFn` export. Concrete analyzers landed in later tasks |
| util-time-summary | *(renamed)* summary fill helper | superseded | Replaced by `util-fill-summary` |

Order: `scaffold-types` ∥ `util-fill-summary` → `scaffold-analyze-module` → `reshape-analysis-result`.

### Deferred

| ID | Task | Status | Notes |
|----|------|--------|-------|
| util-swings | Shared swing high/low helper | deferred | `src/utils/swings.ts`; not required by `classifySwingTrend` |

### classifySwingTrend

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| impl-classify-swing-trend | Implement + unit tests | done | `src/analyze/classifySwingTrend.ts`. Each kept reversal opens `bull_trend` / `bear_trend` at its K2; the last segment ends on the last bar |

### classifyReversalSignal

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-classify-reversal-signal | Spec for reversal-signal classifier | done | `docs/spec/classify-reversal-signal.md` |
| impl-classify-reversal-signal | Implement + unit tests | done | `src/analyze/classifyReversalSignal.ts`; labels `bull_reversal` / `bear_reversal` / `no_reversal`; levels `K1` / `K2` / `Confirm`. Consecutive same-direction signals collapse to the later one |

## Parent: FR-3 Viz (third-party chart)

Linear: [JIU-301](https://linear.app/jiuong/issue/JIU-301/fr-3-chart-k-line-analyze).  
Specs: [`specification/chart.md`](specification/chart.md), [`architecture/chart.md`](architecture/chart.md). Acceptance: C1–C4 in [`requirements.md`](requirements.md) § FR-3.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| chart-dep-kline-chart | Wire `@trading-playback/kline-chart` | done | [JIU-302](https://linear.app/jiuong/issue/JIU-302/fr-3-chart-dep-kline-chart-wire-trading-playbackkline-chart). `file:` to kline-chart; `shared` via second `file:` + `overrides` (chart package uses `workspace:*`) |
| chart-util-east8-time | UTC → East-8 `+08:00` helper | done | [JIU-303](https://linear.app/jiuong/issue/JIU-303/fr-3-chart-util-east8-time-utc-east-8-0800-helper). `toEast8TimeString` in `src/utils/time.ts` |
| chart-map-bars-to-kline | `Bar[]` + `TimeFrame` → `KlineBar[]` | done | [JIU-304](https://linear.app/jiuong/issue/JIU-304/fr-3-chart-map-bars-to-kline-bar-timeframe-klinebar). `src/chart/mapBars.ts` |
| chart-overlay-analysis | `AnalysisResult` → `layer_drawings` | done | [JIU-305](https://linear.app/jiuong/issue/JIU-305/fr-3-chart-overlay-analysis-analysisresult-layer-drawings). `src/chart/overlayAnalysis.ts`; summary text is on the review sidebar |
| chart-adapter-host | Thin host API lifecycle | done | [JIU-306](https://linear.app/jiuong/issue/JIU-306/fr-3-chart-adapter-host-thin-host-api-lifecycle). `createChartHost` — `mount` / `setBars` / `setResults` / `unmount`; no playback |
| page-bars-api | Dev `GET /api/bars` via `loadBarsWithMeta` | done | [JIU-307](https://linear.app/jiuong/issue/JIU-307/fr-3-page-bars-api-dev-get-apibars-via-loadbarswithmeta). `src/page/barsHandler.ts` + Vite middleware |
| page-review-host | Vite canvas review page | done | [JIU-308](https://linear.app/jiuong/issue/JIU-308/fr-3-page-review-host-vite-canvas-review-page). `web/` + `npm run dev` |
| page-symbol-time | Symbol dropdown and calendar inputs | done | [JIU-313](https://linear.app/jiuong/issue/JIU-313/fr-3-page-symbol-time-symbol-list-and-calendar-inputs). `datetime-local` → UTC Unix seconds |
| page-trading-catalog | Symbol and timeframe lists from `trading.json` | done | [JIU-315](https://linear.app/jiuong/issue/JIU-315/fr-3-page-trading-catalog-symbols-and-timeframes-from-tradingjson). `GET /api/catalog`; first entries selected |
| page-chart-pointer | Library pointer interaction on the review host | done | [JIU-316](https://linear.app/jiuong/issue/JIU-316/fr-3-page-chart-pointer-attach-library-pointer-interaction). `attachPointerInteraction` from `createChartHost` |
| page-analysis-opt-in | Sidebar toggles analysis marks | done | [JIU-314](https://linear.app/jiuong/issue/JIU-314/fr-3-page-analysis-opt-in-sidebar-toggles-analysis-marks). `runReview(bars, enabledIds)`; default off |
| viz-third-party-chart | *(umbrella)* Integrate chart lib + overlay adapter | superseded | Split into `chart-dep-kline-chart`, `chart-util-east8-time`, `chart-map-bars-to-kline`, `chart-overlay-analysis`, `chart-adapter-host` |

Order: `chart-util-east8-time` ∥ `chart-dep-kline-chart` ∥ `page-bars-api` → `chart-map-bars-to-kline` → (`scaffold-types`) → `chart-overlay-analysis` → `chart-adapter-host` → `page-review-host`.

Out of scope this FR: playback, custom candle engine, indicator/trade layers, chart imports in analyze, pan/zoom/minimum candle size (those belong in `@trading-playback/kline-chart`).

## How to add tasks

One goal per row; keep scope reviewable and independently testable.
