# impl-measure-failed-breakout

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-failed-breakout.md](../spec/measure-failed-breakout.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[impl-classify-failed-breakout](impl-classify-failed-breakout.md) |

## 目标

实现 `measureFailedBreakout`。统计 `failed_breakout` 的计划盈亏比和实现胜率。

## 范围

- 短规格，再写 `src/analyze/measureFailedBreakout.ts`、`tests/analyze/measureFailedBreakout.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 只有 `tickSize`，原样传给 `classifyFailedBreakout`
- 只收带 `Entry`、`Stop`、`Target`、`SignalBar` 的结果
- `basis` 为 `failed_breakout`。方向由止损相对入场决定：止损在下为 `up`，在上为 `down`
- 信号价是 `SignalBar`，信号时间是 `Entry` 的 K
- 三个价格用原子函数已有值。目标仍是区间对侧，不另算测量移动
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改 `classifyFailedBreakout`
- 不把向上失败和向下失败拆成两个函数；方向留在每笔交易上
- 图表侧边栏

## 完成

- 一笔先到对侧目标，一笔先到止损
- 没有失败突破时 `winRate` 为 `null`
