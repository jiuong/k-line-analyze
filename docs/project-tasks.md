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
| spec-classify-swing-trend | Spec for swing trend classifier | done | `docs/spec/classify-swing-trend.md` — impl deferred |
| scaffold-pkg-types | Node/TS/Vitest + bars types (`Bar`/`TimeFrame`) | done | `package.json`, `src/types/bars.ts` |
| docs-analyze-input-bars | Analyze Input = MT5 `Bar[]`; sync contracts | done | Drop `AnalyzeParams`; analyzers sync; no internal fetch |
| scaffold-types | Shared `AnalysisResult` / enums in `src/types` | done | `src/types/analysis.ts` mirrors skill types-contract; no `symbol`/`timeframe` on result |
| util-fill-summary | `fillSummary(template, vars)` helper | done | `src/utils/summary.ts` — `{key}` placeholders; missing/nullish throws |
| reshape-analysis-result | Move `range` / `levels` / `label` into `results: AnalyzeResult[]` | done | Breaking for the result type: `LevelPoint` removed; `Level` is `{ name, price, time }`. No concrete analyzers yet. No FR-2 Linear parent — tracked here |
| scaffold-analyze-module | Analyze package skeleton | done | `src/analyze/index.ts` + `tests/analyze/`; `AnalyzerFn` export; **no** concrete analyzer impl |
| util-time-summary | *(renamed)* summary fill helper | superseded | Replaced by `util-fill-summary` |

Order: `scaffold-types` ∥ `util-fill-summary` → `scaffold-analyze-module` → `reshape-analysis-result`.

### Deferred (separate analyzer function tasks later)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| util-swings | Shared swing high/low helper | deferred | `src/utils/swings.ts`; open with a concrete analyzer task |
| impl-classify-swing-trend | Implement + unit tests | deferred | `(bars, options?) => AnalysisResult`; depends on types + fillSummary + swings |

## Parent: FR-3 Viz (third-party chart)

Linear: [JIU-301](https://linear.app/jiuong/issue/JIU-301/fr-3-chart-k-line-analyze).  
Specs: [`specification/chart.md`](specification/chart.md), [`architecture/chart.md`](architecture/chart.md). Acceptance: C1–C4 in [`requirements.md`](requirements.md) § FR-3.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| chart-dep-kline-chart | Wire `@trading-playback/kline-chart` | todo | [JIU-302](https://linear.app/jiuong/issue/JIU-302/fr-3-chart-dep-kline-chart-wire-trading-playbackkline-chart). **AC:** `package.json` `file:` → local `trading-playback/packages/kline-chart` (not `workspace:*`); install resolves; only `src/chart/` may import; README + chart docs state install path / import boundary |
| chart-util-east8-time | UTC → East-8 `+08:00` helper | todo | [JIU-303](https://linear.app/jiuong/issue/JIU-303/fr-3-chart-util-east8-time-utc-east-8-0800-helper). **AC:** Unix / UTC `TimeString` → `+08:00` ISO; unit tests on known timestamps; do not pass UTC-only `toTimeString` into the library. Reuse/extend `src/utils/time.ts` or place under `src/chart/` |
| chart-map-bars-to-kline | `Bar[]` + `TimeFrame` → `KlineBar[]` | todo | [JIU-304](https://linear.app/jiuong/issue/JIU-304/fr-3-chart-map-bars-to-kline-bar-timeframe-klinebar). **Depends:** east8 + dep. **AC:** mapper under `src/chart/`; OHLC + caller `timeframe` + east8 `time`; ignore volume; unit tests for OHLC / time / tf (`+08:00`) |
| chart-overlay-analysis | `AnalysisResult` → `layer_drawings` | todo | [JIU-305](https://linear.app/jiuong/issue/JIU-305/fr-3-chart-overlay-analysis-analysisresult-layer-drawings). **Depends:** east8 + FR-2 `scaffold-types`. **AC (C1):** each `results[].levels` entry → one mark + `Level.name` (bar open + east8); optional `results[].range` / name·summary; `requestRedraw` on change; unused: `layer_indicators` / `layer_trades` |
| chart-adapter-host | Thin host API lifecycle | todo | [JIU-306](https://linear.app/jiuong/issue/JIU-306/fr-3-chart-adapter-host-thin-host-api-lifecycle). **Depends:** map + overlay + dep. **AC (C2/C3/C4):** `mount` / `setBars` / `setResults` / refresh (`setBars` again) / `unmount`; never `setPlaybackStatus`; no `reset()` for normal refresh; analyze stays chart-free; update chart spec/arch status tables |
| viz-third-party-chart | *(umbrella)* Integrate chart lib + overlay adapter | superseded | Split into `chart-dep-kline-chart`, `chart-util-east8-time`, `chart-map-bars-to-kline`, `chart-overlay-analysis`, `chart-adapter-host` |

Order: `chart-util-east8-time` ∥ `chart-dep-kline-chart` → `chart-map-bars-to-kline` → (`scaffold-types`) → `chart-overlay-analysis` → `chart-adapter-host`.

Out of scope this FR: playback, custom candle engine, indicator/trade layers, chart imports in analyze, host pan/zoom wiring.

## How to add tasks

One goal per row; keep scope reviewable and independently testable.
