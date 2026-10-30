# Project tasks

Local tracker when Linear is unavailable. Status: `todo` | `doing` | `done` | `blocked` | `deferred` | `superseded`.

Product goal / requirements: [`goal.md`](goal.md), [`requirements.md`](requirements.md).

Architecture: [`architecture/data.md`](architecture/data.md), [`architecture/analyze.md`](architecture/analyze.md), [`architecture/chart.md`](architecture/chart.md).

## Parent: Docs & product baseline

| ID | Task | Status | Notes |
|----|------|--------|-------|
| docs-goal-requirements | Goal + requirements docs | done | `docs/goal.md`, `docs/requirements.md` |
| docs-specification-modules | Module specs under `docs/specification/` | done | `data` / `analyze` / `chart` + README index |
| docs-architecture-data | Data module architecture doc | done | lean arc42; callers load `Bar[]`, analyzers stay fetch-free |
| docs-architecture-analyze | Analyze module architecture doc | done | lean arc42; `Bar[]` → `AnalysisResult`; pure, no fetch |
| docs-architecture-chart | Chart module architecture doc | done | lean arc42; `@trading-playback/kline-chart`; `setBars` + `layer_drawings`; no playback |

## Parent: FR-1 Data (MT5 + local persist)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| scaffold-fetchBars | MT5 bars HTTP client | done | `src/data/fetchBars.ts` + mock tests |
| pull-bars-cli-fixture | CLI pull + local fixture loader | done | `scripts/pull-bars.ts`, `testdata/bars/` gitignored |
| docs-local-testdata | README + contract local fixture notes | done | |
| persist-store-schema | Local JSON store layout + write API | done | `src/data/barsStore.ts`; CLI uses `writeBarsFixture`; root `testdata/bars/` |
| persist-coverage | Query-window coverage check | done | `src/data/barsCoverage.ts` — v1 endpoint coverage (`barsCoverQuery`) |
| persist-read-through | Read-through + offline load | done | `src/data/loadBars.ts` — local hit / refresh / write-back / offline; mock tests |
| persist-local-bars | *(umbrella)* Product persist + read-through / offline | superseded | Split into `persist-store-schema`, `persist-coverage`, `persist-read-through`. Engine = JSON files |

Order: `persist-store-schema` → `persist-coverage` → `persist-read-through`.

## Parent: FR-2 Analyze (price action)

### This phase (public types + scaffolding)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| skill-kline-analyze-fn | Project Cursor skill for generating analyzers | done | `.cursor/skills/kline-analyze-fn/` |
| spec-classify-swing-trend | Spec for swing trend classifier | done | `docs/spec/classify-swing-trend.md` — reversal K2 segments; see `impl-classify-swing-trend` |
| scaffold-pkg-types | Node/TS/Vitest + bars types (`Bar`/`TimeFrame`) | done | `package.json`, `src/types/bars.ts` |
| docs-analyze-input-bars | Analyze Input = MT5 `Bar[]`; sync contracts | done | Drop `AnalyzeParams`; analyzers sync; no internal fetch |
| scaffold-types | Shared `AnalysisResult` / enums in `src/types` | done | `src/types/analysis.ts` mirrors skill types-contract; no `symbol`/`timeframe` on result |
| util-fill-summary | `fillSummary(template, vars)` helper | done | `src/utils/summary.ts` — `{key}` placeholders; missing/nullish throws |
| reshape-analysis-result | Move `range` / `levels` / `label` into `results: AnalyzeResult[]` | done | Breaking for the result type: `LevelPoint` removed; `Level` is `{ name, price, time }`. No concrete analyzers yet. No FR-2 Linear parent — tracked here |
| scaffold-analyze-module | Analyze package skeleton | done | `src/analyze/index.ts` + `tests/analyze/`; `AnalyzerFn` export. Concrete analyzers landed in later tasks |
| util-time-summary | *(renamed)* summary fill helper | superseded | Replaced by `util-fill-summary` |

Order: `scaffold-types` ∥ `util-fill-summary` → `scaffold-analyze-module` → `reshape-analysis-result`.

### classifySwingTrend

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| impl-classify-swing-trend | Implement + unit tests | done | Originally reversal K2 segments; superseded by `swing-trend-via-legs` |
| spec-swing-trend-legs | Spec: leg-merge trends | done | `docs/spec/classify-swing-trend.md` — findSwings → findSwingLegs → merge; pullback = bar / leg / opposite trend |
| impl-swing-trend-legs | Replace cut with leg merge | done | `classifySwingTrend` reads `findSwingLegs`; covering opposite opens reverse trend |
| regress-pullback-twp | Downstream pullback / TWP | done | Fixtures use `swingSpan: 1`; `classifyPullback` / TWP forward `swingSpan` |
| swing-range-and-minor | Overlap → `trading_range`; nest short countertrends | done | At least 3 bars and span ≤ 1.5× average height → `trading_range`. A ≤3-bar countertrend inside a larger trend → `minor_*`, after the outer segments merge. No FR-2 Linear parent |
| swing-minor-display | Sidebar toggle for minor-cycle trends | done | Nested checkbox under Swing trend, default off. `visibleReviewResults` hides `minor_*` from the chart and name list. `trading_range` bands use `#d2a8ff` |
| swing-exclude-inner-range | Drop an inner range from a trend | done | Superseded then later removed by `swing-allow-range-overlap` |
| swing-exclude-any-range | Remove every shared range bar from a trend | done | Superseded by `swing-allow-range-overlap` |
| swing-share-range-last-leg | Share same-dir range last leg with following trend | done | Superseded by `swing-allow-range-overlap` |
| swing-allow-range-overlap | Trends may overlap `classifyTradingRange`; no hole cut | done | Removed `excludeInnerRanges` / last-leg share. Narrow whole-segment → `trading_range` kept. No FR-2 Linear parent |
| swing-hl-label-swap | Bull open `H1` / close `L1`; bear open `L1` / close `H1` | done | Superseded by `unify-hl-entry-counts` |
| unify-hl-entry-counts | `H1`–`H3`/`L1`–`L3` = Brooks entries; trend endpoints `Bull/BearTrendStart/End` | done | `entryCounts` = full-series adjacent helper only; SE / swingTrend H2·L2 = `secondEntries` hinges; overlay short labels. No FR-2 Linear parent |
| swing-ignore-time-hole | Do not let a time hole fail a trend | done | Staircase and single-leg checks skip a pair whose open-time gap is larger than the window’s smallest positive gap. Segment edges stay on reversal K2 |

### classifyReversalSignal

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-classify-reversal-signal | Spec for reversal-signal classifier | done | `docs/spec/classify-reversal-signal.md` |
| impl-classify-reversal-signal | Implement + unit tests | done | `src/analyze/classifyReversalSignal.ts`; labels `bull_reversal` / `bear_reversal` / `no_reversal`; levels `K1` / `K2` / `Confirm`. Consecutive same-direction signals collapse to the later one |
| adjust-reversal-signal-rules | Relax triple confirmation | done | Keep the first of a same-direction run. Add inside (K3 breaks K1) and engulf (K3 breaks K2). Next K1 may be the previous K3. Strict adjacent triple only |
| reversal-k1-engulf-skips-color | Skip K1 color after an engulf | done | When K1 engulfs the previous bar, legacy direction comes from K2/K3 geometry. The first bar still uses color |
| suspend-k1-color | Suspend K1 color | done | Legacy direction is only K2/K3 geometry. A doji may be K1. Inside and engulf rules unchanged |
| reversal-h1-l1 | Bull / bear pivot windows | done | Bull when K2 high is below both neighbors; bear when K2 low is above both. Both may emit. Docs avoid `H1`/`L1` names (reserved for entry anchors). Old geometry commented out |
| reversal-engulf-k4 | Engulf window uses K4 | done | When K3 engulfs K2, skip pivots. Only a higher K4 high is bull; only a lower K4 low is bear. Confirm is K4 |
| reversal-engulf-chain-color | Engulf chain uses the last bar’s color | done | Walk while each next bar engulfs the current one. Bullish close is bull; bearish close is bear; a doji emits nothing. Confirm is that bar |
| reversal-small-engulf-break | Small engulf reads the next break | done | Color-side excess above half the covered range still uses that bar’s color. A smaller excess reads the next bar’s one-sided break, or repeats the comparison when that bar also engulfs |
| reversal-gap-body | Count a gap as the next bar’s body | done | Gap up sets the compared open and low to the previous high. Gap down sets the compared open and high to the previous low. Level prices stay the printed high and low |
| reversal-time-hole | Compare across a time hole | done | Array neighbors stay one window when open times are hours apart. The gap-body rule still applies |

### classifyTradingRange

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-classify-trading-range | Spec for Brooks trading-range scan | done | `docs/spec/classify-trading-range.md`. New labels `broad_trading_range`, `tight_trading_range`, `barbwire`, `breakout_mode`. Levels `RangeHigh` / `RangeLow`. Does not reuse `trading_range` |
| util-swings | Shared swing high/low helper | done | `src/utils/swings.ts`. `swingSpan` default 2. Consecutive same-kind swings collapse to the more extreme price |
| impl-classify-trading-range | Implement + unit tests | done | `src/analyze/classifyTradingRange.ts`. Boundary drift / height strictly under 0.2. Shared bars keep the taller span; identical spans keep the tighter label |
| chart-trading-range-sidebar | Sidebar checkbox + horizontal high/low lines | done | `REVIEW_ANALYZERS` entry **Trading range**. Shared bars keep the larger high−low span, including a segment fully inside another. `RangeHigh` / `RangeLow` are horizontal lines covering every bar in the segment |
| util-single-leg-trend | Shared single-leg trend check | done | `src/utils/trendLeg.ts`. Skip inside bars. A pullback of at most 3 bars stays on the leg when the adverse break is at most half the average bar height and the next bar resumes |
| range-exclude-single-leg | Do not label a single leg as a range | done | `classifyTradingRange` drops the segment. `classifySwingTrend` keeps it as `bull_trend` / `bear_trend` instead of `trading_range` |
| review-prefer-range | Prefer a range that covers consecutive trends | done | `visibleReviewResults` hides two or more consecutive swing trends fully inside one trading-range segment. Side-by-side trends stay. Summary unchanged |
| tight-false-breakout | Keep a false break inside one tight range | done | Superseded by `tight-range-redefine`. Break distance is measured from the edges, not from the prior two bars |
| tight-mostly-trend | Drop a tight segment that is mostly one leg | done | Superseded by `tight-range-redefine`. A one-direction leg is not a range unless the bars are barbwire |
| tight-range-redefine | Redefine tight edges, structure, and breaks | done | Each edge is the first level, from the extreme inward, touched by two non-adjacent bars. The segment needs two opposite legs or barbwire. A poke of at least 1.5× the edge height ends the range before that bar. A smaller poke that returns within two bars stays, and the edge does not move to the wick. Overlap is handled by `range-keep-outer` |
| range-keep-outer | Keep the outer range when one contains another | done | Any shared bar, including full containment, keeps the larger high−low span and drops the other segment. Same edges are not merged |
| broad-from-swing-legs | Broad range is a swing-leg oscillation | done | `classifyTradingRange` broad segments come from `readSwingLegs`. Legs inside an extended `mergeLegsIntoTrends` result are excluded. Span is the first leg start through the last leg end. Tight labels unchanged |

### classifyPullback

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-classify-pullback | Spec for pullback classifier | done | `docs/spec/classify-pullback.md`. Labels `consolidation_pullback`, `bar_pullback`, `multi_leg_pullback`, `leg_pullback`. Levels `PullbackStart` / `PullbackExtreme`. Depth in `evidence.pullbacks[i]` |
| impl-classify-pullback | Implement + unit tests | done | `src/analyze/classifyPullback.ts`. Reuses `classifySwingTrend` and `classifyTradingRange`. Episode depth over the parent trend span, nearest fib 23.6 / 38.2 / 50 / 61.8 / 78.6 / 100. No chart sidebar |

### classifyTrendWithPullbacks

No FR-2 Linear parent — tracked here.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-classify-trend-with-pullbacks | Spec for trend segments with inner pullbacks | done | `docs/spec/classify-trend-with-pullbacks.md`. Copies swing segments. Attaches `bar_pullback`, `multi_leg_pullback`, and `leg_pullback` that lie inside a major trend. Skips `consolidation_pullback` |
| impl-classify-trend-with-pullbacks | Implement + unit tests | done | `src/analyze/classifyTrendWithPullbacks.ts`. Does not import pullback from swing. Sidebar checkbox is `chart-trend-with-pullbacks-sidebar` |

## Parent: Brooks atoms (spec only)

No FR-2 Linear parent. Specs are done. Implementation progress is in [`tasks/README.md`](tasks/README.md). Thresholds stay unset until that task writes them into its spec. Chart sidebar is out of these tasks.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| spec-brooks-shared | Shared I/O, boundaries, constraints, helper list | done | `docs/spec/brooks-shared.md`. Bar geometry defaults are fixed there. `BarHigh` / `BarLow` / `LegStart` / `LegEnd` / `GapNear` / `GapFar` are in `src/types` |
| util-bar-metrics | Bar range, body, tails, close location | done | `src/utils/barMetrics.ts`. Numbers only. Zero range close location is `0.5` |
| util-bar-predicates | Doji, trend bar, inside, outside, shaved, runs | done | `src/utils/barPredicates.ts`. Doji `0.25`, trend body `0.5`, consecutive default `2`. `classifyTradingRange` barbwire calls `isDoji` |
| impl-classify-trend-bar | One trend bar per result | done | `src/analyze/classifyTrendBar.ts`. `evidence.items[i].shaved` |
| impl-classify-doji | One doji per result | done | `src/analyze/classifyDoji.ts`. Uses `isDoji` |
| impl-classify-inside-bar | One inside bar per result | done | `src/analyze/classifyInsideBar.ts`. Consecutive insides stay separate |
| impl-classify-outside-bar | One outside bar per result | done | `src/analyze/classifyOutsideBar.ts`. No direction |
| util-gap-body | Fold a gap into the next compared body | done | `src/utils/gapBody.ts` `withGapBody`. `classifyReversalSignal` calls it. Labels unchanged |
| util-body-gaps | List adjacent body gaps and the fill index | done | `src/utils/bodyGaps.ts` `findBodyGaps`. Uses `withGapBody`. No `AnalysisResult` |
| util-swing-legs | Pair swings into legs | done | `src/utils/swingLegs.ts` `findSwingLegs`. Forwards `swingSpan` to `findSwings`. Same-direction legs stay separate |
| util-prior-trend-impulse-extremes | Prior completed impulse ends at a bar | removed | SE 止损改 Fib P1 后无调用方；源码已删 |
| impl-classify-swing-leg | One swing leg per result | done | `src/analyze/classifySwingLeg.ts`. Labels `bull_leg` / `bear_leg`. Levels `LegStart` / `LegEnd`. No chart sidebar |
| impl-classify-body-gap | One body gap per result | done | `src/analyze/classifyBodyGap.ts`. Labels `open_body_gap` / `filled_body_gap`. Levels `GapNear` / `GapFar`. Calls `findBodyGaps` only. Sidebar is `chart-body-gap-sidebar` |
| util-price-cluster | Absolute price tolerance | done | `src/utils/priceCluster.ts` `pricesWithin`. Caller supplies tolerance. No default ratio. No `AnalysisResult` |
| util-trendline | Channel rails from adjacent swing legs | done | `src/utils/trendline.ts` `channelFromLegs`, `railPriceAt`, `closesBeyond`. Adjacent same-direction legs, both rails slope with the legs. Close only. No `AnalysisResult` |
| impl-classify-channel | One channel per redrawn leg pair | done | `src/analyze/classifyChannel.ts`. Labels `bull_channel` / `bear_channel`. Levels `ChannelHigh1`–`ChannelLow2`. `evidence.items[i].overshoot` is a wick beyond a rail with the close still inside. No chart sidebar |
| impl-classify-extreme-retest | Inside retest of a prior swing | done | `src/analyze/classifyExtremeRetest.ts`. Labels `higher_low` / `lower_high`. Levels `PriorExtreme` / `Retest`. Omitted tolerance is `0.25` × average `barRange`. No chart sidebar |
| impl-classify-trendline-break | Close beyond the countertrend rail | done | `src/analyze/classifyTrendlineBreak.ts`. Labels `bull_line_break` / `bear_line_break`. Levels `BreakBar` plus the broken rail's two touches. Scans from the bar after the later touch until the next same-direction channel leaves this one. Sidebar is `chart-trendline-break-sidebar` |
| util-measured-move | Project a price from an anchor | done | `src/utils/measuredMove.ts` `projectMeasuredMove`. `up` adds the magnitude; `down` subtracts it. Magnitude `0` returns the anchor. No `AnalysisResult` |
| util-fib-retracement | Fibonacci retracement prices from bar extremes | done | `src/utils/fibonacci.ts` `projectFibRetracement` / `fibRetracementFromBars`. Direction from which extreme appears first. Defaults include `0` and `1`. Same-bar or zero range → `null`. Extension is a separate util. No `AnalysisResult` |
| util-fib-extension | Fibonacci extension prices from V1/V2/V3 | done | `src/utils/fibonacci.ts` `projectFibExtension` / `fibExtensionFromBars`. Window high/low as V1/V2 by time; opposite extreme after V2 is V3. `price = V3 + r*(V2−V1)`. Defaults include levels above 1. Independent of retracement. No `AnalysisResult` |
| impl-classify-range-break | First close beyond a trading range | done | `src/analyze/classifyRangeBreak.ts`. Label `range_break`. Levels `BreakBar` / `BrokenEdge`. One close per `classifyTradingRange` segment. No chart sidebar |
| util-setup-prices | Entry, stop, and target prices | done | `src/utils/setupPrices.ts` `entryBeyond`, `stopBeyond`, `targetFrom`. Omitted tick leaves the extreme. `targetFrom` forwards a given price. No `AnalysisResult` |
| impl-classify-follow-through | Trend-bar run after a range break | done | `src/analyze/classifyFollowThrough.ts`. Label `follow_through`. Levels `BreakBar` / `FollowBar` / `BrokenEdge`. Minimum length is `FOLLOW_THROUGH_BARS`. No chart sidebar |
| impl-classify-failed-breakout | Range break that returns inside | done | `src/analyze/classifyFailedBreakout.ts`. Label `failed_breakout`. No matching `follow_through`. Levels `BreakBar` / `ReturnBar` / `SignalBar` / `Entry` / `Stop` / `Target`. Target is the opposite range edge. No chart sidebar |
| impl-classify-second-entry | Pullback-window H2/L2 with fib extension TPs | done | `classifySecondEntry` + `findSecondEntriesFrom`. Default `high2`/`low2`. P1–P3 / TP1–TP4. SwingTrend attaches `H2`/`L2`. No chart sidebar |
| se-entry-count | Second entry ordinal switch | done | `entryCount` integer `>= 1`, default 2. Emits `highN`/`lowN`. Review `H/L` input. SwingTrend stays `H2`/`L2`. Linear [JIU-329](https://linear.app/jiuong/issue/JIU-329/second-entry入场序号开关-entrycount) |
| impl-classify-signal-bar | Qualified swing signal bars | done | `src/analyze/classifySignalBar.ts`. Labels `bull_signal_bar` / `bear_signal_bar`. Close in the outer third and adverse tail at most `0.25` of the range. No chart sidebar |
| impl-classify-climax | Trend-bar run or doubled leg | done | `src/analyze/classifyClimax.ts`. Labels `buy_climax` / `sell_climax`. Three trend bars, or a later leg at least twice the previous. No chart sidebar |
| impl-classify-breakout-pullback | Pullback to a broken edge after follow-through | done | `src/analyze/classifyBreakoutPullback.ts`. Label `breakout_pullback`. First opposite leg within `0.25` of average bar range. No chart sidebar |
| impl-classify-micro-double | Adjacent equal highs or lows | done | `src/analyze/classifyMicroDouble.ts`. Labels `micro_double_top` / `micro_double_bottom`. Omitted tolerance is `0.25` × average `barRange`. An outside second bar is skipped. No chart sidebar |
| impl-classify-double-top-bottom | Two swings in one price band | done | `src/analyze/classifyDoubleTopBottom.ts`. Labels `double_top` / `double_bottom`. Swings come from `findSwings`. Same default tolerance. No chart sidebar |
| impl-classify-wedge | Three same-direction pushes | done | `src/analyze/classifyWedge.ts`. Labels `wedge_top` / `wedge_bottom`. Levels `Push1`–`Push3`. `evidence.items[i].role` is `flag` or `reversal`. No chart sidebar |
| impl-classify-major-trend-reversal | Break plus the next inside retest | done | `src/analyze/classifyMajorTrendReversal.ts`. Labels `bull_major_reversal` / `bear_major_reversal`. Target height is the matched channel's touch span. No chart sidebar |
| spec-classify-trend-bar | Trend-bar spec | done | `docs/spec/classify-trend-bar.md` |
| spec-classify-doji | Doji spec | done | `docs/spec/classify-doji.md` |
| spec-classify-inside-bar | Inside-bar spec | done | `docs/spec/classify-inside-bar.md` |
| spec-classify-outside-bar | Outside-bar spec | done | `docs/spec/classify-outside-bar.md` |
| spec-classify-swing-leg | Swing-leg spec | done | `docs/spec/classify-swing-leg.md` |
| spec-classify-body-gap | Body-gap spec | done | `docs/spec/classify-body-gap.md`. Later impl extracts `withGapBody` from `classifyReversalSignal` |
| spec-classify-channel | Channel spec | done | `docs/spec/classify-channel.md` |
| spec-classify-trendline-break | Trendline-break spec | done | `docs/spec/classify-trendline-break.md` |
| spec-classify-extreme-retest | Extreme-retest spec | done | `docs/spec/classify-extreme-retest.md` |
| spec-classify-range-break | Range-break spec | done | `docs/spec/classify-range-break.md` |
| spec-classify-follow-through | Follow-through spec | done | `docs/spec/classify-follow-through.md` |
| spec-classify-failed-breakout | Failed-breakout spec | done | `docs/spec/classify-failed-breakout.md` |
| spec-classify-second-entry | Second-entry spec | done | `docs/spec/classify-second-entry.md` |
| spec-classify-signal-bar | Signal-bar spec | done | `docs/spec/classify-signal-bar.md` |
| spec-classify-breakout-pullback | Breakout-pullback spec | done | `docs/spec/classify-breakout-pullback.md` |
| spec-classify-climax | Climax spec | done | `docs/spec/classify-climax.md` |
| spec-classify-wedge | Wedge spec | done | `docs/spec/classify-wedge.md` |
| spec-classify-double-top-bottom | Double top/bottom spec | done | `docs/spec/classify-double-top-bottom.md` |
| spec-classify-micro-double | Micro double spec | done | `docs/spec/classify-micro-double.md` |
| spec-classify-major-trend-reversal | Major-trend-reversal spec | done | `docs/spec/classify-major-trend-reversal.md` |

## Parent: Brooks entry measure

No FR-2 Linear parent. Task index: [`tasks/README.md`](tasks/README.md) § P7. Shared rules land in `docs/spec/setup-measure.md` with `util-setup-measure`. Measure functions return `SetupReport`, not `AnalysisResult`. Review measure-tree sidebar lives under FR-3 (`chart-measure-tree-*`). Signal bars and micro doubles are out.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| util-setup-measure | Reward/risk, outcome, and win-rate summary | done | `src/utils/setupMeasure.ts`. Direction stays `up` / `down`. Writes `docs/spec/setup-measure.md` |
| neckline-on-double | Emit the double's neckline | done | `Neckline` on every `classifyDoubleTopBottom` pair. No `Target` on the atom |
| impl-measure-second-entry | Measure highN / lowN with TP1 | done | Depends on `util-setup-measure`. Target is `TP1`. `basis` follows `entryCount` |
| impl-measure-failed-breakout | Measure failed breakouts | done | Depends on `util-setup-measure`. Target stays the opposite range edge |
| impl-measure-breakout-pullback | Measure breakout pullbacks | done | Depends on `util-setup-measure` |
| impl-measure-wedge | Measure triggered wedges | done | Depends on `util-setup-measure`. Skips wedges with no `Entry`. Copies `role` onto `context` |
| impl-measure-major-trend-reversal | Measure triggered major reversals | done | Depends on `util-setup-measure`. Signal price is `Retest` |
| impl-measure-double-top-bottom | Measure doubles with a 1x neckline move | done | Depends on `util-setup-measure` and `neckline-on-double`. Target is the neckline flipped by the pattern height |

Order: `util-setup-measure` ∥ `neckline-on-double` → the five measure functions that already have a target → `impl-measure-double-top-bottom`.

## Parent: FR-3 Viz (third-party chart)

Linear: [JIU-301](https://linear.app/jiuong/issue/JIU-301/fr-3-chart-k-line-analyze).  
Specs: [`specification/chart.md`](specification/chart.md), [`architecture/chart.md`](architecture/chart.md). Acceptance: C1–C4 in [`requirements.md`](requirements.md) § FR-3.

| ID | Task | Status | Notes |
|----|------|--------|-------|
| chart-dep-kline-chart | Wire `@trading-playback/kline-chart` | done | [JIU-302](https://linear.app/jiuong/issue/JIU-302/fr-3-chart-dep-kline-chart-wire-trading-playbackkline-chart). `file:` to kline-chart; `shared` via second `file:` + `overrides` (chart package uses `workspace:*`) |
| chart-util-east8-time | UTC → East-8 `+08:00` helper | done | [JIU-303](https://linear.app/jiuong/issue/JIU-303/fr-3-chart-util-east8-time-utc-east-8-0800-helper). `toEast8TimeString` in `src/utils/time.ts` |
| chart-map-bars-to-kline | `Bar[]` + `TimeFrame` → `KlineBar[]` | done | [JIU-304](https://linear.app/jiuong/issue/JIU-304/fr-3-chart-map-bars-to-kline-bar-timeframe-klinebar). `src/chart/mapBars.ts` |
| chart-overlay-analysis | `AnalysisResult` → `layer_drawings` | done | [JIU-305](https://linear.app/jiuong/issue/JIU-305/fr-3-chart-overlay-analysis-analysisresult-layer-drawings). `src/chart/overlayAnalysis.ts`; summary text is on the review sidebar |
| chart-reversal-mark-colors | Reversal mark colors | done | `bull_reversal` red `#f85149`, `bear_reversal` green `#3fb950` on the range band and level dots. Trend bands unchanged |
| chart-trend-band-colors | Trend bands match candle colors | done | `bull_trend` / `minor_bull_trend` red `#f85149`. `bear_trend` / `minor_bear_trend` green `#3fb950`. Reversal colors, `trading_range`, and H/L dots unchanged |
| chart-reversal-k2-only | Reversal dots are K2 only | done | Next K1 starts at the confirmed K2. Overlay draws only that `K2` dot; `K1` and `Confirm` stay on the result |
| chart-adapter-host | Thin host API lifecycle | done | [JIU-306](https://linear.app/jiuong/issue/JIU-306/fr-3-chart-adapter-host-thin-host-api-lifecycle). `createChartHost` — `mount` / `setBars` / `setResults` / `unmount`; no playback |
| page-bars-api | Dev `GET /api/bars` via `loadBarsWithMeta` | done | [JIU-307](https://linear.app/jiuong/issue/JIU-307/fr-3-page-bars-api-dev-get-apibars-via-loadbarswithmeta). `src/page/barsHandler.ts` + Vite middleware |
| page-review-host | Vite canvas review page | done | [JIU-308](https://linear.app/jiuong/issue/JIU-308/fr-3-page-review-host-vite-canvas-review-page). `web/` + `npm run dev` |
| page-symbol-time | Symbol dropdown and calendar inputs | done | [JIU-313](https://linear.app/jiuong/issue/JIU-313/fr-3-page-symbol-time-symbol-list-and-calendar-inputs). `datetime-local` → UTC Unix seconds |
| page-trading-catalog | Symbol and timeframe lists from `trading.json` | done | [JIU-315](https://linear.app/jiuong/issue/JIU-315/fr-3-page-trading-catalog-symbols-and-timeframes-from-tradingjson). `GET /api/catalog`; first entries selected |
| page-chart-pointer | Library pointer interaction on the review host | done | [JIU-316](https://linear.app/jiuong/issue/JIU-316/fr-3-page-chart-pointer-attach-library-pointer-interaction). `attachPointerInteraction` from `createChartHost` |
| page-analysis-opt-in | Sidebar toggles analysis marks | done | [JIU-314](https://linear.app/jiuong/issue/JIU-314/fr-3-page-analysis-opt-in-sidebar-toggles-analysis-marks). `runReview(bars, enabledIds)`; default off |
| chart-trend-with-pullbacks-sidebar | Sidebar checkbox for trend with pullbacks | done | [JIU-317](https://linear.app/jiuong/issue/JIU-317/fr-3-chart-trend-with-pullbacks-sidebar). `REVIEW_ANALYZERS` entry **Trend with pullbacks**. Inner pullbacks draw a `#d2a8ff` band plus `PullbackStart` / `PullbackExtreme` dots |
| chart-body-gap-sidebar | Sidebar checkbox for body gaps | done | `REVIEW_ANALYZERS` entry **Body gap**. `GapNear` / `GapFar` are `#d2a8ff` horizontal lines over the gap span. No vertical band and no dots |
| chart-trendline-break-sidebar | Sidebar checkbox for trendline breaks | done | [JIU-318](https://linear.app/jiuong/issue/JIU-318/fr-3-chart-trendline-break-sidebar). Was a flat `REVIEW_ANALYZERS` entry; now nested under the measure tree when Trendline break is checked. The broken rail is drawn through the break bar. `bull_line_break` is `#f85149`, `bear_line_break` is `#3fb950`. Only `BreakBar` is a dot |
| chart-measure-tree-model | `REVIEW_TREE` + `runReview` analysis/reports | done | [JIU-319](https://linear.app/jiuong/issue/JIU-319/fr-3-chart-measure-tree-model-review-tree-runreview). Six measure roots; classify/measure id dedupe; replaces flat `REVIEW_ANALYZERS` |
| chart-measure-tree-ui | Nested checkboxes on the review page | done | [JIU-320](https://linear.app/jiuong/issue/JIU-320/fr-3-chart-measure-tree-ui-nested-gated-checkboxes). Superseded for display by flat `reviewSidebarItems` (one checkbox per id). `REVIEW_TREE` remains the dependency catalog. Small-cycle / Entry count under Swing trend; Body gap / Trend with pullbacks not on the sidebar |
| chart-sidebar-independent-checks | Independent sidebar checkboxes (no parent gate) | done | [JIU-323](https://linear.app/jiuong/issue/JIU-323/fr-3-chart-sidebar-independent-checks-no-parent-gate). Nested tree kept for display; children always enabled; unchecking a parent does not clear descendants |
| chart-measure-overlay | SetupReport Entry/Stop/Target + sidebar stats | done | [JIU-321](https://linear.app/jiuong/issue/JIU-321/fr-3-chart-measure-overlay-entrystoptarget-stats). `drawSetupReports`; `host.setReports`; Entry `#8b949e`, Stop `#f85149`, Target `#3fb950` |
| chart-measure-tree-docs | Chart + measure specs for the tree sidebar | done | [JIU-322](https://linear.app/jiuong/issue/JIU-322/fr-3-chart-measure-tree-docs-chart-measure-specs) |
| viz-third-party-chart | *(umbrella)* Integrate chart lib + overlay adapter | superseded | Split into `chart-dep-kline-chart`, `chart-util-east8-time`, `chart-map-bars-to-kline`, `chart-overlay-analysis`, `chart-adapter-host` |

Order: `chart-util-east8-time` ∥ `chart-dep-kline-chart` ∥ `page-bars-api` → `chart-map-bars-to-kline` → (`scaffold-types`) → `chart-overlay-analysis` → `chart-adapter-host` → `page-review-host`.

Out of scope this FR: playback, custom candle engine, indicator/trade layers, chart imports in analyze, pan/zoom/minimum candle size (those belong in `@trading-playback/kline-chart`).

## How to add tasks

One goal per row; keep scope reviewable and independently testable.
