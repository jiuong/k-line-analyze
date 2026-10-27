# Brooks atom batch — shared contract

Status: **in progress**. Helpers and analyzers through the Brooks batch are implemented. `H1`–`H3` / `L1`–`L3` are entry LevelNames; trend endpoints use `BullTrendStart` / `BullTrendEnd` / `BearTrendStart` / `BearTrendEnd`. **Second entry / swing-trend H2·L2** come from `secondEntries` (pullback-window hinges), not from full-series `countAdjacentEntries`. Implementation tasks: [`docs/tasks/README.md`](../tasks/README.md). No new `src/analyze` export and no new `AnalysisLabel` / `LevelName` in `src/types/analysis.ts` until the function that owns the name is implemented.

Per-function specs in this batch link here. They do not repeat this contract.

## Role

These functions add Al Brooks structures and signals on top of the five implemented analyzers. Each public function has one job. Shared geometry lives in `src/utils/` and returns plain data, not `AnalysisResult`.

## Public analyzer I/O

```ts
function classifyExample(
  bars: Bar[],
  options?: ExampleOptions,
): AnalysisResult<ExampleEvidence>;
```

| Field | Rule |
|-------|------|
| `bars` | Caller-supplied MT5 `Bar[]`. The function does not fetch. |
| `options` | Omitted when the function has no knobs. A present non-object throws `TypeError`. |
| `functionId` | The export name |
| `results[].name` | Only labels declared by that function, plus `unclear` |
| `results[].range` | `TimeString` open times of the structure, both ends inclusive when `end` is set |
| `results[].levels` | `{ name, price, time }`. `time` is the bar open via `toTimeString`. Prices are printed high, low, or close as the function spec says |
| `summary` | That function’s template only, via `fillSummary` |
| `confidence` | `1` |
| `evidence` | JSON object. Only facts not derivable from `results` / `summary`. Index `i` matches `results[i]` when the spec uses a parallel array |

No `symbol` or `timeframe` on the input or the result.

## Errors and empty results

| Case | Result |
|------|--------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| Not enough bars to form the structure | One `unclear` item, `levels: []`, `range` from the first bar open to the last bar open. Do not throw |
| Scan finds nothing | Same `unclear` item. Do not return `results: []` |
| A numeric option is present but not a finite number in the spec’s range | Throw `TypeError` |

## Boundaries

- No HTTP, no `fetchBars`, no chart imports.
- A function does not emit another function’s labels.
- A function does not reimplement an upstream scan. It calls that function or the named util.
- Array neighbors stay one pair when open times are far apart. A time hole is not a split.
- This batch does not classify always-in, a higher timeframe, session opens, or an EMA test.
- `classifyReversalSignal` stays the local three-bar reversal. `classifySignalBar` and `classifyMajorTrendReversal` do not replace it.
- `H1`–`H3` and `L1`–`L3` are LevelNames for high/low entry anchors (trigger price on K2). Result labels stay `high1`–`high3` / `low1`–`low3`. Trend segment endpoints use `BullTrendStart` / `BullTrendEnd` / `BearTrendStart` / `BearTrendEnd`.
- **Two counters (do not conflate):**
  - `entryCounts.countAdjacentEntries` — full-series adjacent breaks; not used by `classifySecondEntry` / swing-trend marks.
  - `secondEntries.findSecondEntriesFrom` — pullback-window adverse→with-trend hinges; SE emits only the 2nd (`high2`/`low2`); swing-trend attaches `H2`/`L2` from the same helper.
- Why entry / stop / target for the six measure setups: [`docs/theory/entry-setups.md`](../theory/entry-setups.md) (theory only; this file and per-function specs stay authoritative for algorithms).

## Constraints

- New labels and level names are listed in the function spec. They enter the type union only with the implementation.
- Body-size ratios, tail ratios, price-tolerance fractions, and “how many bars is consecutive” are not fixed in this revision, except the bar-geometry defaults below. The implementation commit writes the chosen default into that function’s spec before the code uses it. Code must not ship a silent numeric default.
- `options.tickSize`, when a function accepts it, is an optional finite number `> 0`. Omitted: `Entry` equals the directional extreme and `evidence.tickApplied` is `false`. Present and invalid: `TypeError`. The function does not infer a symbol’s tick.
- `options.swingSpan`, when accepted, is an integer `>= 1`. Default `2`, forwarded unchanged into `findSwings` / `classifySwingLeg`.
- Downstream functions pass the same `swingSpan` and `tickSize` they received. They do not invent a second default.
- **Exception — second entry:** majors use `majorSwingSpan` (default 2); pullback H1/H2 legs use `entrySwingSpan` (default 1). See [classify-second-entry.md](classify-second-entry.md).
- `summary` / `confidence` / `evidence` stay on the outer result. Geometry stays on `results`.

## Pure helpers (not analyzers)

| Module | Functions | I/O boundary |
|--------|-----------|----------------|
| `src/utils/barMetrics.ts` | `barRange`, `body`, `upperTail`, `lowerTail`, `closeLocation` | One `Bar` in. Numbers out. No label. Formulas in the bar-geometry section |
| `src/utils/barPredicates.ts` | `isDoji`, `isBullTrendBar`, `isBearTrendBar`, `isInsideBar`, `isOutsideBar`, `isShaved`, `consecutiveTrendBars` | Booleans or index spans. `matchingBars(bars, predicate)` is the only scan loop for the four shape analyzers. Thresholds in the bar-geometry section |
| `src/utils/gapBody.ts` | `withGapBody(prev, bar)` | Gap up (`bar.low > prev.high`): a new bar with `open` and `low` set to `prev.high`. Gap down (`bar.high < prev.low`): `open` and `high` set to `prev.low`. A touch, an overlap, or a missing `prev` returns the same bar. Does not mutate `bars`. `classifyReversalSignal` calls this |
| `src/utils/bodyGaps.ts` | `findBodyGaps(bars)` | `{ direction: "up" \| "down", index, filledIndex? }[]`. `index` is the bar after the gap, detected only through `withGapBody`. `filledIndex` is the first later bar whose low reaches the gap-up near edge, or whose high reaches the gap-down near edge. Fewer than two bars returns `[]`. A non-array throws `TypeError`. No `AnalysisResult` |
| `src/utils/swingLegs.ts` | `findSwingLegs(bars, swingSpan = 2)` | `{ direction: "bull" \| "bear", startIndex, endIndex, startPrice, endPrice }[]`. Calls `findSwings` with `swingSpan` unchanged. Each item is one low→high or high→low pair. Same-direction legs stay separate. A high and a low on the same bar are not a leg. An empty array returns `[]`. A non-array throws `TypeError`. Does not replace `singleLegDirection` |
| `src/utils/priceCluster.ts` | `pricesWithin(left, right, tolerance)` | `abs(left - right) <= tolerance`. The boundary counts. No default ratio; the caller passes `tolerance`. `tolerance` must be finite and `>= 0`. Prices must be finite. Otherwise `TypeError`. Boolean only. No `AnalysisResult` |
| `src/utils/trendline.ts` | `channelFromLegs`, `railPriceAt`, `closesBeyond` | Channels from `SwingLeg` endpoints. Does not call `findSwings` or `findSwingLegs`. Adjacent same-direction legs are one redraw. Bull: later high and later low are both strictly higher. Bear: both strictly lower. Three qualifying legs emit two channels and share the middle leg. Fewer than four touches returns `[]`. No parallel extrapolation. Channels are ordered by the first leg’s start index. `railPriceAt` evaluates the two-point line at an index, including past the second touch. `closesBeyond` is true only when the close is outside that line (`high`: above, `low`: below). A touch or a wick is false. A with-trend close beyond the channel line is not a trend-line break; `classifyTrendlineBreak` uses only the bull lower rail and the bear upper rail. No wedge label and no `AnalysisResult` |
| `src/utils/measuredMove.ts` | `projectMeasuredMove(anchor, magnitude, direction)` | `up` is `anchor + magnitude`. `down` is `anchor - magnitude`. Magnitude `0` returns the anchor. Anchor and magnitude must be finite; magnitude must be `>= 0`. `direction` is `up` or `down`. Otherwise `TypeError`. Does not read bars. No `AnalysisResult` |
| `src/utils/fibonacci.ts` | `projectFibRetracement`, `fibRetracementFromBars` | Fibonacci **retracement**. Defaults `0 / 0.236 / 0.382 / 0.5 / 0.618 / 0.786 / 1`. `price(r) = later + r * (earlier − later)`. From bars: window `max(high)` / `min(low)` at earliest indexes; `low` first → `high_to_low`; `high` first → `low_to_high`; same index or zero range → `null`. Empty / non-array bars, bad options/ratios, or non-finite high/low throws `TypeError`. No `AnalysisResult` |
| `src/utils/fibonacci.ts` | `projectFibExtension`, `fibExtensionFromBars` | Fibonacci **extension** (independent of retracement). Defaults `0 / 0.236 / 0.382 / 0.5 / 0.618 / 0.786 / 1 / 1.272 / 1.414 / 1.618 / 2 / 2.618 / 3.618 / 4.236`. `price(r) = v3 + r * (v2 − v1)`. From bars: window high/low as V1 (earlier) / V2 (later); V3 is the opposite extreme after V2 (earliest on a tie). Same-bar extremes, zero range, or no bars after V2 → `null`. Empty / non-array bars, bad options/ratios, or non-finite high/low throws `TypeError`. No `AnalysisResult` |
| `src/utils/setupPrices.ts` | `entryBeyond`, `stopBeyond`, `targetFrom` | `direction` is the trade side. `entryBeyond` steps with the trade: `up` adds `tickSize`, `down` subtracts it. `stopBeyond` steps against the trade: `up` subtracts, `down` adds. Omitted `tickSize` leaves the extreme unchanged. `targetFrom` returns the finite price it was given (a measured-move projection or the opposite edge). It does not call `projectMeasuredMove` or read bars. A non-finite price, a `tickSize` that is not finite and `> 0`, or a bad direction throws `TypeError`. No `AnalysisResult` |
| `src/utils/entryCounts.ts` | `countAdjacentEntries`, `entryLevelName` | Adjacent K1→K2 high/low entries on the **full series** (no trend window). High: `K2.high >= K1.high + tick` → `high1`–`high3` on K2 at price `K1.high + tick`. Low: `K2.low <= K1.low - tick` → `low1`–`low3` at `K1.low - tick`. Same K2 may emit both. Each side caps at 3. Omitted `tickSize` uses `0`. `entryLevelName` maps `high1`→`H1` … `low3`→`L3`. **Not** called by `classifySecondEntry` or `classifySwingTrend` marks. Does not emit `AnalysisResult`. Invalid bars/`tickSize` throws `TypeError` |
| `src/utils/secondEntries.ts` | `findSecondEntriesFrom`, `resolveProtectiveImpulse` | **SE / swing-trend H2·L2 source.** Pullback windows from swing legs (`entrySwingSpan`, default 1) after each with-trend impulse until a newer with-trend extreme; open impulses skip without starving later windows. Hinges = adverse→with-trend; hinge-local adjacent breaks (uncapped). Only the **2nd** hinge is returned (`high2`/`low2`). If the pullback violates the fine impulse start, P1/Stop walk back to earlier same-direction starts (P2 stays the fine end). Majors from caller (typically span 2). Impulse on matching major; break inside major; Stop(P1) opposite Entry. No `AnalysisResult` |

Helpers throw `TypeError` on a non-array `bars` when they take a series. They do not return `unclear`.

### Bar geometry

`barMetrics` throws `TypeError` when `open`, `high`, `low`, or `close` is not finite, or when `high < low`.

| Function | Rule |
|----------|------|
| `barRange` | `high − low` |
| `body` | `abs(close − open)` |
| `upperTail` | `high − max(open, close)` |
| `lowerTail` | `min(open, close) − low` |
| `closeLocation` | `(close − low) / barRange`. `0.5` when `barRange === 0` |

| Constant | Value | Used by |
|----------|-------|---------|
| `DOJI_BODY_RATIO` | `0.25` | `isDoji`. Same number as `classifyTradingRange` `dojiBodyRatio`. A zero-height bar is not a doji |
| `TREND_BAR_BODY_RATIO` | `0.5` | `isBullTrendBar` / `isBearTrendBar` |
| `CONSECUTIVE_TREND_BARS` | `2` | Default `minBars` for `consecutiveTrendBars` |
| `FOLLOW_THROUGH_BARS` | `2` | Default `followThroughBars` for `classifyTradingRange`, and the minimum trend-bar prefix for `classifyFollowThrough` |

A bar with `0.25 < body / barRange < 0.5` is neither a doji nor a trend bar.

| Predicate | Rule |
|-----------|------|
| `isDoji(bar, bodyRatio = 0.25)` | `barRange > 0` and `body / barRange <= bodyRatio`. `bodyRatio` must be finite, `> 0`, and `<= 1` |
| `isBullTrendBar` | `close > open` and `body / barRange >= 0.5` |
| `isBearTrendBar` | `close < open` and `body / barRange >= 0.5` |
| `isInsideBar(bar, previous)` | No previous bar: false. Otherwise high `<=` previous high, low `>=` previous low, and at least one side is stricter. Identical high and low is not inside |
| `isOutsideBar(bar, previous)` | No previous bar: false. Otherwise high `>` previous high and low `<` previous low. One side equal is not outside |
| `isShaved` | `upperTail === 0` and `lowerTail === 0` |
| `consecutiveTrendBars(bars, minBars = 2)` | Same-direction trend-bar runs. Each item is `{ start, end, direction: "bull" \| "bear" }` with `end` inclusive. A doji or the other direction ends the run. `minBars` must be an integer `>= 2`. Empty `bars` returns `[]` |
| `matchingBars(bars, predicate)` | `predicate(bar, index, bars)` returns the matching indexes |

Inside and outside are mutually exclusive. A trend bar is not a doji.

## Level names reserved by this batch

`BarHigh`, `BarLow`, `LegStart`, `LegEnd`, `GapNear`, `GapFar`, `ChannelHigh1`, `ChannelHigh2`, `ChannelLow1`, `ChannelLow2`, `PriorExtreme`, `Retest`, `BreakBar`, `BrokenEdge`, `FollowBar`, `ReturnBar`, `SignalBar`, `Entry`, `Stop`, `Target`, `P1`, `P2`, `P3`, `TP1`, `TP2`, `TP3`, `TP4`, `Push1`, `Push2`, `Push3`, `Neckline`, `BullTrendStart`, `BullTrendEnd`, `BearTrendStart`, and `BearTrendEnd` are in `src/types`. `H1`–`H3` / `L1`–`L3` remain LevelNames; swing-trend overlays use `H2`/`L2` from `secondEntries`.

| LevelName | Price |
|-----------|--------|
| `BarHigh` | Printed high of the named bar. In the type union |
| `BarLow` | Printed low of the named bar. In the type union |
| `LegStart` | Swing price at the leg’s first swing. Bull: that swing low. Bear: that swing high. In the type union |
| `LegEnd` | Swing price at the leg’s last swing. Bull: that swing high. Bear: that swing low. In the type union |
| `GapNear` | Gap up: previous high. Gap down: previous low. In the type union |
| `GapFar` | Gap up: this bar’s low. Gap down: this bar’s high. In the type union |
| `ChannelHigh1` `ChannelHigh2` | The two upper-rail touch prices, earlier then later. In the type union |
| `ChannelLow1` `ChannelLow2` | The two lower-rail touch prices, earlier then later. In the type union |
| `BreakBar` | Close of the bar that crosses the line or edge. In the type union |
| `BrokenEdge` | The range boundary that was crossed. Price and time are copied from that `RangeHigh` or `RangeLow`. In the type union |
| `PriorExtreme` | The earlier swing price being tested. In the type union |
| `Retest` | Higher low: the later low. Lower high: the later high. In the type union |
| `FollowBar` | Close of the last bar in the follow-through run. In the type union |
| `ReturnBar` | Close of the bar that closes back inside the range. In the type union |
| `SignalBar` | Fade extreme of the return bar for `classifyFailedBreakout`: low after an up break, high after a down break. Other functions may use the directional extreme. In the type union |
| `Entry` | `entryBeyond` of `SignalBar`, or the extreme itself when `tickSize` is omitted. In the type union |
| `Stop` | `stopBeyond` of the protective extreme. In the type union |
| `Target` | `targetFrom`. In the type union |
| `Push1` `Push2` `Push3` | Each push extreme, in time order. Bull wedge: highs. Bear wedge: lows. In the type union |
| `Neckline` | Counter-swing extreme between the two same-side swings of a double top or bottom. Always emitted. In the type union |
| `BullTrendStart` `BullTrendEnd` | Bull trend segment endpoints (`classifySwingTrend`). In the type union |
| `BearTrendStart` `BearTrendEnd` | Bear trend segment endpoints (`classifySwingTrend`). In the type union |
| `H1` `H2` `H3` | High entry LevelNames. `classifySwingTrend` attaches only `H2` (from `findSecondEntriesFrom`); `H1`/`H3` are for `countAdjacentEntries` / future use |
| `L1` `L2` `L3` | Low entry LevelNames. `classifySwingTrend` attaches only `L2` (from `findSecondEntriesFrom`); `L1`/`L3` are for `countAdjacentEntries` / future use |
| `P1` `P2` `P3` | Fib-extension anchors for `classifySecondEntry` |
| `TP1` `TP2` `TP3` `TP4` | Fib extension targets at `1` / `1.272` / `1.414` / `1.618` (`classifySecondEntry`) |

`Top1`, `Top2`, `Bottom1`, and `Bottom2` already exist. This batch uses them for double tests and does not change their meaning.

## Summary shape

Each function spec owns its template. Placeholders are `{count}` and `{lastName}` unless that spec adds one. `{count}` is the number of non-`unclear` items. `{lastName}` is the last item’s `name`, or `unclear` when that is the only item.
