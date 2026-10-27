# Module: Chart (FR-3)

Maps to: [`../requirements.md`](../requirements.md) § FR-3.  
Parent goal: [`../goal.md`](../goal.md).

Library integration source: `D:\code\trading-playback\packages\kline-chart\docs\接入说明.md`.

## Purpose

Render the same query window’s candlesticks and overlay analysis markers (`results[].levels`, optional range highlight, name/summary) so users can see price-action results on a chart.

Display is **static** (one `setBars`) or **live-updated** (call `setBars` again when the window’s bars change). Playback is not part of this module.

## Library

| Item | Decision |
|------|----------|
| Package | `@trading-playback/kline-chart` |
| Runtime | Pure TypeScript / JavaScript. No React. Host supplies the page and an `HTMLCanvasElement` |
| Entry | Facade `KlineChart`, or the exported singleton `defaultKlineChart` |
| Install | `file:../trading-playback/packages/kline-chart` plus `@trading-playback/shared` (`file:` + npm `overrides`, because the chart package depends on `workspace:*`) |
| Import site | Only `src/chart/` |

## Responsibilities & non-goals

| In scope | Out of scope |
|----------|--------------|
| Mount the library on a host canvas and draw the query window | Custom canvas / self-drawn candle engine |
| Map `Bar[]` + caller `timeframe` → `KlineBar[]` and call `setBars` | Fetching bars inside the chart module |
| Map `AnalysisResult` → a `layer_drawings` overlay renderer | Native “marker” widgets (this library has none) |
| Static snapshot, or replace bars on refresh (`setBars`) | Playback (`setPlaybackStatus` and `'not_started' \| 'playing' \| 'paused' \| 'ended'`) |
| Convert UTC times to East-8 ISO-8601 before chart calls | Full trading terminal / order UI |
| Keep analyzers free of chart imports | Embedding chart deps inside `src/analyze` |

Pan, zoom, crosshair, and minimum candle size belong in `@trading-playback/kline-chart`. The default host calls `attachPointerInteraction` after `mount`. This repo does not implement those gestures. Hit-testing (`canvasPointFromClient` + `hitTest`) stays available for overlays.

## Integration boundary

```mermaid
flowchart LR
  bars[Bars_same_window]
  results[AnalysisResult_list]
  adapter[Chart_adapter]
  lib["@trading-playback/kline-chart"]
  bars --> adapter
  results --> adapter
  adapter -->|setBars| lib
  adapter -->|registerOverlay_layer_drawings| lib
```

| Side | Responsibility |
|------|----------------|
| Caller | Query-window `Bar[]`, caller-held `symbol` / `timeframe`, one or more `AnalysisResult` |
| Chart adapter | `mount` / `unmount`, `Bar[]` → `KlineBar[]`, time conversion, `setBars`, `setTimeViewport`, `layer_drawings` overlay, `requestRedraw` after overlay data changes |
| Library | Candles, axes, crosshair, empty state, coordinate conversion, overlay paint slots |
| Analyze | No import of this package |

### Host lifecycle

1. Provide a `<canvas>` and a parent used for size.
2. `mount(canvas, { container, onReady? })`. `mount` syncs canvas size to the container; call `resize(width, height)` only when the host owns sizing.
3. `setBars(bars)` for the window. Optionally `setTimeViewport`, `setConfig`, `setThemeColors`, `setPriceTickSize`.
4. `registerOverlay({ layerId: 'layer_drawings', renderer })` for analysis marks. The returned function unregisters (equivalent to `unregisterOverlay`).
5. On later bar refresh, call `setBars` again. If only overlay inputs changed, call `requestRedraw()`.
6. On teardown, `unmount()`.

Do not call `setPlaybackStatus`.

## Inputs

| Input | Notes |
|-------|-------|
| Bars | Same window shown on the chart; also the `Bar[]` passed into analyzers. `time` is UTC Unix seconds |
| Instrument context | Caller-held `symbol` / `timeframe` (not on `AnalysisResult`). `timeframe` is copied onto each `KlineBar` |
| `AnalysisResult[]` | One or more function outputs. Geometry from `results[].levels` (`time` is UTC `TimeString`) |
| Canvas | Host `HTMLCanvasElement` plus layout container |

The library does not load market data. The adapter guarantees time order and field validity.

### `Bar` → `KlineBar`

| `KlineBar` | Source |
|------------|--------|
| `timeframe` | Caller `TimeFrame` (`H1`, `M15`, …) |
| `time` | `Bar.time` converted to East-8 ISO-8601, including `+08:00` |
| `open` / `high` / `low` / `close` | Same fields on `Bar` |

`toTimeString` in `src/utils/time.ts` emits UTC (`…Z`) only. The `+08:00` string is an adapter concern; do not pass UTC `Z` or raw Unix seconds into `setBars` or `timeToX`.

Volume fields on `Bar` are not part of `KlineBar`.

### Viewports

| Viewport | Shape | Use |
|----------|-------|-----|
| Time | `{ from: string; to: string }` | Query window, same `+08:00` format as `KlineBar.time`. Set with `setTimeViewport` |
| Price | `{ min: number; max: number }` | Optional. Read back via `getViewport()` with the time viewport |

### Appearance (optional)

Not required for FR-3 acceptance. Partial updates are supported.

| API | Fields |
|-----|--------|
| `setConfig` / `getConfig` | `scaleMode` (`'linear' \| 'log' \| 'auto'`), `rightMarginRatio`, `bullColor` / `bearColor`, `gridColor` / `plotBorderColor`, `gridDashLength` / `gridDashGap`, `fontSize`. Defaults: `DEFAULT_KLINE_CHART_CONFIG` |
| `setThemeColors` / `getThemeColors` | `bg`, `fg`, `border`, `muted`, `grid`, `crosshairStroke`, `crosshairLabelBg`, `crosshairLabelFg` |
| `setPriceTickSize` | Minimum price increment for axis labels |

`reset()` clears data and config-related state and restores the default theme and tick size. The adapter should not call it as part of a normal refresh (`setBars` is enough).

## Overlay mapping

Analysis marks go through `registerOverlay` on **`layer_drawings`** only.

| `layerId` | This module |
|-----------|-------------|
| `layer_drawings` | Levels, range highlight, name / summary text |
| `layer_indicators` | Unused |
| `layer_trades` | Unused |

`HostChildRenderer`:

```ts
{
  id: string; // unique within the layer
  render(ctx, coordinateSystem, context): void;
  hitTest?(point): { layerId: string; target: unknown } | null;
}
```

Draw with the coordinate system from `withCoordinateSystem` or `getCoordinateSystem()` (`CoordinateSystem`):

| Method | Use |
|--------|-----|
| `timeToX(time)` / `xToTime(x)` | East-8 time string ↔ screen X. Convert level / range times before `timeToX` |
| `priceToY(price)` / `yToPrice(y)` | Price ↔ screen Y |
| `getPlotArea()` | Main plot rectangle |
| `barCenterX(barIndex)` | Candle center X when the index is known |

Minimum mapping:

- Each drawn `Level` in `results[].levels` → one point at `(timeToX(time+08), priceToY(price))` labeled via `displayMarkText` (`H1`–`H3` / `L1`–`L3` as-is; `SignalBar` on `high1`–`low3` → `H1`–`L3`; otherwise `Level.name`). `classifySwingTrend` skips `BullTrendStart` / `BullTrendEnd` / `BearTrendStart` / `BearTrendEnd` and draws entry-count `H1`–`H3` / `L1`–`L3` when those levels are still on the result.
- Optional: highlight each item’s `range.start`–`range.end` (convert both; `end` may be absent).
- Optional: draw `results[].name` / outer `summary` as text inside the plot. The library has no legend API.

Anchor remains the bar open time. After overlay inputs change, `requestRedraw()`.

Pointer hits, when the host implements them: `canvasPointFromClient(canvas, clientX, clientY)` then `hitTest({ x, y })`. Overlay `hitTest` may return `{ layerId, target }`.

## Public surface (planned)

| Piece | Notes |
|-------|-------|
| Adapter module | [`src/chart/`](../../src/chart/) — only place that imports `@trading-playback/kline-chart` |
| Analyze package | Importable with **zero** chart dependencies |
| Review page | [`web/`](../../web/) Vite canvas. `npm run dev` on `127.0.0.1:5173` |
| Bars for the page | Dev `GET /api/bars` → [`loadBarsWithMeta`](../../src/data/loadBars.ts). Browser does not read the store |

## Behaviors

1. The candles on screen are the mapped query-window bars (same OHLC; times shown as `+08:00`). The adapter fits bar layout after `setBars` so those candles span the plot.
2. A later refresh replaces those candles by calling `setBars` again. No playback state machine.
3. Drawn level marks correspond 1:1 with `results[].levels` entries on the result(s).
4. Analyzers never import the chart package.

## Current vs target

| Piece | 现状 | Notes |
|-------|------|-------|
| Library choice | done | `@trading-playback/kline-chart` via `file:`; `@trading-playback/shared` via `file:` + `overrides` |
| Adapter (`setBars` + `layer_drawings`) | done | `src/chart/` — east8 time, bar map, overlay, host lifecycle |
| Review page | done | `web/` + `GET /api/bars`; pan/zoom still out of scope |
| Playback | out of scope | Do not call `setPlaybackStatus` |

## Acceptance (after library integration)

| # | Criterion |
|---|-----------|
| C1 | Given fixture bars + fixed `AnalysisResult`, drawn level dots match `results[].levels` 1:1 (time = bar open, after `+08:00` conversion), except a reversal signal draws only its `K2`, and `classifySwingTrend` omits trend endpoints |
| C2 | Query window (symbol / timeframe / range) matches the candles from `setBars` |
| C3 | Analysis packages remain importable without chart dependencies |
| C4 | Refreshing the window updates candles via `setBars` only; playback status is never set |

Summary text and result names stay on the review-page sidebar. The overlay draws a translucent `range` band from K1 through K3. `classifySwingTrend` still draws that band. It draws entry-count dots `H1`–`H3` / `L1`–`L3` (from `entryCounts`, labeled as those names) when those levels are on the result. The review page keeps them only while Entry count is checked. It does not draw `BullTrendStart`, `BullTrendEnd`, `BearTrendStart`, or `BearTrendEnd`. Reversal signals draw only the `K2` dot; `K1` and `Confirm` stay on the result and are not drawn.

`bull_reversal` bands and the `K2` dot are red (`#f85149`). `bear_reversal` bands and the `K2` dot are green (`#3fb950`). `bull_trend` and `minor_bull_trend` bands are the same red. `bear_trend` and `minor_bear_trend` bands are the same green. `trading_range` bands and inner pullback bands (`bar_pullback`, `multi_leg_pullback`, `leg_pullback`) are `#d2a8ff`. High level dots stay green; low level dots stay red.

`classifyTradingRange` does not draw a vertical band or level dots. Each kept segment draws a horizontal line at `RangeHigh` (green `#3fb950`) and `RangeLow` (red `#f85149`). `timeToX` is the bar-slot center, so each line runs from half a slot before the first bar to half a slot after the last bar and covers every candle in the segment. The level name sits at the right end of the line.

`classifyBodyGap` uses the same horizontal span. `GapNear` and `GapFar` are both `#d2a8ff`. An open gap has no `range.end`, so both lines cover that one bar. A filled gap runs from the gap bar through the fill bar. There is no vertical band and no level dot.

`classifyTrendlineBreak` does not draw a vertical band. The two rail touches are connected and extended, at the same pixel slope, to the break bar's x. `bull_line_break` is red (`#f85149`). `bear_line_break` is green (`#3fb950`). Only `BreakBar` is a dot. `unclear` draws nothing.

## Review page

`npm run dev` serves [`web/`](../../web/) on `127.0.0.1:5173`.

1. The form loads symbols and timeframes from `GET /api/catalog`, which reads `../trading-playback/config/trading.json`. Options submit `code` and show `label (code)`. The first entry of each list is selected. From / To are `datetime-local` values converted to UTC Unix seconds. Empty To means now. Optional `count` and `refresh` still go to `GET /api/bars`. A missing or invalid catalog shows the error and does not invent options.
2. The dev middleware ([`src/page/barsMiddleware.ts`](../../src/page/barsMiddleware.ts)) calls [`loadBarsWithMeta`](../../src/data/loadBars.ts). It does not accept a file path. [`src/page/catalogMiddleware.ts`](../../src/page/catalogMiddleware.ts) only serves that fixed catalog file.
3. Analysis is off until a sidebar checkbox is enabled. The sidebar lists each analyzer **once** via [`reviewSidebarItems`](../../src/page/reviewModel.ts) (default roots = [`REVIEW_SIDEBAR_TREE`](../../src/page/reviewModel.ts): **temporarily Second entry subtree only**). [`REVIEW_TREE`](../../src/page/reviewModel.ts) still records the full measure→classify catalog; that nesting does **not** drive checkboxes or drawing. Pass `REVIEW_TREE` into `reviewSidebarItems` to show all six measures again. Checking an item runs and draws **only that** `functionId`'s full results—no parent/child cascade. [`runReview`](../../src/page/reviewModel.ts) returns `{ analysis, reports }` for the checked classify and measure ids. A checked **measure** draws each trade's `Entry` (`#8b949e`), `Stop` (`#f85149`), and target line(s) (`#3fb950`) as horizontal **segments** over that trade's `range` (half a bar-slot past each end), with same-color labels at both ends, and prints win-rate / count stats in the sidebar. Default label is `Target`; when `SetupTrade.targets` is set (e.g. `measureSecondEntry` TP1–TP4), those names are drawn instead. `measureSecondEntry` sets `range` from the entry bar through the exit bar (stop/target hit, or last bar while open). A setup whose stop, entry, and target are out of trade order is not a trade: the same measure still draws that setup's `Entry` / `Stop` / `Target` segments and adds a `Fail` mark (`#f85149`) at its signal price and time. Those signals stay out of the win-rate stats. Checked **classify** nodes feed `setResults` and use the existing overlay rules (default band+dots; special cases for trading range, body gap, trendline break). `classifySwingTrend` has nested **Small-cycle trends** and **Entry count** display toggles, default off. Off hides `minor_bull_trend` / `minor_bear_trend` or strips `H1`–`H3` / `L1`–`L3` from the chart; the summary still reports `minor`. When trading-range and swing-trend results are both visible and one range segment fully covers two or more consecutive swing trends, those trends are hidden and the range stays. `classifyBodyGap` and `classifyTrendWithPullbacks` are not on the sidebar. Toggling recomputes marks without another bars request.
4. The adapter `mount`s once, calls `attachPointerInteraction` (library pan, zoom, and crosshair), then `setBars` / `setResults` / `setReports`. A later submit calls `setBars` again. Leaving the page calls `unmount()`, which drops the library listeners.
5. The sidebar shows `source` (`local` or `mt5`, plus degraded). Measure `SetupReport.stats` (and optional `byBasis`) appear for enabled measures. Summary and `results[].name` appear for enabled classify analyzers. Below the chart, `#setup-trades` lists each enabled measure's trades and Fail rows: measure id, basis, range, Entry/Stop/Target, status (`win`/`loss`/`open`/`unfilled`/`Fail`), planned reward/risk, and max reward/risk before stop (`maxRewardRisk`). The chart itself does not mark W/L on candles.
6. A failed response shows the error and leaves the previous candles in place. An empty successful window clears the chart.

## Related

- Architecture: [`../architecture/chart.md`](../architecture/chart.md)
- Requirements: [`../requirements.md`](../requirements.md) FR-3
- Analyze shared contract: [`analyze.md`](analyze.md)
- Tasks: [`../project-tasks.md`](../project-tasks.md) (`chart-dep-kline-chart` … `chart-adapter-host`, `page-bars-api`, `page-review-host`)
- Module index: [`README.md`](README.md)
- Upstream host guide: `D:\code\trading-playback\packages\kline-chart\docs\接入说明.md`
