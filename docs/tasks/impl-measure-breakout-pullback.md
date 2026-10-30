# impl-measure-breakout-pullback

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-breakout-pullback.md](../spec/measure-breakout-pullback.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[impl-classify-breakout-pullback](impl-classify-breakout-pullback.md) |

## 目标

实现 `measureBreakoutPullback`。统计 `breakout_pullback` 的计划盈亏比和实现胜率。

## 范围

- 短规格，再写 `src/analyze/measureBreakoutPullback.ts`、`tests/analyze/measureBreakoutPullback.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 含 `swingSpan`、`tickSize`、`priceTolerance`，原样传给 `classifyBreakoutPullback`
- 只收带 `Entry`、`Stop`、`Target`、`SignalBar` 的结果
- `basis` 为 `breakout_pullback`。止损在下为 `up`，在上为 `down`
- 信号价是 `SignalBar`，信号时间是 `Entry` 的 K
- 目标用原子函数已有的区间高度投影，不重新测量
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改 `classifyBreakoutPullback`
- 不把没有跟随的回到区间内算进来
- 图表侧边栏

## 完成

- 一笔先到目标，一笔先到止损
- 没有这种回调时 `winRate` 为 `null`
