# classifySwingTrend

Authoritative function spec. Skill mirror: `.cursor/skills/kline-analyze-fn/examples/classify-swing-trend.md`.

## Intent

Split a caller-supplied `Bar[]` into one or more trend segments using reversal signals from `classifyReversalSignal`.

Each kept reversal opens a segment. A `bull_reversal` opens a `bull_trend`. A `bear_reversal` opens a `bear_trend`. Direction comes from that opening signal, not from a higher-high / lower-low price compare.

The segment runs from that signal’s `K2` through the next opposite signal’s `K2` (both bars included). The last segment has no closing reversal, so it runs through the last input bar (that bar included).

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
): AnalysisResult<Record<string, never>>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)). No `options`.

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC array. Non-array or length 0 throws `TypeError` |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Loaded outside this function |
| `classifyReversalSignal` | **exists** | [`classifyReversalSignal.ts`](../../src/analyze/classifyReversalSignal.ts). Same-direction runs are already collapsed to the later signal |
| `toTimeString` | **exists** | `src/utils/time.ts` — open tail endpoint time |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `AnalysisResult` types | **exists** | `bull_trend` / `bear_trend` / `unclear`; levels `H1` / `L1` |

This function does not detect pivots. `src/utils/swings.ts` is not a dependency.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0`.
2. Call `classifyReversalSignal(bars)`. Keep items whose `name` is `bull_reversal` or `bear_reversal`, in that order. Drop `unclear` / `no_reversal`.
3. When none remain, return one `AnalyzeResult` with `name: "unclear"`, `levels: []`, and `range` from the first bar’s open time to the last bar’s open time. Do not throw. Bars before the first `K2` are not a segment.
4. Otherwise each kept signal `Si` (`i` from 0 through `n`) is one segment:
   - **Name.** `bull_reversal` → `bull_trend`. `bear_reversal` → `bear_trend`.
   - **Start.** That signal’s `K2` (`time` and `price` copied). A missing `K2` throws (upstream invariant).
   - **End when `i < n`.** `S(i+1)`’s `K2`, copied the same way. Both `K2` bars are inside the segment. That `K2` is also the next segment’s start, so adjacent `range` values meet on it.
   - **End when `i = n`.** The last input bar. `range.end` is that bar’s open time. Bull price is its `high` (`H1`). Bear price is its `low` (`L1`). This point is not a reversal `K2`. Emit the segment even when the opening `K2` is already the last bar (`range.start` equals `range.end`).
5. `n + 1` reversals produce `n + 1` segments. One reversal is one open segment from its `K2` to the last bar, not `unclear`.
6. The opening signal’s `K1` is outside the segment. A closed segment’s confirm bar is outside that segment (it falls in the next segment unless that bar is the next `K2`).
7. Because `classifyReversalSignal` keeps only the later signal of a same-direction run, a run such as bull, bull, bear starts at the later bull’s `K2`.
8. Build `summary` from the template below. `confidence` is `1`. `evidence` is `{}`.

Segment order follows the reversal scan. Callers should pass bars in time order, the same assumption as `classifyReversalSignal`.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `bull_trend` | Opened by a `bull_reversal` |
| `bear_trend` | Opened by a `bear_reversal` |
| `unclear` | No reversal in the window |

`trading_range` is not emitted. Several segments produce several `results` items, in scan order.

## Levels

Shape: `Level[]` (`{ name, price, time }`). Two entries, chronological. Names are unique inside one item. `time` is the bar open via `toTimeString` (already stored on a copied `K2`).

| Segment | First level | Second level |
|---------|-------------|--------------|
| `bull_trend` | `L1` = opening `K2` | `H1` = closing `K2`, or last bar `high` when open |
| `bear_trend` | `H1` = opening `K2` | `L1` = closing `K2`, or last bar `low` when open |

`unclear` uses `levels: []`.

`range.start` is the opening `K2` time. `range.end` is the closing `K2` time, or the last bar’s open time when the segment is open. For `unclear`, `range` spans the first bar through the last bar.

## Summary template

```text
trends={count}; last={lastName} from={from} to={to}
```

| Placeholder | Source |
|-------------|--------|
| `{count}` | Number of trend items (0 when the only item is `unclear`) |
| `{lastName}` | `name` of the last `results` item |
| `{from}` | Last segment’s opening `K2` time; `-` when that item has no levels |
| `{to}` | Last segment’s end time (closing `K2` or last bar); `-` when that item has no levels |

Examples:

```text
trends=1; last=bull_trend from=2023-11-14T22:14:20Z to=2023-11-14T22:16:20Z
trends=0; last=unclear from=- to=-
```

## Evidence

```ts
type SwingTrendEvidence = Record<string, never>;
```

Always `{}`. Geometry and classification live in `results`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| 1–2 bars, or no confirmed reversal | `unclear`, do not throw |
| Reversal item missing `K2` | Throw `Error` |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Bull | One bull reversal, bars after its `K2` | One `bull_trend`; `L1` is that `K2`; `H1` is the last bar’s high |
| Bear | One bear reversal | One `bear_trend`; `H1` is that `K2`; `L1` is the last bar’s low |
| Same-direction run | Two bull pairs then no opposite | One `bull_trend` starting at the later `K2` |
| Three reversals | Bull, bear, bull, with bars after the last `K2` | Two closed segments plus one open segment; adjacent ranges share the middle `K2` |
| No reversal | Doji / no confirmed pair | `unclear`, empty levels |
| Short | 1 or 2 bars | `unclear`, range covers the window |
| Invalid | Non-array, empty array | `TypeError` |
| Contract | Any success path | `confidence === 1`, `evidence` is `{}`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
