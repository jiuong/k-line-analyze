# Brooks 原子函数任务

规格已完成。实现进度见各表。没有 FR-2 Linear 父单，所以记在这里。

开发时按优先级从小到大。同一优先级里，先做被依赖的任务，没有互赖的可以并行。

每个任务一个目标：一个纯函数模块，或一个分析函数。数值阈值在该任务里写回规格后再编码。图表侧边栏的 measure 依赖树见 FR-3（`chart-measure-tree-*`）。

共享契约：[brooks-shared.md](../spec/brooks-shared.md)。入场形态理论（含原文出处）：[entry-setups.md](../theory/entry-setups.md)。

## P1 K 线解剖

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [util-bar-metrics](util-bar-metrics.md) | done |
| 2 | [util-bar-predicates](util-bar-predicates.md) | done |
| 3 | [impl-classify-trend-bar](impl-classify-trend-bar.md) | done |
| 3 | [impl-classify-doji](impl-classify-doji.md) | done |
| 3 | [impl-classify-inside-bar](impl-classify-inside-bar.md) | done |
| 3 | [impl-classify-outside-bar](impl-classify-outside-bar.md) | done |

顺序 3 的四个函数互不依赖，谓词落地后可并行。

## P2 缺口与摆动腿

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [util-gap-body](util-gap-body.md) | done |
| 2 | [util-body-gaps](util-body-gaps.md) | done |
| 3 | [impl-classify-body-gap](impl-classify-body-gap.md) | done |
| 1 | [util-swing-legs](util-swing-legs.md) | done |
| 2 | [impl-classify-swing-leg](impl-classify-swing-leg.md) | done |

缺口链与摆动腿链互不依赖，两条可以并行。

## P3 通道与再测

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [util-price-cluster](util-price-cluster.md) | done |
| 1 | [util-trendline](util-trendline.md) | done |
| 2 | [impl-classify-channel](impl-classify-channel.md) | done |
| 3 | [impl-classify-trendline-break](impl-classify-trendline-break.md) | done |
| 2 | [impl-classify-extreme-retest](impl-classify-extreme-retest.md) | done |

`classifyExtremeRetest` 不依赖通道，可与 `classifyChannel` 并行。

| 顺序 | 任务 | 状态 |
|------|------|------|
| 后补 | [util-prior-trend-impulse-extremes](util-prior-trend-impulse-extremes.md) | removed（SE 止损改 P1 后无引用） |

点查主趋势内最近已完成同向子腿的两端（W1）。依赖 `mergeLegsIntoTrends`，无 FR-2 Linear 父单。

## P4 区间突破

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [util-measured-move](util-measured-move.md) | done |
| 1 | [util-fib-retracement](util-fib-retracement.md) | done |
| 1 | [util-fib-extension](util-fib-extension.md) | done |
| 2 | [util-setup-prices](util-setup-prices.md) | done |
| 1 | [impl-classify-range-break](impl-classify-range-break.md) | done |
| 2 | [impl-classify-follow-through](impl-classify-follow-through.md) | done |
| 3 | [impl-classify-failed-breakout](impl-classify-failed-breakout.md) | done |

测量移动与区间突破可以并行。失败突破要等跟随和点位函数。

## P5 入场与高潮

| 顺序 | 任务 | 状态 |
|------|------|------|
| 0 | [util-entry-counts](util-entry-counts.md) | done |
| 1 | [impl-classify-second-entry](impl-classify-second-entry.md) | done |
| 1 | [impl-classify-signal-bar](impl-classify-signal-bar.md) | done |
| 1 | [impl-classify-climax](impl-classify-climax.md) | done |
| 2 | [impl-classify-breakout-pullback](impl-classify-breakout-pullback.md) | done |

第二次入场、信号 K、高潮互不依赖。突破后回调要等 P4 的跟随。

## P6 形态

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [impl-classify-wedge](impl-classify-wedge.md) | done |
| 1 | [impl-classify-double-top-bottom](impl-classify-double-top-bottom.md) | done |
| 1 | [impl-classify-micro-double](impl-classify-micro-double.md) | done |
| 2 | [impl-classify-major-trend-reversal](impl-classify-major-trend-reversal.md) | done |

主要趋势反转要等破线和再测。其余三个可并行。

## P7 入场测量

测量层不改形态检测。共享规则在 [setup-measure.md](../spec/setup-measure.md)，由第一个任务写。没有 FR-2 Linear 父单。Review 侧边栏挂在 FR-3（JIU-301）的 measure 树任务上。

| 顺序 | 任务 | 状态 |
|------|------|------|
| 1 | [util-setup-measure](util-setup-measure.md) | done |
| 1 | [neckline-on-double](neckline-on-double.md) | done |
| 2 | [impl-measure-second-entry](impl-measure-second-entry.md) | done |
| 2 | [impl-measure-failed-breakout](impl-measure-failed-breakout.md) | done |
| 2 | [impl-measure-breakout-pullback](impl-measure-breakout-pullback.md) | done |
| 2 | [impl-measure-wedge](impl-measure-wedge.md) | done |
| 2 | [impl-measure-major-trend-reversal](impl-measure-major-trend-reversal.md) | done |
| 3 | [impl-measure-double-top-bottom](impl-measure-double-top-bottom.md) | done |

顺序 1 的两项互不依赖。顺序 2 等测量工具。双顶双底还要等颈线。信号 K 和微型双顶双底不在本层。
