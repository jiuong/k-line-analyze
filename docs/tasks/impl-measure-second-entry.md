# impl-measure-second-entry

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-second-entry.md](../spec/measure-second-entry.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[impl-classify-second-entry](impl-classify-second-entry.md) |

## 目标

实现 `measureSecondEntry`。把 `high1`–`high3` / `low1`–`low3` 收成带盈亏比和实现胜率的 `SetupReport`。

## 范围

- 短规格，再写 `src/analyze/measureSecondEntry.ts`、`tests/analyze/measureSecondEntry.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 只含 `swingSpan`、`tickSize`，原样传给 `classifySecondEntry`
- 每条带 `Entry`、`Stop`、`Target`、`SignalBar` 的结果是一笔。缺任一锚点则跳过
- `basis` 为该标签。`high*` 为 `up`，`low*` 为 `down`
- 信号价是 `SignalBar`，信号时间是 `Entry` 的 K
- 入场、目标用原子函数价；止损优先 prior impulse 相对做单方向的反向端（多低空高，且在 entry 反侧），否则回退原子 `Stop`。盈亏比与胜负只调用 `setupMeasure`
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改 `classifySecondEntry`
- 不把 `high1` 与 `high2` 合成一个胜率；分组交给 `byBasis`
- 图表侧边栏

## 完成

- 合成走势里至少一笔先到目标、一笔先到止损
- `stats.winRate` 只含已分出胜负的笔
- 没有突破时 `trades` 为空，`winRate` 为 `null`

## 变更

- 主目标 TP1 随 classify 调整为 **1.0 扩展**（胜率仍只用 TP1）
- 止损直接用 classify `Stop`（Fib P1），不再覆盖 prior-impulse；`findPriorTrendImpulseExtremes` 已删除
- `entryCount` 原样传给 classify；`basis` 为对应的 `highN` / `lowN`
