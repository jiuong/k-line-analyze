# classifyTrendWithPullbacks

Authoritative function spec.

## Intent

Attach pullbacks that sit inside a trend to that trend. Segment boundaries stay exactly those of `classifySwingTrend`. Pullback geometry and depth stay exactly those of `classifyPullback`.

This function does not detect reversals, swings, ranges, or pullbacks. It does not import either classifier into the other. `classifyPullback` already calls `classifySwingTrend` on the whole window, so the trend classifier must not call back.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifyTrendWithPullbacks` |
| Export | `classifyTrendWithPullbacks` |
| Impl path | `src/analyze/classifyTrendWithPullbacks.ts` |
| Tests | `tests/analyze/classifyTrendWithPullbacks.test.ts` |
| Status | **implemented** |

## Parameters

```ts
function classifyTrendWithPullbacks(
  bars: Bar[],
  options?: ClassifyPullbackOptions,
): AnalysisResult<TrendWithPullbacksEvidence>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)). `options` is the `classifyPullback` options object. `fibTouchTolerance` is forwarded unchanged. Default remains `0.01`.

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC. Non-array or length 0 throws `TypeError` |
| `options` | no | Invalid `options` or `fibTouchTolerance` throws `TypeError` from `classifyPullback` |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Loaded outside this function |
| `classifySwingTrend` | **exists** | Segment `name`, `range`, and `levels` are copied |
| `classifyPullback` | **exists** | Inner pullbacks and their depth evidence |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `toTimeString` | **exists** | Match a segment time to a bar index |
| `AnalysisResult` types | **exists** | No new `AnalysisLabel` or `LevelName` |

`classifySwingTrend` runs twice: once here, and once inside `classifyPullback`. This function does not change that.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0`.
2. Call `classifySwingTrend(bars)` and `classifyPullback(bars, options)` once each.
3. Copy each swing item into `results` in the same order. Copy `name`, `range`, and `levels`. Do not drop `minor_*`, `trading_range`, or `unclear`.
4. Map each copied item and each pullback item to bar indexes by open time. An unknown time throws `Error`.
5. **Parents.** Only `bull_trend` and `bear_trend` can receive children. Walk those parents from left to right.
6. **Children.** Keep a pullback whose `name` is `bar_pullback`, `multi_leg_pullback`, or `leg_pullback` when its first and last bars both lie inside a parent’s closed index span. Attach it to the leftmost such parent. A pullback is attached once.
7. Skip `consolidation_pullback`. Its bars lie in the gap between two major trends, so they are not inside either span. Skip `unclear`.
8. `minor_*`, `trading_range`, and `unclear` get an empty child list. A `leg_pullback` that covers a minor is listed on the containing major, not on the minor row.
9. `evidence.segments[i].pullbacks` matches `results[i]`. Each child copies that pullback’s `name`, `range`, and `levels`, plus `legCount`, `depthPct`, `nearestFibPct`, and `relation` from `evidence.pullbacks` at the same index. A kept pullback with no evidence entry throws `Error`.
10. No inner pullback still returns the swing segments. Child lists are empty. Do not replace that output with a new `unclear` item.
11. `confidence` is `1`.

Callers should pass bars in time order.

## Labels

`results[].name` is the swing label. This function adds none.

| Child `name` | Where it is attached |
|--------------|----------------------|
| `bar_pullback` | The leftmost major trend whose span contains the pullback |
| `multi_leg_pullback` | Same |
| `leg_pullback` | The major trend that contains the minor, not the `minor_*` row |
| `consolidation_pullback` | Not attached |
| `unclear` | Not attached |

## Levels

Parent `results[].levels` are the swing levels. Child `levels` are the pullback levels (`PullbackStart`, `PullbackExtreme`). No new level names.

## Summary template

```text
trends={count}; annotated={annotated}; pullbacks={pullbacks}; last={lastName} children={children}
```

| Placeholder | Source |
|-------------|--------|
| `{count}` | Number of `bull_trend` and `bear_trend` items |
| `{annotated}` | How many of those have at least one child |
| `{pullbacks}` | Total children across every segment |
| `{lastName}` | `name` of the last major trend. When there is none, `name` of the last result |
| `{children}` | Child count of that same item |

Examples:

```text
trends=1; annotated=1; pullbacks=1; last=bull_trend children=1
trends=0; annotated=0; pullbacks=0; last=unclear children=0
```

## Evidence

```ts
type TrendPullbackChild = {
  name: "bar_pullback" | "multi_leg_pullback" | "leg_pullback";
  range: { start: TimeString; end?: TimeString };
  levels: Level[];
  legCount: number;
  depthPct: number;
  nearestFibPct: 23.6 | 38.2 | 50 | 61.8 | 78.6 | 100;
  relation: "not_reached" | "touched" | "exceeded";
};

type TrendWithPullbacksEvidence = {
  segments: { pullbacks: TrendPullbackChild[] }[];
};
```

`evidence.segments.length` equals `results.length`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| `options` is not a plain object, or `fibTouchTolerance` is not a finite number `> 0` | Throw `TypeError` |
| A segment time is not in `bars` | Throw `Error` |
| A kept pullback has no matching evidence entry | Throw `Error` |
| No inner pullback | Swing segments with empty child lists. Do not throw |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Bar pullback | One bull trend with one adverse bar | `results` match `classifySwingTrend`. That `bar_pullback` is on the `bull_trend` |
| Minor | A `minor_bear_trend` inside a bull trend | `leg_pullback` is on the bull row. The minor row’s list is empty |
| Consolidation | Two bull trends with a range in the gap | No child named `consolidation_pullback` |
| No pullback | No reversal | One `unclear`, `pullbacks: []`, summary uses `last=unclear` |
| Tolerance | Same bars, wider `fibTouchTolerance` | Child `relation` follows `classifyPullback` |
| Invalid | Non-array, empty array, bad tolerance | `TypeError` |
| Contract | Any success path | `confidence === 1`, `segments.length === results.length`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
