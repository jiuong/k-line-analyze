# Shared types contract

Extensible enums and the unified analysis result. Mirrored in [`src/types/analysis.ts`](../../../../src/types/analysis.ts). When adding a value, update **this file**, `src/types`, and the function’s `docs/spec/`.

## Primitive aliases

```ts
/** ISO-8601 UTC, e.g. "2024-01-01T00:00:00Z" — LLM-friendly */
type TimeString = string;

/** UTC Unix seconds — MT5 wire format */
type UnixSeconds = number;
```

## TimeFrame

Must stay aligned with MT5 `/bars` `timeframe`:

```ts
type TimeFrame =
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M10" | "M12" | "M15" | "M20" | "M30"
  | "H1" | "H2" | "H3" | "H4" | "H6" | "H8" | "H12"
  | "D1" | "W1" | "MN1";
```

## LevelName (extensible)

Point / swing / pattern anchors. Add names in specs when a function needs them; keep semantics stable once published.

| LevelName | Typical use |
|-----------|-------------|
| `H1` `H2` `H3` | Adjacent-bar high entry anchors (`entryCounts` / `classifySwingTrend`); K1.high + tick on K2 |
| `L1` `L2` `L3` | Adjacent-bar low entry anchors; K1.low − tick on K2 |
| `BullTrendStart` `BullTrendEnd` | Bull trend segment endpoints (`classifySwingTrend`) |
| `BearTrendStart` `BearTrendEnd` | Bear trend segment endpoints (`classifySwingTrend`) |
| `Top1` `Top2` | Double-top peaks |
| `Bottom1` `Bottom2` | Double-bottom troughs |
| `Neckline` | Counter-swing extreme between the two same-side swings (`classifyDoubleTopBottom`) |
| `K1` `K2` `Confirm` | Reversal setup, extreme, and confirm bar (`classifyReversalSignal`; price depends on bull vs bear) |
| `RangeHigh` `RangeLow` | Trading-range resistance and support (`classifyTradingRange` / swing `trading_range`); price is that bar’s high or low |
| `PullbackStart` `PullbackExtreme` | Reference extreme before a pullback, and the deepest adverse price of that pullback (`classifyPullback`) |
| `BarHigh` `BarLow` | Printed high and low of one shape bar (`classifyTrendBar`, `classifyDoji`, `classifyInsideBar`, `classifyOutsideBar`) |
| `LegStart` `LegEnd` | Swing price at the first and last pivot of one leg (`classifySwingLeg`). Bull: low then high. Bear: high then low |
| `GapNear` `GapFar` | Near and far edges of one body gap (`classifyBodyGap`). Gap up: previous high and this low. Gap down: previous low and this high |
| `ChannelHigh1` `ChannelHigh2` | Upper-rail touches of one channel, earlier then later (`classifyChannel`) |
| `ChannelLow1` `ChannelLow2` | Lower-rail touches of one channel, earlier then later (`classifyChannel`) |
| `PriorExtreme` | Earlier same-side swing being retested (`classifyExtremeRetest`) |
| `Retest` | Later swing that stays inside that extreme (`classifyExtremeRetest`) |
| `BreakBar` | Close of the bar that crosses a countertrend channel rail (`classifyTrendlineBreak`) or a range edge (`classifyRangeBreak`) |
| `BrokenEdge` | Copied `RangeHigh` or `RangeLow` that the close left (`classifyRangeBreak`) |
| `FollowBar` | Close of the last bar in a follow-through run (`classifyFollowThrough`) |
| `ReturnBar` | Close of the bar that returns inside a broken edge (`classifyFailedBreakout`) |
| `SignalBar` | Fade extreme on the return bar (`classifyFailedBreakout`). Up-break failure: low. Down-break failure: high |
| `Entry` | `entryBeyond` of `SignalBar` (`classifyFailedBreakout`). Omitted `tickSize` leaves the extreme |
| `Stop` | `stopBeyond` the break bar's protective extreme (`classifyFailedBreakout`) |
| `Target` | Opposite range edge via `targetFrom` (`classifyFailedBreakout`) |
| `P1` `P2` `P3` | Fib-extension anchors for second entry (`classifySecondEntry`). P1/P2 = prior with-trend swing leg; P3 = K1 adverse extreme |
| `TP1` `TP2` `TP3` `TP4` | Fib extension prices at `1` / `1.272` / `1.414` / `1.618` from P1–P3 (`classifySecondEntry`) |
| `Push1` `Push2` `Push3` | Three same-direction swing extremes, earlier then later (`classifyWedge`). Top: highs. Bottom: lows |

```ts
type LevelName =
  | "H1" | "H2" | "H3"
  | "L1" | "L2" | "L3"
  | "BullTrendStart" | "BullTrendEnd"
  | "BearTrendStart" | "BearTrendEnd"
  | "Top1" | "Top2"
  | "Bottom1" | "Bottom2"
  | "Neckline"
  | "K1" | "K2" | "Confirm"
  | "RangeHigh" | "RangeLow"
  | "PullbackStart" | "PullbackExtreme"
  | "BarHigh" | "BarLow"
  | "LegStart" | "LegEnd"
  | "GapNear" | "GapFar"
  | "ChannelHigh1" | "ChannelHigh2"
  | "ChannelLow1" | "ChannelLow2"
  | "PriorExtreme" | "Retest"
  | "BreakBar"
  | "BrokenEdge"
  | "FollowBar"
  | "ReturnBar"
  | "SignalBar"
  | "Entry"
  | "Stop"
  | "Target"
  | "P1" | "P2" | "P3"
  | "TP1" | "TP2" | "TP3" | "TP4"
  | "Push1"
  | "Push2"
  | "Push3";
  // extend as needed
```

Each entry in `results[].levels` is a `Level` (`name` + `price` + `time`) for the candle that defines the point. `time` is the bar open time as `TimeString` unless a spec says otherwise; `price` semantics (high / low / close / etc.) are defined per `LevelName` in the function spec. The type allows duplicate `name` values; uniqueness is a function-spec concern.

```ts
type Level = {
  name: LevelName;
  price: number;
  time: TimeString;
};
```

## AnalysisLabel (extensible)

Machine-readable primary classification. Prefer stable professional terms.

| Label | Meaning |
|-------|---------|
| `bull_trend` | Merged bull swing-leg chain (`classifySwingTrend`): same-direction legs continue when a pullback holds the prior low and the next impulse makes a higher high. A covering opposite leg ends the bull trend |
| `bear_trend` | Merged bear swing-leg chain (`classifySwingTrend`): same-direction legs continue when a pullback holds the prior high and the next impulse makes a lower low. A covering opposite leg ends the bear trend |
| `minor_bull_trend` | Bull segment of at most 3 bars nested inside a larger bear trend (`classifySwingTrend`) |
| `minor_bear_trend` | Bear segment of at most 3 bars nested inside a larger bull trend (`classifySwingTrend`) |
| `trading_range` | Segment of at least 3 bars whose high–low span is at most 1.5× the average bar height, and not a single-leg trend (`classifySwingTrend`) |
| `unclear` | Insufficient structure / data |
| `bull_reversal` | Bull pivot, or a large bullish engulf, or a higher high after a smaller engulf (`classifyReversalSignal`) |
| `bear_reversal` | Bear pivot, or a large bearish engulf, or a lower low after a smaller engulf (`classifyReversalSignal`) |
| `no_reversal` | Enough bars to scan, no reversal confirmed |
| `broad_trading_range` | Horizontal Brooks range from swing legs: two tests of each boundary, boundary drift under 0.2 of the height, similar up and down legs, and not inside an extended swing trend (`classifyTradingRange`) |
| `tight_trading_range` | Short overlapping range with two separated tests of each edge and two opposite legs. Height is at most 2.5× its median bar height, unless a later close is still inside the shelf. A poke of at least 1.5× the edge height ends the run (`classifyTradingRange`) |
| `barbwire` | Tight range of tailed bars with at least one doji, and two separated tests of each edge (`classifyTradingRange`) |
| `breakout_mode` | Tight range of at least 20 bars, with two separated tests of each edge, and either barbwire or two opposite legs (`classifyTradingRange`) |
| `consolidation_pullback` | Range clipped to the gap between two same-direction major trends (`classifyPullback`) |
| `bar_pullback` | One adverse-body leg inside a major trend (`classifyPullback`) |
| `multi_leg_pullback` | Two or more adverse legs in one pause that has not broken the prior trend extreme (`classifyPullback`) |
| `leg_pullback` | A `minor_*` segment with fewer than two adverse legs (`classifyPullback`) |
| `bull_trend_bar` | One bar whose body is at least half the range and whose close is above the open (`classifyTrendBar`) |
| `bear_trend_bar` | One bar whose body is at least half the range and whose close is below the open (`classifyTrendBar`) |
| `doji` | One bar whose body is at most a quarter of the range (`classifyDoji`) |
| `inside_bar` | High and low sit inside the previous bar, with at least one side stricter (`classifyInsideBar`) |
| `outside_bar` | High is above the previous high and low is below the previous low (`classifyOutsideBar`) |
| `bull_leg` | One swing low followed by the next swing high (`classifySwingLeg`) |
| `bear_leg` | One swing high followed by the next swing low (`classifySwingLeg`) |
| `open_body_gap` | An adjacent gap that no later bar has reached (`classifyBodyGap`) |
| `filled_body_gap` | An adjacent gap whose near edge a later bar has reached (`classifyBodyGap`) |
| `bull_channel` | Rising channel from two adjacent bull legs (`classifyChannel`) |
| `bear_channel` | Falling channel from two adjacent bear legs (`classifyChannel`) |
| `higher_low` | Later swing low strictly above the prior low and outside the tolerance band (`classifyExtremeRetest`) |
| `lower_high` | Later swing high strictly below the prior high and outside the tolerance band (`classifyExtremeRetest`) |
| `bull_line_break` | Close above a bear channel's upper rail (`classifyTrendlineBreak`) |
| `bear_line_break` | Close below a bull channel's lower rail (`classifyTrendlineBreak`) |
| `range_break` | First close beyond a trading-range edge after that segment ends (`classifyRangeBreak`) |
| `follow_through` | Trend bars after a `range_break` that keep closing beyond the broken edge (`classifyFollowThrough`) |
| `failed_breakout` | A `range_break` with no follow-through whose later close returns inside the broken edge (`classifyFailedBreakout`) |
| `micro_double_top` | Adjacent highs inside the price tolerance, and the later bar is not outside (`classifyMicroDouble`) |
| `micro_double_bottom` | Adjacent lows inside the price tolerance, and the later bar is not outside (`classifyMicroDouble`) |
| `double_top` | Two swing highs in one price band with a swing low between them (`classifyDoubleTopBottom`) |
| `double_bottom` | Two swing lows in one price band with a swing high between them (`classifyDoubleTopBottom`) |
| `wedge_top` | Three rising or flat swing highs whose later gap is not wider than the earlier gap plus tolerance (`classifyWedge`) |
| `wedge_bottom` | Three falling or flat swing lows, with the same gap rule (`classifyWedge`) |
| `bull_major_reversal` | A `bear_line_break` followed by the next unused `higher_low` (`classifyMajorTrendReversal`) |
| `bear_major_reversal` | A `bull_line_break` followed by the next unused `lower_high` (`classifyMajorTrendReversal`) |

```ts
type AnalysisLabel =
  | "bull_trend"
  | "bear_trend"
  | "minor_bull_trend"
  | "minor_bear_trend"
  | "trading_range"
  | "unclear"
  | "bull_reversal"
  | "bear_reversal"
  | "no_reversal"
  | "broad_trading_range"
  | "tight_trading_range"
  | "barbwire"
  | "breakout_mode"
  | "consolidation_pullback"
  | "bar_pullback"
  | "multi_leg_pullback"
  | "leg_pullback"
  | "bull_trend_bar"
  | "bear_trend_bar"
  | "doji"
  | "inside_bar"
  | "outside_bar"
  | "bull_leg"
  | "bear_leg"
  | "open_body_gap"
  | "filled_body_gap"
  | "bull_channel"
  | "bear_channel"
  | "higher_low"
  | "lower_high"
  | "bull_line_break"
  | "bear_line_break"
  | "range_break"
  | "follow_through"
  | "failed_breakout"
  | "micro_double_top"
  | "micro_double_bottom"
  | "double_top"
  | "double_bottom"
  | "wedge_top"
  | "wedge_bottom"
  | "bull_major_reversal"
  | "bear_major_reversal";
  // extend per function (document in docs/spec + here)
```

Functions may introduce new labels; never overload an existing label with a different meaning.

## AnalyzeResult

One detected structure. A function may return several.

```ts
type AnalyzeResult = {
  /** Classification for this structure (formerly top-level label) */
  name: AnalysisLabel;
  /** Time span of this structure (not necessarily the full input window) */
  range: { start: TimeString; end?: TimeString };
  levels: Level[];
};
```

## AnalysisResult

```ts
type AnalysisResult<TEvidence = unknown> = {
  functionId: string;
  results: AnalyzeResult[];
  /** Filled from the function’s summary template only */
  summary: string;
  /** Deterministic code path — always 1 for now */
  confidence: 1;
  /**
   * Function-specific extras not expressible as named levels.
   * Prefer a minimal object (or empty) when geometry fits in results/summary.
   */
  evidence: TEvidence;
};
```

### Field notes

- No `symbol` / `timeframe` on the result — instrument context stays with the caller (analyzers receive only `Bar[]`).
- `results`: required array. Each item carries `name`, `range`, and `levels`. `summary`, `confidence`, and `evidence` stay on the outer result and are shared.
- `range`: for a trend segment, typically from earliest used swing bar to latest used swing bar (or last bar of the structure). Define precisely in each `docs/spec`.
- `levels`: geometric authority for named anchors (`name` + `price` + `time`). Use `[]` only if that structure has no points.
- Insufficient structure still returns an `AnalyzeResult` whose `name` is a defined label (e.g. `unclear`). Do not use an empty `results` array in place of that label.
- `evidence`: always present, JSON-serializable; put only facts that cannot be derived from `results` / `summary` (e.g. resolved params, scores, counts). Schema is per function in `docs/spec`.

## Standard analyzer input

Analyzers receive MT5-aligned bars (same shape as `/bars` `data[]` / `src/types/bars.ts`). They do **not** fetch data.

```ts
type Bar = {
  time: UnixSeconds;
  open: number;
  high: number;
  low: number;
  close: number;
  tick_volume?: number;
  spread?: number;
  real_volume?: number;
};
```

Every public analyzer:

```ts
(bars: Bar[], options?: TOptions) => AnalysisResult<TEvidence>
```

Prefer **sync** return (no I/O inside analyzers). `options` is function-specific; omit when unused.

## Planned labels and levels (not in the union yet)

The Brooks atom specs under `docs/spec/` reserve the names below. Do not add them to `src/types/analysis.ts` until the function that owns the name is implemented. Contract for I/O, boundaries, and constraints: [`docs/spec/brooks-shared.md`](../../../../docs/spec/brooks-shared.md).

Planned `AnalysisLabel` values: none.

Implemented in this batch: `high1`, `high2`, `high3`, `low1`, `low2`, `low3`, `bull_signal_bar`, `bear_signal_bar`, `buy_climax`, `sell_climax`, `breakout_pullback`, `micro_double_top`, `micro_double_bottom`, `double_top`, `double_bottom`, `wedge_top`, `wedge_bottom`, `bull_major_reversal`, `bear_major_reversal`.

`Push1`, `Push2`, and `Push3` are in the type union. They are the wedge push extremes, earlier then later.

Result labels `high1`–`high3` / `low1`–`low3` stay semantic; LevelNames `H1`–`H3` / `L1`–`L3` are the overlay entry anchors from the same `entryCounts` logic. Overlay may show `H1` for a `high1` `SignalBar`. `Top1` / `Top2` / `Bottom1` / `Bottom2` stay double-test anchors. `Neckline` is the counter-swing between those two same-side swings.
