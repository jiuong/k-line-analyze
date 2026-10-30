# classifyPullback

Authoritative function spec.

## Intent

Find pullbacks in a caller-supplied `Bar[]`. A pullback is a pause against a trend that has not become an opposite major trend.

The function reads trend segments from `classifySwingTrend` and ranges from `classifyTradingRange`. It does not re-detect reversals, swings, or ranges.

Four kinds:

- A range sitting in the gap between two major trends of the same direction is a `consolidation_pullback` (horizontal flag). An opposite major trend between them is a reversal, not a pullback.
- One adverse leg inside a `bull_trend` or `bear_trend` is a `bar_pullback`.
- Two or more adverse legs in the same pause, before the trend extreme is broken, are one `multi_leg_pullback`.
- A `minor_bull_trend` or `minor_bear_trend` with fewer than two adverse legs is a `leg_pullback`. Two or more adverse legs inside that minor segment are a `multi_leg_pullback` instead.

Each pullback reports how far that episode retraced, as a percentage of its parent trend, the nearest Fibonacci level, and whether price fell short of, touched, or went past that level.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifyPullback` |
| Export | `classifyPullback` |
| Impl path | `src/analyze/classifyPullback.ts` |
| Tests | `tests/analyze/classifyPullback.test.ts` |
| Status | **implemented** |

## Parameters

```ts
function classifyPullback(
  bars: Bar[],
  options?: ClassifyPullbackOptions,
): AnalysisResult<PullbackEvidence>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)).

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC. Non-array or length 0 throws `TypeError` |
| `options` | no | Optional `fibTouchTolerance` (finite `> 0`) and `swingSpan` (integer `>= 1`, default `2`, forwarded to `classifySwingTrend`). A non-object options value throws `TypeError` |

| Option | Default | Role |
|--------|---------|------|
| `fibTouchTolerance` | `0.01` | Absolute band on the depth ratio. `0.01` is one percentage point |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Loaded outside this function |
| `classifySwingTrend` | **exists** | Major trends, minor cycles, and `trading_range` segments |
| `classifyTradingRange` | **exists** | Horizontal ranges between same-direction trends |
| `toTimeString` | **exists** | `src/utils/time.ts` |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `AnalysisResult` types | **exists** | Labels and levels below |

No `fetchBars`. This function does not use `isSingleLegTrend`. That helper folds a short pullback back into a leg; this function reports those bars.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0`. Resolve `fibTouchTolerance`. Throw `TypeError` when `options` is present and is not a plain object, or when `fibTouchTolerance` is not a finite number greater than 0.
2. Call `classifySwingTrend(bars)` and `classifyTradingRange(bars)` once each.
3. Map each segment to bar indexes by open time. An unknown time throws `Error`.
4. **Parent trends.** Keep `bull_trend` and `bear_trend` in start-index order. A `minor_*` belongs to the major trend that contains its indexes. Bars inside a minor are not scanned again as `bar_pullback`.
5. **Consolidation.** Walk consecutive major trends. When they share a direction, the open gap is the bars strictly after the left trend and strictly before the right trend. Each `broad_trading_range`, `tight_trading_range`, `barbwire`, `breakout_mode`, or swing `trading_range` that overlaps that gap is one `consolidation_pullback`, clipped to the gap. Identical clips are emitted once. The parent span is the left trend’s first bar through the right trend’s last bar. The reference extreme is the left trend’s trend-side extreme (bull: highest high, bear: lowest low), on the earliest such bar.
6. **Minor segment.** One pullback covers the minor’s own bars. The reference extreme is the parent trend’s trend-side extreme on bars strictly before the minor. When the minor starts on the parent’s first bar, the reference is that first bar’s trend-side price (bull: its high, bear: its low). Count adverse legs inside the minor (step 8). Two or more legs → `multi_leg_pullback`. Otherwise `leg_pullback` with `legCount` 1.
7. **Bars inside one major trend.** Skip indexes already covered by a consolidation clip or a minor. Also skip the last bar when the next major trend is the opposite direction and starts on that same bar. Walk each remaining contiguous run from left to right.
8. **Adverse leg.** In a bull trend an adverse bar has `close < open`. In a bear trend it has `close > open`. A doji (`close === open`) is not adverse. Adjacent adverse bars are one leg. A doji or a with-trend bar splits legs.
9. **One pause.** A pullback starts at the first adverse bar whose price does not break the reference extreme. The reference is the parent trend’s trend-side extreme on bars strictly before that bar. When no such bar exists, the reference is the starting bar’s own trend-side price. Later bars stay in the pullback until one breaks the reference (bull: `high` strictly above it, bear: `low` strictly below it). That breaking bar is not included. A with-trend bar or doji that does not break the reference stays in the pause and does not add a leg. The next adverse bar after that pause adds a leg. The run also ends at the last scanned bar. One leg → `bar_pullback`. Two or more → `multi_leg_pullback`.
10. A new trend extreme between two adverse runs makes two pullbacks. A pause that never breaks the reference makes one `multi_leg_pullback`.
11. **Depth.** `trendDistance` is the parent span’s highest high minus its lowest low. `pullbackDistance` is the adverse move of this episode only: bull, reference high minus the lowest low of the pullback bars; bear, the highest high of the pullback bars minus the reference low. Use `max(0, …)`. Later bars beyond this episode are not part of the numerator. `depth = pullbackDistance / trendDistance`. Skip the pullback when `trendDistance` is 0.
12. **Fibonacci.** Ratios `0.236`, `0.382`, `0.5`, `0.618`, `0.786`, `1`, reported as `23.6`, `38.2`, `50`, `61.8`, `78.6`, `100`. The nearest level minimizes the absolute difference against the unrounded depth ratio. A tie keeps the shallower level. `|depth − level| ≤ fibTouchTolerance` → `touched`. Otherwise `depth < level` → `not_reached`, and `depth > level` → `exceeded`.
13. `depthPct` is the depth ratio times 100, rounded to one decimal. The relation test uses the unrounded ratio.
14. `legCount` is the number of adverse legs. A `leg_pullback` stores `1`. A consolidation stores the adverse-leg count inside the clipped gap, which may be `0`.
15. Order pullbacks by the first pullback bar, then by the last. No pullback → one `unclear` item, `levels: []`, `range` from the first bar’s open time to the last bar’s open time. Do not throw.
16. `confidence` is `1`. `evidence.pullbacks[i]` describes `results[i]`. When the only result is `unclear`, `pullbacks` is `[]`.

Callers should pass bars in time order.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `consolidation_pullback` | A range clipped to the gap between two same-direction major trends |
| `bar_pullback` | One adverse leg inside a major trend, outside any minor or consolidation |
| `multi_leg_pullback` | Two or more adverse legs in one pause, or inside one minor segment |
| `leg_pullback` | A minor segment with fewer than two adverse legs |
| `unclear` | No pullback in the window |

## Levels

Shape: `Level[]`. `time` is the bar open via `toTimeString`. Names are unique inside one item. `unclear` uses `levels: []`.

| LevelName | Bar | `price` |
|-----------|-----|---------|
| `PullbackStart` | The bar that prints the reference extreme. Earliest bar on a tie | Bull: that bar’s `high`. Bear: that bar’s `low` |
| `PullbackExtreme` | The earliest pullback bar that prints the deepest adverse price | Bull: that bar’s `low`. Bear: that bar’s `high` |

Emit `PullbackStart`, then `PullbackExtreme`. `range.start` / `range.end` are the first and last bars of the pullback itself. `PullbackStart.time` may be earlier than `range.start`.

## Summary template

```text
pullbacks={count}; consolidation={consolidation}; bars={bars}; multi={multi}; legs={legs}; last={lastName} depth={depth} fib={fib} relation={relation}
```

| Placeholder | Source |
|-------------|--------|
| `{count}` | Number of pullback items. A lone `unclear` contributes 0 |
| `{consolidation}` `{bars}` `{multi}` `{legs}` | Counts of those labels |
| `{lastName}` | `name` of the last item |
| `{depth}` | That item’s `depthPct`, trailing `.0` removed. `-` for `unclear` |
| `{fib}` | That item’s `nearestFibPct`, trailing `.0` removed. `-` for `unclear` |
| `{relation}` | `not_reached`, `touched`, or `exceeded`. `-` for `unclear` |

Examples:

```text
pullbacks=1; consolidation=0; bars=1; multi=0; legs=0; last=bar_pullback depth=20 fib=23.6 relation=not_reached
pullbacks=0; consolidation=0; bars=0; multi=0; legs=0; last=unclear depth=- fib=- relation=-
```

## Evidence

```ts
type PullbackRelation = "not_reached" | "touched" | "exceeded";

type PullbackItemEvidence = {
  legCount: number;
  pullbackDistance: number;
  trendDistance: number;
  depthPct: number;
  nearestFibPct: 23.6 | 38.2 | 50 | 61.8 | 78.6 | 100;
  relation: PullbackRelation;
};

type PullbackEvidence = {
  pullbacks: PullbackItemEvidence[];
};
```

`evidence.pullbacks[i]` matches `results[i]` whenever a pullback was emitted. There is no id on `AnalyzeResult`. `unclear` uses `pullbacks: []`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| `options` is not a plain object, or `fibTouchTolerance` is not a finite number `> 0` | Throw `TypeError` |
| No pullback, including a window with no trend | `unclear`, do not throw |
| A segment time is not in `bars` | Throw `Error` |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| One adverse bar | One bull trend with a single bear bar that does not make a new high | One `bar_pullback`. Depth, fib, and relation follow steps 11–13 |
| Bear mirror | One bear trend with a single bull bar | One `bar_pullback` measured from the prior low |
| Multi-leg | Two bear runs separated by a bull bar that does not exceed the reference high | One `multi_leg_pullback`, `legCount` 2 |
| Split by a new high | The middle bar makes a higher high | Two `bar_pullback` items |
| Minor | A `minor_bear_trend` inside a bull trend | One `leg_pullback` when the minor has one adverse leg. Those bars are not also a `bar_pullback` |
| Consolidation | Two bull trends with a `classifyTradingRange` segment in the gap | One `consolidation_pullback`. No `bar_pullback` for bars inside the gap |
| Opposite major | Bull, bear, bull, and the bear is a major trend | No `consolidation_pullback` |
| One side only | A range with only one remaining trend beside it | No `consolidation_pullback` |
| Fib relations | Depths below, on, and past a level, including a wider `fibTouchTolerance` | `not_reached`, `touched`, `exceeded` |
| No structure | No reversal | `unclear`, empty levels, `pullbacks: []` |
| Invalid | Non-array, empty array, bad tolerance | `TypeError` |
| Contract | Any success path | `confidence === 1`, `evidence.pullbacks.length === results.length` except `unclear`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
