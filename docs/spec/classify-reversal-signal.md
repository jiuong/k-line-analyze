# classifyReversalSignal

Authoritative function spec.

## Intent

Find one or more reversal signals in a caller-supplied `Bar[]`. Each candidate starts as three adjacent bars: K1, K2, and K3. K2 is the signal bar.

- **Bull pivot:** `K1.high > K2.high` and `K3.high > K2.high`, and K3 does not engulf K2.
- **Bear pivot:** `K1.low < K2.low` and `K3.low < K2.low`, and K3 does not engulf K2.
- **K3 engulfs K2:** `K3.high > K2.high` and `K3.low < K2.low`. Bull/bear pivots are not used. A bullish K3 measures only the upward excess; a bearish K3 measures only the downward excess. Excess greater than half the covered bar’s range uses that bar’s color. Excess that is not greater looks at the next bar: only a higher high is bull, only a lower low is bear. If that next bar also engulfs, repeat the same comparison. A doji emits nothing.

Do not call these pivots `H1` / `L1`. Those LevelNames are reserved for Brooks entry anchors (`secondEntries` / `classifySwingTrend` H2·L2 marks; full-series `countAdjacentEntries` is a separate helper).

A gap is part of the next bar’s body via `withGapBody`. The first bar has no previous bar. Wicks that touch or overlap, including equals, are not a gap. Neighbors in the array stay consecutive when their open times are hours apart. A missing bar does not skip that pair, and the gap-body rule still applies.

- **Gap up** (`bar.low > prev.high`): the gap from `prev.high` to `bar.low` belongs to this bar. Compare with `open = prev.high` and `low = prev.high`. `high` and `close` stay. `close` is above that open, so the bar is bullish even when the print is bearish or a doji.
- **Gap down** (`bar.high < prev.low`): compare with `open = prev.low` and `high = prev.low`. `low` and `close` stay. The bar is bearish.

Engulf color uses that open against `close`. Bull/bear pivots, engulf, one-sided breaks, and the half-length test use the adjusted high and low. Covered length is the adjusted `high − low`. A pure gap still does not engulf the previous bar: the extended extreme only meets that bar. Level prices stay the printed high and low.

Comparisons are strict. After a confirm, the next K1 may be that K2. Consecutive same-direction signals keep the first one.

The previous legacy / inside / engulf geometry is commented out in the implementation and is not used. The engulf check above is the live rule.

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
| `AnalysisResult` types | **exists** | Labels `bull_reversal` / `bear_reversal` / `no_reversal` and levels `K1` / `K2` / `Confirm` |

Bull/bear pivot checks stay private to this function. `classifySwingTrend` consumes the result and does not reimplement the scan.

## Algorithm

1. Throw `TypeError` when `bars` is not an array or `bars.length === 0` (`range.start` needs a bar time).
2. When `bars.length < 3`, return one `AnalyzeResult` with `name: "unclear"`, `levels: []`, and `range` from the first bar’s open time to the last bar’s open time. Do not throw.
3. Otherwise scan from index `i = 0` while three bars exist (`i <= length - 3`). The window starts at `K1 = bars[i]`, `K2 = bars[i + 1]`, `K3 = bars[i + 2]`. There is no inside-bar skip and no invalidation restart. A larger gap between open times does not split the window.
4. Before each comparison, replace a bar that gaps away from the previous bar with the body described above. Do not mutate `bars`. The first bar is unchanged. Then resolve the window:
   1. **Engulf** when `K3.high > K2.high` and `K3.low < K2.low`. Do not evaluate bull/bear pivots. Compare the engulfing bar with the bar it covers, starting at K3 versus K2:
      - `close === open` on the gap-adjusted bar: miss. A doji has no side to measure. A gap-up doji is bullish; a gap-down doji is bearish.
      - Bullish (`close > open`): excess is `high - covered.high`.
      - Bearish (`close < open`): excess is `covered.low - low`.
      - Covered length is the gap-adjusted `covered.high - covered.low`. Excess **greater than** half that length: one signal in this bar’s color. Confirm is this bar. Do not read further bars.
      - Excess **not greater** than half: do not use color. Read the next bar against this one.
        - No next bar, or it breaks neither extreme: miss.
        - Only `next.high > this.high`: one bull. Confirm is the next bar.
        - Only `next.low < this.low`: one bear. Confirm is the next bar.
        - The next bar strictly engulfs this one: repeat this comparison for that pair. Do not treat the two-sided break as a miss.
   2. Otherwise **bull pivot** when `K1.high > K2.high` and `K3.high > K2.high`. Confirm is K3.
   3. Otherwise **bear pivot** when `K1.low < K2.low` and `K3.low < K2.low`. Confirm is K3.
   A window whose K3 is outside both sides of K2 is the engulf case, so bull and bear pivots are not both emitted.
5. On a miss, set `i = i + 1`. On a hit, set `i` to the K2 index (`i + 1`). The next K1 is that K2.
6. When the scan finishes with no signals and `bars.length >= 3`, return one `no_reversal` item, `levels: []`, `range` from the first bar to the last bar. Do not return `results: []`.
7. Collapse consecutive same-direction signals before building the result. Walk the confirmed list in scan order. When the next signal has the same `name` as the one just kept, drop the later signal. A direction change starts a new kept item. Dropped signals are absent from `results` and from `summary`. `unclear` / `no_reversal` skip this step.
8. Build `summary` from the template below using the collapsed list. `confidence` is `1`. `evidence` is `{}`.

## Labels

| `results[].name` | Condition |
|------------------|-----------|
| `bull_reversal` | One bull pivot, a bullish engulf whose color-side excess is greater than half the covered range, or a one-sided higher high after a smaller engulf |
| `bear_reversal` | One bear pivot, a bearish engulf whose color-side excess is greater than half the covered range, or a one-sided lower low after a smaller engulf |
| `no_reversal` | At least 3 bars, scan found nothing |
| `unclear` | 1 or 2 bars (too short to form K1, K2, and K3) |

`bull_trend` / `bear_trend` are not used. Several signals produce several `results` items, in scan order, after same-direction runs collapse to the first signal. The same `name` appears twice only when an opposite signal sits between them.

## Levels

Shape: `Level[]` (`{ name, price, time }`). Order inside one signal is always `K1`, `K2`, `Confirm`. Names are unique inside one item. `time` is the bar open via `toTimeString`.

| LevelName | Bar | Bull `price` | Bear `price` |
|-----------|-----|--------------|--------------|
| `K1` | First bar of the window | printed high | printed low |
| `K2` | Signal bar | printed high | printed low |
| `Confirm` | K3 for a bull/bear pivot. For an engulf, the bar whose color was used, or the bar that breaks one side after a smaller engulf | printed high | printed low |

`unclear` and `no_reversal` use `levels: []`.

`range.start` is K1’s open time. `range.end` is Confirm’s open time. For `unclear` / `no_reversal`, `range` spans the first bar through the last bar.

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
| Bull pivot | K2 high below both neighbors, K2 low not above both | One `bull_reversal`; prices are the highs; K2 price is `K2.high` |
| Bear pivot | K2 low above both neighbors, K2 high not below both | One `bear_reversal`; prices are the lows; K2 price is `K2.low` |
| Engulf, large bull | Bullish K3; upward excess greater than half of K2’s range | One `bull_reversal`; Confirm is K3 |
| Engulf, large bear | Bearish K3; downward excess greater than half of K2’s range | One `bear_reversal`; Confirm is K3 |
| Engulf, small, higher high | Color-side excess not greater than half; K4 breaks only K3’s high | One `bull_reversal`; Confirm is K4 |
| Engulf, small, lower low | Color-side excess not greater than half; K4 breaks only K3’s low | One `bear_reversal`; Confirm is K4 |
| Engulf, exact half | Color-side excess equals half of K2’s range; K4 breaks only the high | One `bull_reversal`; Confirm is K4 |
| Engulf, next engulfs | K3 excess is small; K4 engulfs K3 and its own excess is greater than half | One signal in K4’s color; Confirm is K4 |
| Engulf doji | K3 engulfs K2 and `close === open` | `no_reversal` |
| Engulf, three bars, small | K3 excess is not greater than half, and there is no K4 | `no_reversal` |
| Engulf, three bars, large | Bullish K3 excess is greater than half, and there is no K4 | One `bull_reversal`; Confirm is K3 |
| Equal high | K3 high equals K2 high | Not a bull pivot |
| Gap up, low inside the gap | K2 gaps up; K3 low sits between the previous high and K2’s printed low | Not a bear pivot |
| Gap up, low through the gap | K3 low is below the previous high | One `bear_reversal`; K2 price is K2’s printed low |
| Gap down, high inside the gap | K2 gaps down; K3 high is above K2’s printed high and at or below the previous low | Not a bull pivot |
| Gap in the covered length | Covered bar gaps; color-side excess beats half the printed range and not half the range that includes the gap | Small engulf; Confirm is the next bar |
| Gap-up bearish or doji | The bar after a gap up is a bearish print or a doji, and it does not overlap the previous bar | Not an engulf of that previous bar |
| Touching wicks | `low` equals the previous `high` | Not a gap; a bear pivot that uses that low still stands |
| Time hole | The same gap-up geometry, with hours between the two bars | Still not a bear pivot. The missing bars are not a reason to skip the pair |
| Same-direction run | Two bull pivots in a row | Only the first `bull_reversal` |
| Resume at K2 | The window starting on the confirmed K2 is a bear pivot | The second `range.start` is the first signal’s K2 |
| Short | 1 or 2 bars | `unclear`, empty levels |
| Invalid | Non-array, empty array | `TypeError` |
| Contract | Any success path | `confidence === 1`, summary matches the template |

Inject synthetic `Bar[]`. Do not call MT5.
