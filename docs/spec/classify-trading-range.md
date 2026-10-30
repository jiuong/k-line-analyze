# classifyTradingRange

Authoritative function spec.

## Intent

Scan a caller-supplied `Bar[]` for Al Brooks trading-range segments. One window may contain several segments. A horizontal range with two tests of each boundary is a `broad_trading_range`. Overlapping, low-height stretches are `tight_trading_range`, `barbwire`, or `breakout_mode`.

`classifySwingTrend` already uses `trading_range` for a different rule (at least 3 bars and a high–low span of at most 1.5× the average bar height, and not a single-leg trend). This function does not emit that label. A broad segment is a run of consecutive swing legs with two tests of each side. Legs that sit inside one extended swing trend are not a broad range. The segment starts on the first leg and ends on the last leg. A tight segment stays only when it has two separated tests of each edge and either two opposite legs or barbwire.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifyTradingRange` |
| Export | `classifyTradingRange` |
| Impl path | `src/analyze/classifyTradingRange.ts` |
| Tests | `tests/analyze/classifyTradingRange.test.ts` |
| Status | **implemented** |

## Parameters

```ts
function classifyTradingRange(
  bars: Bar[],
  options?: ClassifyTradingRangeOptions,
): AnalysisResult<TradingRangeEvidence>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)).

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC. Non-array or length 0 throws `TypeError` |
| `options` | no | Overrides the defaults below. A non-finite or out-of-range override throws `TypeError` |

| Option | Default | Role |
|--------|---------|------|
| `swingSpan` | `2` | Forwarded to `readSwingLegs`. This function does not scan pivots itself |
| `minBroadBars` | `8` | Minimum bars in a broad segment, endpoints included |
| `maxBoundaryDriftRatio` | `0.2` | Strict upper bound on boundary drift / height |
| `legRatioMax` | `2` | Max / min of the median up leg and median down leg |
| `followThroughBars` | `FOLLOW_THROUGH_BARS` (`2`) | Consecutive closes beyond the shelf that stop the next leg from joining a broad segment. The segment still ends on the last included leg. Same constant as `classifyFollowThrough` |
| `tightHeightMult` | `2.5` | Tight segment height ≤ this × its median bar height |
| `tightOverlapRatio` | `0.7` | Fraction of adjacent pairs that overlap enough |
| `pairOverlapRatio` | `0.5` | Overlap length / shorter bar height for one pair |
| `tightMinBars` | `3` | Minimum tight / barbwire / breakout-mode length |
| `barbwireTailRatio` | `0.5` | (upper wick + lower wick) / bar height |
| `dojiBodyRatio` | `0.25` | Passed to `isDoji`. Same default as `DOJI_BODY_RATIO` |
| `barbwireMinBars` | `3` | Minimum length for `barbwire` |
| `breakoutModeMinBars` | `20` | Tight segment at least this long is `breakout_mode` |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Loaded outside this function |
| `readSwingLegs` | **exists** | [`src/analyze/classifySwingLeg.ts`](../../src/analyze/classifySwingLeg.ts). Broad pivots come from these legs. This function does not call `findSwings` |
| `mergeLegsIntoTrends` | **exists** | [`src/analyze/classifySwingTrend.ts`](../../src/analyze/classifySwingTrend.ts). Marks legs that already form an extended trend. This function does not call `classifySwingTrend` |
| `walkSingleLegs` | **exists** | [`src/utils/trendLeg.ts`](../../src/utils/trendLeg.ts). Tight structure only. Broad segments do not use `singleLegDirection` |
| `toTimeString` | **exists** | `src/utils/time.ts` |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `isDoji` | **exists** | `src/utils/barPredicates.ts`. Barbwire doji check. Does not copy the body formula |
| `AnalysisResult` types | **exists** | Labels below; levels `RangeHigh` / `RangeLow` |

No `fetchBars`. No `classifyReversalSignal`.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0`. Resolve options, then throw `TypeError` when an override is not a finite number in range (`swingSpan` and the bar-count options are integers ≥ 1; ratios are finite and > 0; `legRatioMax` ≥ 1).
2. Call `readSwingLegs(bars, swingSpan)`. A bull leg runs from a swing low to the next swing high. A bear leg runs from a swing high to the next swing low. Same-direction legs stay separate. A high and a low on the same bar are not a leg. This function does not call `findSwings`.
3. **Extended trends.** Call `mergeLegsIntoTrends` on the full leg list. A trend with `endLegIndex > startLegIndex` absorbed a later impulse by making a new extreme. Every leg index in that span is blocked, including pullback legs the span covers. A single-leg trend (`endLegIndex === startLegIndex`) stays free. A blocked leg cannot belong to a broad segment. Adjacent free legs form one run; a blocked leg splits the run.
4. **Broad segments.** Inside each free run, walk from the left. Take the shortest leg window that satisfies the broad rules. The segment starts at the first leg’s `startIndex` and ends at the last leg’s `endIndex`. Extend one later leg at a time while the rules still hold and follow-through does not start before that next leg’s end. Keep the furthest valid end. Emit it and resume at the first later leg whose `startIndex` is after that end bar, so later broad segments do not share a bar. If the window is not valid, start one leg later. Bars after the last included leg are not part of the segment.
**Broad rules** (all required), on the legs in the window. The bar span is `[first.startIndex, last.endIndex]` inclusive:
   - Length ≥ `minBroadBars`.
   - Both directions are present.
   - At least two distinct high pivots and two distinct low pivots. A bull leg’s end and a bear leg’s start are highs. A bull leg’s start and a bear leg’s end are lows. A pivot shared by two legs counts once.
   - Height = max high − min low of the bar span, and height > 0.
   - Opening upper boundary = price of the earliest high pivot. Closing upper boundary = price of the latest high pivot. Lower boundaries use low pivots. `|closing − opening| / height < maxBoundaryDriftRatio` for both boundaries. Every other high or low pivot stays within that same ratio of its opening boundary.
   - Up-leg size is `endPrice − startPrice` of each bull leg. Down-leg size is `startPrice − endPrice` of each bear leg. Both medians are > 0, and `max(medianUp, medianDown) / min(...) ≤ legRatioMax`.
   - **Follow-through.** Shelf high = max high-pivot price in the window already accepted. Shelf low = min low-pivot price. `followThroughBars` consecutive closes all above the shelf high, or all below the shelf low, that finish on or before the next leg’s end, keep that next leg out. The segment still ends on the last included leg, not on the bar before those closes. A wick beyond the shelf whose close is back inside increments `failedBreakouts` and does not move the shelf.
5. **Tight segments.** On the full window, take maximal left-to-right runs. A run of at least `tightMinBars` is tight when its height ≤ `tightHeightMult` × the median `(high − low)` of its bars, and at least `tightOverlapRatio` of its adjacent pairs overlap by at least `pairOverlapRatio` of the shorter bar. A zero-height bar inside the other bar’s range counts as a full overlap. Extend one bar at a time with these checks, in order. Edges used below are the edges of the run before the candidate bar, from step 6.
   - **True break.** The bar’s high is above the upper edge, or its low is below the lower edge. Distance is that excess divided by `(upper − lower)`. Distance ≥ 1.5 ends the run on the previous bar, even when a later close returns. Distance < 1.5 also ends the run there when neither of the next two closes is back between the edges. If the series ends on those two bars and a close is already back inside, it is not a true break.
   - **False break.** Distance < 1.5 and one of the next two closes is between the edges, inclusive. Keep the break bar. The edge does not move to the wick. A later true break can still end the run.
   - **Still inside.** The bar does not break the edges, and its close is between the run’s current high and low, inclusive. Keep it when the overlap rule still holds, even if the height multiple is now above `tightHeightMult`.
   - Otherwise keep it only when the full tight rules still hold. Until both edges exist, only the last two checks apply.
   Label the run in this order:
   - length ≥ `breakoutModeMinBars` → `breakout_mode`
   - else every bar has tail ratio ≥ `barbwireTailRatio`, at least one bar is `isDoji(bar, dojiBodyRatio)`, and length ≥ `barbwireMinBars` → `barbwire`
   - else → `tight_trading_range`
   - A zero-height bar is not a doji and is not barbwire.
6. Keep a tight segment only when both edges exist and the slice has the structure below. Do not shorten it. A broad segment is not checked here.
   - **Edges.** One level is highs, or lows, within 15% of the segment’s median bar height. A bar touches the upper level when its high is in that level, and the lower level when its low is in that level. Scan upper levels from the highest high downward, and lower levels from the lowest low upward. Consecutive touches are one probe. The first level with at least two touches that have one non-touching bar between them is that edge. `RangeHigh` / `RangeLow` use the most extreme price in the level, on the earliest such bar. No upper edge, no lower edge, or an upper edge that is not above the lower edge drops the segment. A single wick stays in the segment and is not the edge.
   - **Structure.** At least two non-overlapping single-leg runs (`singleLegDirection`) with opposite directions, or barbwire from step 5. One same-direction leg is not a range. Walk the slice from the left and take the longest single leg that starts at the current bar, then resume after it.
7. Do not run `singleLegDirection` on a broad segment. A directional swing trend is already excluded in step 3, including a shallow trend whose boundary drift is still under `maxBoundaryDriftRatio`. Tight segments still use the opposite-leg check in step 6.
8. If a tight run has the same start and end bar as a broad segment, drop the broad segment and keep the tighter label.
9. **No shared bars.** Two segments overlap when their bar indexes intersect, including a single shared bar or one segment fully inside the other. Keep the segment whose high − low is larger. If those heights are equal, keep the one with more bars. If the bar counts are also equal, keep the one that starts earlier. Drop the other segment whole. Do not trim the overlap and emit the leftover as its own range, and do not merge two same-edge segments into a longer span. Walk candidates from largest height to smallest, and skip any that still intersect a kept segment.
10. Order results by start bar, then by longer span first. No segments → one `unclear` item, `levels: []`, `range` from the first bar’s open time to the last bar’s open time. Do not throw.
11. `confidence` is `1`. `summary` uses the template below.

Callers should pass bars in time order.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `broad_trading_range` | Broad rules in step 4, not the same span as a tight run, and not inside an extended swing trend |
| `tight_trading_range` | Tight run that is neither breakout mode nor barbwire, with both separated edges and two opposite legs |
| `barbwire` | Tight run whose bars are tailed and include a doji, shorter than breakout mode, with both separated edges |
| `breakout_mode` | Tight run of at least `breakoutModeMinBars`, with both separated edges, and either barbwire or two opposite legs |
| `unclear` | No segment in the window |

`trading_range` is not a result of this function.

## Levels

Shape: `Level[]`. `time` is the bar open via `toTimeString`. Names are unique inside one item. `unclear` uses `levels: []`.

| LevelName | Bar | `price` |
|-----------|-----|---------|
| `RangeHigh` | Broad: first bar that prints the segment high. Tight, barbwire, and breakout mode: the upper edge from step 6. The price is that level's highest high, on its earliest bar | that bar’s `high` |
| `RangeLow` | Broad: first bar that prints the segment low. Tight, barbwire, and breakout mode: the lower edge from step 6. The price is that level's lowest low, on its earliest bar | that bar’s `low` |

Emit the two levels in time order. `range.start` / `range.end` are those endpoints’ open times (both ends set).

## Summary template

```text
ranges={count}; broad={broad}; tight={tight}; barbwire={barbwire}; breakout={breakout}; last={lastName} from={from} to={to}
```

| Placeholder | Source |
|-------------|--------|
| `{count}` | Number of range segments (excludes a lone `unclear`) |
| `{broad}` `{tight}` `{barbwire}` `{breakout}` | Counts of those labels |
| `{lastName}` | `name` of the last emitted item |
| `{from}` `{to}` | That item’s `range.start` and `range.end`, or `-` when the item is `unclear` |

Examples:

```text
ranges=1; broad=1; tight=0; barbwire=0; breakout=0; last=broad_trading_range from=2023-11-14T22:13:20Z to=2023-11-14T22:40:00Z
ranges=0; broad=0; tight=0; barbwire=0; breakout=0; last=unclear from=- to=-
```

## Evidence

```ts
type TradingRangeSegmentEvidence = {
  testsHigh: number;
  testsLow: number;
  failedBreakouts: number;
  boundaryDriftHigh: number;
  boundaryDriftLow: number;
  height: number;
};

type TradingRangeEvidence = {
  segments: TradingRangeSegmentEvidence[];
};
```

One entry per emitted range segment, same order as `results`. `testsHigh` / `testsLow` count distinct high / low pivots of swing legs whose pivot index falls inside the segment. The same pivot map as step 4 is used. An unpaired swing that never became a leg is not counted. `boundaryDriftHigh` is the last high-pivot price minus the first (signed), ordered by bar index; `boundaryDriftLow` uses low pivots. Fewer than two pivots of that kind → `0`. `height` is max high − min low of the segment bars. `failedBreakouts` counts bars in the segment whose high is above the max high-pivot price and whose close is at or below it, plus bars whose low is below the min low-pivot price and whose close is at or above it. No high pivot or no low pivot → `failedBreakouts` is `0`. `unclear` uses `segments: []`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| Option override out of range | Throw `TypeError` |
| No segment, including a short window | `unclear`, do not throw |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Broad + outside cluster | Flat swing legs with two highs and two lows. Later bars stay under that high, so they do not extend the last leg, and they have no separated edge | Only `broad_trading_range`. The segment ends on the last leg |
| Flat legs | Alternating legs, two tests of each side, flat boundaries, and `mergeLegsIntoTrends` does not extend them | One `broad_trading_range` from the first leg start to the last leg end |
| Shallow trend | Legs that `mergeLegsIntoTrends` joins with a new extreme, even when drift stays under 0.2 of the height | No `broad_trading_range` |
| Channel | Same two-and-two legs, but both boundaries drift by ≥ 0.2 of the height | No `broad_trading_range` |
| Breakout mode | At least 20 overlapping bars, one bar that splits the high and the low, height within 2.5× the median bar | One `breakout_mode` |
| Follow-through | A broad shelf, then two closes beyond it before a later leg can join | Broad segment ends on the last included leg, before those closes |
| No structure | Monotone drift, no second test | `unclear` |
| Single leg | Five overlapping bars that each make a higher high and higher low | `unclear` |
| One wick | One bar prints a higher high. A lower level is touched by two bars with a gap between them | `RangeHigh` is the lower level, on its earliest bar |
| True break | Edges exist, then a poke whose excess is at least 1.5× the edge height, even if a later close returns | The segment ends on the bar before the poke |
| False break | Edges exist, then a poke of 1.2× the edge height whose close is outside, and the next close returns between the edges | One segment through the return bar. `RangeHigh` stays on the edge, not the wick |
| One direction | Overlapping bars that are one bull leg and not barbwire | `unclear` |
| Nested | A taller tight run fully contains a shorter-height tight run | Only the outer segment is emitted |
| Invalid | Non-array, empty array | `TypeError` |
| Contract | Any success path | `confidence === 1`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
