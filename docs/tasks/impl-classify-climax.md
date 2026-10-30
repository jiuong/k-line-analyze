# impl-classify-climax

| 项 | 值 |
|----|----|
| 优先级 | P5 |
| 状态 | done |
| 规格 | [classify-climax.md](../spec/classify-climax.md) |
| 依赖 | [impl-classify-swing-leg](impl-classify-swing-leg.md)、[util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyClimax`。连续强趋势 K，或相邻顺势腿幅度放大，为 `buy_climax` 或 `sell_climax`。

## 范围

- `src/analyze/classifyClimax.ts`，并导出
- `tests/analyze/classifyClimax.test.ts`
- 多头极值用 `BarHigh`，空头用 `BarLow`，一条结果只留一个
- `evidence.items[i].source` 为 `bars` 或 `legs`
- 连续根数和放大倍数在编码前写入规格
- 两条路径重叠时保留更长的一段

## 不做

- 不因此打开新趋势或反转
- 不拆成买高潮、卖高潮两个函数
- 图表侧边栏

## 完成

- 连续 K 只用 `consecutiveTrendBars`
- 腿幅度只用 `LegStart` 与 `LegEnd` 的差
- 可与第二次入场、信号 K 并行
