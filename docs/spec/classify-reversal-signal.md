# classifyReversalSignal

Authoritative function spec.

## Intent

Find one or more reversal signals in a caller-supplied `Bar[]`.

- **Bull reversal:** bearish K1, adjacent K2 that makes a lower low without a higher high, then a later bar that prints a higher high and a higher low versus K2.
- **Bear reversal:** bullish K1, adjacent K2 that makes a higher high without a lower low, then a later bar that prints a lower high and a lower low versus K2.

Each signal is one `AnalyzeResult`. A later bar that breaks K2’s extreme before confirmation voids that pair and restarts the search.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifyReversalSignal` |
| Export | `classifyReversalSignal` |
| Impl path | `src/analyze/classifyReversalSignal.ts` |
| Tests | `tests/analyze/classifyReversalSignal.test.ts` |
| Status | **implemented** |

## Parameters

```ts
function classifyReversalSignal(
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
| `toTimeString` | **exists** | `src/utils/time.ts` — `results[].levels` / `results[].range` |
| `fillSummary` | **exists** | `src/utils/summary.ts` |
| `AnalysisResult` types | **exists** | Labels `bull_reversal` / `bear_reversal` / `no_reversal` and levels `K1` / `K2` / `Confirm` added with this function |

Candle color and inside-bar checks stay private to this function. No second caller yet.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0` (`range.start` needs a bar time).
2. When `bars.length < 3`, return one `AnalyzeResult` with `name: "unclear"`, `levels: []`, and `range` from the first bar’s open time to the last bar’s open time. Do not throw.
3. Otherwise scan from index `i = 0` while a K1 and the next bar both exist (`i <= length - 2`):
   1. **K1 color.** Bearish (`close < open`) starts a bull setup. Bullish (`close > open`) starts a bear setup. Doji (`close === open`) is not a K1; set `i = i + 1` and continue. K2 and the confirm bar have no color requirement (a doji may be either).
   2. **Adjacent K2** (`i + 1`):
      - Bull: `K2.low < K1.low` and `K2.high <= K1.high`.
      - Bear: `K2.high > K1.high` and `K2.low >= K1.low`.
      - If K2 fails, set `i = i + 1` and continue.
   3. **Scan** `j` from `i + 2` through the last bar, in order:
      - **Invalidate** before any other test. Bull: `low < K2.low`. Bear: `high > K2.high`. The pair is void. Set `i` to `j - 1` (that bar’s previous bar becomes the next K1 candidate) and stop this scan. `j` is at least `i + 2`, so `j - 1 > i`.
      - **Inside bar** versus the immediate previous bar: `high <= prev.high` and `low >= prev.low` (equality counts as inside). Skip it. The next bar is still compared to K2, not to the skipped bar.
      - **Confirm** versus K2. Bull: `high > K2.high` and `low > K2.low`. Bear: `high < K2.high` and `low < K2.low`. Emit one signal. Set `i` to `j + 1` (the bar after the confirm bar). The confirm bar is not reused as the next K1.
      - Otherwise keep scanning.
   4. If the scan reaches the end with no confirm and no invalidation, set `i = i + 1`.
4. Invalidation applies only before that pair confirms. An emitted signal stays in `results` if a later bar breaks the old extreme.
5. Bars between K2 and the confirm bar are not separate K1 starts for that committed pair. After a failed pair (bad K2, or scan ends with no event), the next start is the following bar, so a later adjacent pair can still match.
6. When the scan finishes with no signals and `bars.length >= 3`, return one `no_reversal` item, `levels: []`, `range` from the first bar to the last bar. Do not return `results: []`.
7. Collapse consecutive same-direction signals before building the result. Walk the confirmed list in scan order. When the next signal has the same `name` as the one just kept, replace that kept item with the later signal. A direction change starts a new kept item. Dropped signals are absent from `results` and from `summary`. `unclear` / `no_reversal` skip this step.
8. Build `summary` from the template below using the collapsed list. `confidence` is `1`. `evidence` is `{}`.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `bull_reversal` | One confirmed bull pair |
| `bear_reversal` | One confirmed bear pair |
| `no_reversal` | At least 3 bars, scan found nothing |
| `unclear` | 1 or 2 bars (too short to form K1, K2, and a later bar) |

`bull_trend` / `bear_trend` are not used. Several signals produce several `results` items, in scan order, after same-direction runs collapse to the latest signal. The same `name` appears twice only when an opposite signal sits between them.

## Levels

Shape: `Level[]` (`{ name, price, time }`). Order inside one signal is always `K1`, `K2`, `Confirm`. Names are unique inside one item. `time` is the bar open via `toTimeString`.

| LevelName | Bar | Bull `price` | Bear `price` |
|-----------|-----|--------------|--------------|
| `K1` | Setup candle | high | low |
| `K2` | Extreme candle | low | high |
| `Confirm` | Confirming candle (not always the third bar) | high | low |

`unclear` and `no_reversal` use `levels: []`.

`range.start` is K1’s open time. `range.end` is the confirm bar’s open time. For `unclear` / `no_reversal`, `range` spans the first bar through the last bar.

## Summary template

```text
reversals={count}; last={lastName} K1@{K1} K2@{K2} confirm@{Confirm}
```

| Placeholder | Source |
|-------------|--------|
| `{count}` | Number of reversal items (0 when the only item is `no_reversal` or `unclear`) |
| `{lastName}` | `name` of the last `results` item |
| `{K1}` `{K2}` `{Confirm}` | That last signal’s level times; `-` when that item has no levels |

Examples:

```text
reversals=1; last=bull_reversal K1@2023-11-14T22:13:20Z K2@2023-11-14T22:14:20Z confirm@2023-11-14T22:15:20Z
reversals=0; last=no_reversal K1@- K2@- confirm@-
```

## Evidence

```ts
type ReversalSignalEvidence = Record<string, never>;
```

Always `{}`. Geometry and classification live in `results`.

## Errors

| Case | Behavior |
|------|----------|
| `bars` is not an array, or `bars.length === 0` | Throw `TypeError` |
| 1–2 bars | `unclear`, do not throw |
| No confirmed pair | `no_reversal`, do not throw |

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Bull | Bearish K1, lower-low K2 with `high <= K1.high`, next bar HH+HL vs K2 | One `bull_reversal`, three levels, bull prices |
| Inside skip | A later bar is inside the previous bar but would confirm vs K2; a following bar confirms | Confirm is the later bar, not the inside bar |
| Invalidate | A bar after K2 prints `low < K2.low` before confirm; a new bull pair starts at that bar’s previous index | First pair absent; the restarted pair is emitted |
| Bear | Mirror of the bull triple | One `bear_reversal`, bear prices |
| Same-direction run | Two bull pairs, the second starting after the first confirm bar | Only the later `bull_reversal`; summary `count` is 1 |
| Direction change | Bull pair then a bear pair | Both items; summary `count` is 2 and uses the bear |
| Resume | Confirm bar would be a valid bear K1 with the following bars | No `bear_reversal`; search starts at confirm+1 |
| Doji K1 | Doji would form a bull pair with the next two bars if accepted as K1 | `no_reversal` |
| K2 pierces K1 high | Bull K2 `high > K1.high` | `no_reversal` |
| Short | 1 or 2 bars | `unclear`, empty levels |
| Invalid | Non-array, empty array | `TypeError` |
| Contract | Any success path | `confidence === 1`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
