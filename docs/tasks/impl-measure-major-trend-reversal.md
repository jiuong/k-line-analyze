# impl-measure-major-trend-reversal

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-major-trend-reversal.md](../spec/measure-major-trend-reversal.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[impl-classify-major-trend-reversal](impl-classify-major-trend-reversal.md) |

## 目标

实现 `measureMajorTrendReversal`。只统计再测之后已经顺向突破的主要趋势反转。

## 范围

- 短规格，再写 `src/analyze/measureMajorTrendReversal.ts`、`tests/analyze/measureMajorTrendReversal.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 含 `swingSpan`、`tickSize`、`priceTolerance`，原样传给 `classifyMajorTrendReversal`
- 没有 `Entry`、`Stop` 或 `Target` 的结果跳过
- `basis` 为 `bull_major_reversal`（`up`）或 `bear_major_reversal`（`down`）
- 信号时间是 `Entry` 的 K，信号价是 `Retest`
- 目标用原子函数已有的通道高度投影
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改 `classifyMajorTrendReversal`
- 不把只有破线或只有再测算成交易
- 图表侧边栏

## 完成

- 已突破的一笔进入 `trades`，未突破的不进入
- 一笔先到目标，一笔先到止损
