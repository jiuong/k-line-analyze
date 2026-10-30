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

### Entry measure helpers

Shared reward/risk, fill outcome, and win-rate summary live in [`../spec/setup-measure.md`](../spec/setup-measure.md) (`src/utils/setupMeasure.ts`). Measure functions return `SetupReport`, not `AnalysisResult`.

### 测量层

| functionId | Spec | 现状 |
|------------|------|------|
| `measureSecondEntry` | [`../spec/measure-second-entry.md`](../spec/measure-second-entry.md) | implemented. Measures `highN` / `lowN` from `classifySecondEntry` (`entryCount`, default 2) using `TP1` as target |
| `measureFailedBreakout` | [`../spec/measure-failed-breakout.md`](../spec/measure-failed-breakout.md) | implemented. Measures `failed_breakout`. Target stays the opposite range edge |
| `measureBreakoutPullback` | [`../spec/measure-breakout-pullback.md`](../spec/measure-breakout-pullback.md) | implemented. Measures `breakout_pullback` with the atom's measured target |
| `measureWedge` | [`../spec/measure-wedge.md`](../spec/measure-wedge.md) | implemented. Only triggered wedges. Copies `role` onto `context` |
| `measureMajorTrendReversal` | [`../spec/measure-major-trend-reversal.md`](../spec/measure-major-trend-reversal.md) | implemented. Only triggered major reversals. Signal price is `Retest` |
| `measureDoubleTopBottom` | [`../spec/measure-double-top-bottom.md`](../spec/measure-double-top-bottom.md) | implemented. Only neckline breaks. Target is a 1x neckline measured move; not written back to the atom |

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
| `classifySwingTrend` | [`../spec/classify-swing-trend.md`](../spec/classify-swing-trend.md) | implemented. Segments from `findSwingLegs` (findSwings → legs → merge). Same-direction legs chain on pullback + new extreme; covering opposite leg opens a reverse trend. Does not hole-cut around `classifyTradingRange`. Narrow segments may rewrite to `trading_range`. Endpoints from impulse leg prices; attaches `H2`/`L2` via `findSecondEntriesFrom` (`entrySwingSpan` default 1; majors use `swingSpan` default 2). Optional `swingSpan` / `entrySwingSpan`. Empty `bars` throws `TypeError`. No legs → `unclear` |
| `classifyReversalSignal` | [`../spec/classify-reversal-signal.md`](../spec/classify-reversal-signal.md) | implemented. A gap is the next bar’s body: gap up compares as a bull bar from the previous high; gap down compares as a bear bar from the previous low. Array neighbors stay consecutive across a time hole. Level prices stay the printed high and low. Empty `bars` throws `TypeError` (`range.start` needs a bar time). 1–2 bars → `unclear` |
| `classifyTradingRange` | [`../spec/classify-trading-range.md`](../spec/classify-trading-range.md) | implemented. Brooks broad / tight / barbwire / breakout-mode segments. A tight segment needs two separated edge tests and either two opposite legs or barbwire. A range that shares any bar with a taller one is dropped, including a range fully inside it. Empty `bars` throws `TypeError`. No segment → `unclear`. Does not emit `trading_range` |
| `classifyPullback` | [`../spec/classify-pullback.md`](../spec/classify-pullback.md) | implemented. Pullbacks from `classifySwingTrend` segments and `classifyTradingRange` gaps. Forwards optional `swingSpan` into swing trend. A range between two same-direction trends is `consolidation_pullback`. One adverse leg is `bar_pullback`; two or more in one pause are `multi_leg_pullback`. A `minor_*` with one adverse leg is `leg_pullback`. Depth lives in `evidence.pullbacks[i]` for `results[i]`. Empty `bars` throws `TypeError`. No pullback → `unclear` |
| `classifyTrendWithPullbacks` | [`../spec/classify-trend-with-pullbacks.md`](../spec/classify-trend-with-pullbacks.md) | implemented. Copies `classifySwingTrend` segments and attaches `bar_pullback`, `multi_leg_pullback`, and `leg_pullback` items that lie inside a major trend. A `leg_pullback` stays on the parent row. `consolidation_pullback` is not attached. Empty `bars` throws `TypeError` |
| `classifyTrendBar` | [`../spec/classify-trend-bar.md`](../spec/classify-trend-bar.md) | implemented. One `bull_trend_bar` or `bear_trend_bar` per bar. `evidence.items[i].shaved` matches that result. Empty `bars` throws `TypeError`. No trend bar → `unclear` |
| `classifyDoji` | [`../spec/classify-doji.md`](../spec/classify-doji.md) | implemented. One `doji` per bar with body at most `0.25` of the range. A zero-height bar is not a doji. Empty `bars` throws `TypeError`. No doji → `unclear` |
| `classifyInsideBar` | [`../spec/classify-inside-bar.md`](../spec/classify-inside-bar.md) | implemented. One `inside_bar` per bar inside the previous bar, with at least one stricter side. The first bar is never inside. Consecutive insides stay separate. Empty `bars` throws `TypeError`. None → `unclear` |
| `classifyOutsideBar` | [`../spec/classify-outside-bar.md`](../spec/classify-outside-bar.md) | implemented. One `outside_bar` when high and low both exceed the previous bar. No direction. Empty `bars` throws `TypeError`. None → `unclear` |
| `classifySwingLeg` | [`../spec/classify-swing-leg.md`](../spec/classify-swing-leg.md) | implemented. One `bull_leg` or `bear_leg` per consecutive swing pair from `findSwingLegs`. `swingSpan` defaults to `2`. Empty `bars` throws `TypeError`. No pair → `unclear`. No chart sidebar |
| `classifyBodyGap` | [`../spec/classify-body-gap.md`](../spec/classify-body-gap.md) | implemented. One `open_body_gap` or `filled_body_gap` per gap from `findBodyGaps`. `range.end` is the fill bar when the gap is closed. Empty `bars` throws `TypeError`. No gap → `unclear`. Sidebar checkbox **Body gap** draws `GapNear` / `GapFar` as horizontal lines |
| `classifyChannel` | [`../spec/classify-channel.md`](../spec/classify-channel.md) | implemented. One `bull_channel` or `bear_channel` per `channelFromLegs` result. Legs come from `classifySwingLeg`. Four anchors are `ChannelHigh1` through `ChannelLow2`. `evidence.items[i].overshoot` is a wick beyond a rail while the close stays inside. Empty `bars` throws `TypeError`. No channel → `unclear`. No chart sidebar |
| `classifyExtremeRetest` | [`../spec/classify-extreme-retest.md`](../spec/classify-extreme-retest.md) | implemented. One `higher_low` or `lower_high` per adjacent same-side swing that stays inside the prior extreme and outside the tolerance band. Omitted `priceTolerance` is `0.25` × average `barRange`. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyTrendlineBreak` | [`../spec/classify-trendline-break.md`](../spec/classify-trendline-break.md) | implemented. One `bear_line_break` per close below a bull channel's lower rail, and one `bull_line_break` per close above a bear channel's upper rail. The scan stops when the next same-direction channel leaves the current one. Empty `bars` throws `TypeError`. None → `unclear`. Sidebar checkbox **Trendline break** |
| `classifyRangeBreak` | [`../spec/classify-range-break.md`](../spec/classify-range-break.md) | implemented. One `range_break` per trading-range segment, on the first later close beyond `RangeHigh` or `RangeLow`. A wick with the close still inside is not a break. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyFollowThrough` | [`../spec/classify-follow-through.md`](../spec/classify-follow-through.md) | implemented. One `follow_through` when the bars after a `range_break` are a same-direction trend run whose closes stay beyond `BrokenEdge` for `FOLLOW_THROUGH_BARS` (`2`). Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyFailedBreakout` | [`../spec/classify-failed-breakout.md`](../spec/classify-failed-breakout.md) | implemented. One `failed_breakout` when a `range_break` has no matching `follow_through` and a later close returns to the inside of `BrokenEdge`. Target is the opposite edge of that trading-range segment. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifySecondEntry` | [`../spec/classify-second-entry.md`](../spec/classify-second-entry.md) | implemented. Pullback-window hinge `entryCount` (default 2 → `high2`/`low2`) via swing-leg hinges; Entry/Stop/P1–P3/TP1–TP4. Optional `tickSize` / `swingSpan` / `entryCount`. None → `unclear` |
| `classifySignalBar` | [`../spec/classify-signal-bar.md`](../spec/classify-signal-bar.md) | implemented. `bull_signal_bar` or `bear_signal_bar` only for a swing pivot that passes the close, tail, and trend-bar rules. Inside and outside bars are rejected. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyClimax` | [`../spec/classify-climax.md`](../spec/classify-climax.md) | implemented. `buy_climax` or `sell_climax` from three consecutive trend bars, or from a same-direction leg at least twice the previous one. Overlapping spans keep the longer piece. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyBreakoutPullback` | [`../spec/classify-breakout-pullback.md`](../spec/classify-breakout-pullback.md) | implemented. One `breakout_pullback` when the first opposite swing leg after `follow_through` ends within `0.25` of average bar range of `BrokenEdge`, and a later close resumes past that leg. A close back inside the range is skipped. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyMicroDouble` | [`../spec/classify-micro-double.md`](../spec/classify-micro-double.md) | implemented. One `micro_double_top` or `micro_double_bottom` per adjacent pair inside `0.25` of average bar range. The later outside bar is skipped. Entry and stop appear only after a later close breaks the opposite extreme. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyDoubleTopBottom` | [`../spec/classify-double-top-bottom.md`](../spec/classify-double-top-bottom.md) | implemented. One `double_top` or `double_bottom` per non-overlapping swing pair from `findSwings` inside the same tolerance. Every pair emits `Neckline`. Entry and stop appear only after a close breaks the neckline. No `Target`. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyWedge` | [`../spec/classify-wedge.md`](../spec/classify-wedge.md) | implemented. One `wedge_top` or `wedge_bottom` per three same-direction swing legs whose later gap is not wider than the earlier gap plus tolerance. `evidence.items[i].role` is `flag` inside the opposite major trend, otherwise `reversal`. Entry, stop, and target appear only after a close breaks the third leg's start. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |
| `classifyMajorTrendReversal` | [`../spec/classify-major-trend-reversal.md`](../spec/classify-major-trend-reversal.md) | implemented. One `bull_major_reversal` per `bear_line_break` plus the next unused later `higher_low`, and one `bear_major_reversal` for a `bull_line_break` plus `lower_high`. Entry, stop, and target appear only after a close breaks the retest bar. Target height is the matched channel's high-touch max minus low-touch min. Empty `bars` throws `TypeError`. None → `unclear`. No chart sidebar |

Shared contract: [`../spec/brooks-shared.md`](../spec/brooks-shared.md). The Brooks atom analyzers through `classifyMajorTrendReversal` are implemented. Implementation tasks: [`../tasks/README.md`](../tasks/README.md).

## Public surface (code map)

| Path | Status |
|------|--------|
| `src/analyze/*` skeleton | done (`scaffold-analyze-module`) — `index.ts` + `AnalyzerFn`; `classifyReversalSignal`, `classifySwingTrend`, `classifyTradingRange`, `classifyPullback`, `classifyTrendWithPullbacks`, `classifyTrendBar`, `classifyDoji`, `classifyInsideBar`, `classifyOutsideBar`, `classifySwingLeg`, `classifyBodyGap`, `classifyChannel`, `classifyExtremeRetest`, `classifyTrendlineBreak`, `classifyRangeBreak`, `classifyFollowThrough`, `classifyFailedBreakout`, `classifySecondEntry`, `classifySignalBar`, `classifyClimax`, `classifyBreakoutPullback`, `classifyMicroDouble`, `classifyDoubleTopBottom`, `classifyWedge`, and `classifyMajorTrendReversal` implemented |
| `src/types` analysis enums / `AnalysisResult` | done (`scaffold-types`) — `src/types/analysis.ts` |
| `src/utils/time.ts` | done |
| `src/utils/summary.ts` | done (`util-fill-summary`) |
| `src/utils/swings.ts` | done (`util-swings`) |
| `src/utils/setupMeasure.ts` | done (`util-setup-measure`) — `rewardRisk` / `resolveOutcome` / `summarizeTrades`; see [`../spec/setup-measure.md`](../spec/setup-measure.md) |
| Skill `kline-analyze-fn` | done |

## Current vs target

| Piece | 现状 | Notes |
|-------|------|-------|
| Types / shared `AnalysisResult` | done | `src/types/analysis.ts` |
| Summary helper | done | `src/utils/summary.ts` (`fillSummary`) |
| Analyze module skeleton | done | `src/analyze/index.ts`; `classifyReversalSignal`, `classifySwingTrend`, `classifyTradingRange`, `classifyPullback`, and `classifyTrendWithPullbacks` exported |
| `classifyReversalSignal` | done | `src/analyze/classifyReversalSignal.ts` |
| `classifySwingTrend` | done | `src/analyze/classifySwingTrend.ts` — leg-merge segments; no hole-cut vs `classifyTradingRange`; narrow rewrite + minor nest + entry marks |
| Swing helper | done | `src/utils/swings.ts`; used by `classifyTradingRange` and via `findSwingLegs` by `classifySwingTrend` |
| `classifyTradingRange` | done | `src/analyze/classifyTradingRange.ts` |
| `classifyPullback` | done | `src/analyze/classifyPullback.ts` — consolidation, bar, multi-leg, and minor pullbacks; fib depth in `evidence.pullbacks` |
| `classifyTrendWithPullbacks` | done | `src/analyze/classifyTrendWithPullbacks.ts` — swing segments plus inner pullbacks in `evidence.segments` |

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
