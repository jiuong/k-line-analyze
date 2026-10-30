# impl-classify-major-trend-reversal

| 项 | 值 |
|----|----|
| 优先级 | P6 |
| 状态 | done |
| 规格 | [classify-major-trend-reversal.md](../spec/classify-major-trend-reversal.md) |
| 依赖 | [impl-classify-trendline-break](impl-classify-trendline-break.md)、[impl-classify-extreme-retest](impl-classify-extreme-retest.md)、[util-measured-move](util-measured-move.md)、[util-setup-prices](util-setup-prices.md) |

## 目标

实现 `classifyMajorTrendReversal`。向下破线之后出现 `higher_low` 为 `bull_major_reversal`。向上破线之后出现 `lower_high` 为 `bear_major_reversal`。

## 范围

- `src/analyze/classifyMajorTrendReversal.ts`，并导出
- `tests/analyze/classifyMajorTrendReversal.test.ts`
- 锚点 `BreakBar`、`PriorExtreme`、`Retest`
- 再测之后已经沿新方向突破时才填 `Entry`、`Stop`、`Target`
- 目标幅度用已有通道高度，只读 `classifyChannel`，不重新拟合
- 同一破线只配时间上最近的下一次再测，且再测必须晚于破线

## 不做

- 只有破线或只有再测时不输出
- 不替代 `classifyReversalSignal`
- 不把楔形自动升成主要趋势反转
- 不调用 `findSwings`
- 图表侧边栏

## 完成

- 注入 `Bar[]`，断言更早的 `higher_low` 不会配上后来的破线
- 没有突破时结果里没有 `Entry`
