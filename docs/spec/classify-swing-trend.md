# classifySwingTrend

Authoritative function spec. Skill mirror: `.cursor/skills/kline-analyze-fn/examples/classify-swing-trend.md`.

## Intent

Split a caller-supplied `Bar[]` into one or more trend segments by merging `findSwingLegs` impulses.

Dependency chain: `findSwings` → `findSwingLegs` → `classifySwingTrend`. Direction and boundaries come from swing legs, not from `classifyReversalSignal` K2 nodes.

A `bull` leg opens or continues a `bull_trend`. A `bear` leg opens or continues a `bear_trend`. Same-direction legs chain when each new impulse makes a strict new extreme and the structure between them is a valid pullback. A pullback may be one bar, one opposite leg, or a full opposite swing trend (same rules, recursive).

If an opposite structure touches or crosses the prior impulse’s guarded extreme, it is not a pullback: the prior trend ends, and that opposite leg opens a new opposite trend.

After those segments exist, two rewrites run in order:

1. A segment of at least 3 bars whose high–low span is at most 1.5× the average bar height becomes `trading_range`, unless that slice is a single-leg trend. The single-leg check skips a time hole and resumes on the later bar.
2. A remaining top-level trend of at most 3 bars, sandwiched by two longer trends of the opposite direction, becomes `minor_bull_trend` or `minor_bear_trend` when its prices sit inside the merged outer trend. Nested multi-leg pullback trends absorbed inside a parent are also emitted; short contained ones may already be labeled `minor_*`.

Trends are **not** cut when they overlap a `classifyTradingRange` span. Interval and trend may cover the same bars; callers that need the range still call `classifyTradingRange` separately.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifySwingTrend` |
| Export | `classifySwingTrend` |
| Impl path | `src/analyze/classifySwingTrend.ts` |
| Tests | `tests/analyze/classifySwingTrend.test.ts` |
| Status | **implemented** |

## Parameters

```ts
function classifySwingTrend(
  bars: Bar[],
  options?: {
    swingSpan?: number;
    entrySwingSpan?: number;
    attachEntryMarks?: boolean;
  },
): AnalysisResult<Record<string, never>>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)).

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC array. Non-array or length 0 throws `TypeError` |
| `options.swingSpan` | no | Integer `>= 1`, default `2`. Forwarded into `findSwingLegs` for trend merge |
| `options.entrySwingSpan` | no | Integer `>= 1`, default `1`. Legs for H2/L2 marks via `findSecondEntriesFrom` |
| `options.attachEntryMarks` | no | Default `true`. When `false`, skip H2/L2 attachment |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Loaded outside this function |
| `findSwingLegs` | **exists** | [`src/utils/swingLegs.ts`](../../src/utils/swingLegs.ts). Pivot pairing; this function does not re-detect pivots |
| `toTimeString` | **exists** | `src/utils/time.ts` |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `AnalysisResult` types | **exists** | `bull_trend` / `bear_trend` / `minor_bull_trend` / `minor_bear_trend` / `trading_range` / `unclear`; endpoints `BullTrendStart` / `BullTrendEnd` / `BearTrendStart` / `BearTrendEnd`; entry marks `H2` / `L2` from second-entry logic |
| `isSingleLegTrend` | **exists** | [`src/utils/trendLeg.ts`](../../src/utils/trendLeg.ts). Narrow-segment trading-range rewrite |
| `findSecondEntriesFrom` | **exists** | [`src/utils/secondEntries.ts`](../../src/utils/secondEntries.ts). Pullback-window H2/L2 (not full-series `countAdjacentEntries`) |

This function does not call `classifyReversalSignal` or `classifyTradingRange`.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0`.
2. Call `findSwingLegs(bars, swingSpan)`. When the leg list is empty, return one `unclear` result spanning the window.
3. **Merge legs into trends** (greedy, left to right; recursive for opposite pullback trends):
   - Open a trend on the current leg’s direction. One leg alone is a valid trend. Guarded extreme = that leg’s `startPrice` (bull: swing low; bear: swing high). Last impulse extreme = that leg’s `endPrice`.
   - To extend: parse the **maximal opposite swing trend** starting at the next leg (same merge rules). Compute the opposite structure’s adverse extreme over bars from its first leg start through its last leg end (bull parent → min `low`; bear parent → max `high`).
   - **Touches or crosses** the guarded extreme (`<=` for bull parent, `>=` for bear parent): not a pullback. Close the current trend at the last included same-direction leg’s end. Resume by opening a new opposite trend on that opposite leg.
   - **Does not cover**, and the next same-direction leg after the opposite structure makes a **strict** new extreme (bull: higher `endPrice`; bear: lower `endPrice`): absorb the opposite structure as a pullback and include the new impulse. Update guarded extreme to the new impulse’s `startPrice` and last impulse extreme to its `endPrice`. Repeat.
   - **Does not cover**, but there is no following same-direction leg, or that leg fails the new extreme: close the current trend at the last included same-direction leg; resume parsing from the opposite structure’s first leg.
   - **Pullback kinds** (for docs and tests; matching avoids double-count):
     1. **Single bar**: between the last impulse end and the next same-direction start, the adverse extreme is carried by exactly one bar. No separate trend result.
     2. **Single opposite leg**: opposite parse spans exactly one leg. No separate trend result.
     3. **Opposite swing trend**: opposite parse spans two or more same-direction opposite impulses (with its own pullbacks). Emit that opposite trend as its own result (nested under the parent in output order). If its bar count is at most 3 and prices sit inside the parent, label it `minor_*` immediately; otherwise keep `bull_trend` / `bear_trend`.
4. Convert each merged trend to an `AnalyzeResult`: `range` from first impulse start bar open through last impulse end bar open; levels `Bull/BearTrendStart` = first impulse start price/time; `Bull/BearTrendEnd` = last impulse end price/time.
5. **Trading range.** Same as before: for each segment with at least 3 bars, span ≤ 1.5× average height, and not `isSingleLegTrend` → `trading_range` with `RangeHigh` / `RangeLow`. Runs before top-level minor nesting.
6. **Minor cycle (top-level).** Same left-mid-right nest as before for sequential primaries (at most 3 bars, price-contained, outers merge). Nested pullback trends already emitted in step 3 are listed immediately after their parent and are not re-processed as mid candidates unless they appear as sequential primaries.
7. **Entry marks.** `findSecondEntriesFrom` with `entrySwingSpan` (default 1) against majors from this pass (`swingSpan`, default 2); attach `H2` / `L2` to the covering `bull_trend` / `bear_trend`. Skip when `attachEntryMarks: false`.
8. Assemble `summary`, `confidence: 1`, `evidence: {}`.

Callers should pass bars in time order.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `bull_trend` | Merged bull impulse chain, not rewritten |
| `bear_trend` | Merged bear impulse chain, not rewritten |
| `minor_bull_trend` | Short bull nested inside a larger bear (top-level nest or short nested pullback) |
| `minor_bear_trend` | Short bear nested inside a larger bull |
| `trading_range` | At least 3 bars, span ≤ 1.5× average height, not a single-leg trend |
| `unclear` | No swing legs in the window |

## Levels

| Segment | First level | Second level | Extra |
|---------|-------------|--------------|-------|
| `bull_trend` / `minor_bull_trend` | `BullTrendStart` = first bull leg `startPrice` | `BullTrendEnd` = last bull leg `endPrice` | Entry marks when covering |
| `bear_trend` / `minor_bear_trend` | `BearTrendStart` = first bear leg `startPrice` | `BearTrendEnd` = last bear leg `endPrice` | Entry marks when covering |
| `trading_range` | Earlier of segment high / low | The other extreme | — |

`unclear` uses `levels: []`. `range` for a trend is the first impulse start time through the last impulse end time.

## Summary template

```text
trends={count}; minor={minor}; ranges={ranges}; last={lastName} from={from} to={to}
```

Same placeholders as before (`count` / `minor` / `ranges` / `lastName` / `from` / `to`).

## Evidence

```ts
type SwingTrendEvidence = Record<string, never>;
```

Always `{}`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| Invalid `options` / `swingSpan` | Throw `TypeError` |
| No legs (short window, or pivots do not pair) | `unclear`, do not throw |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Single bull leg | One low→high swing leg | One `bull_trend`; endpoints from that leg |
| Single bear leg | One high→low swing leg | One `bear_trend` |
| Single-leg pullback chain | Bull, bear (HL), bull (HH) | One `bull_trend` spanning first low through second high |
| Single-bar pullback | Two bull legs with one adverse bar between that holds the prior low | One `bull_trend` |
| Nested opposite trend pullback | Bull, multi-leg bear that holds the prior low, bull HH | Parent `bull_trend` plus nested bear (`minor_*` if short) |
| Cover breaks | Opposite leg low ≤ prior bull `startPrice` | Prior bull ends; opposite leg opens `bear_trend` |
| Failed new extreme | Pullback holds, next same-dir fails HH/LL | Prior trend ends at last qualifying impulse; resume from opposite |
| Narrow rewrite | ≥3 bars, span ≤ 1.5× avg, not single leg | `trading_range` |
| No legs | Too few bars for pivots | `unclear` |
| Invalid | Non-array / empty / bad `swingSpan` | `TypeError` |
| Entry marks | ABC pullback second entry | `H2` / `L2` attach to covering major |

Inject synthetic `Bar[]`. Do not call MT5.
