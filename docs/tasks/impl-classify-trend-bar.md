# impl-classify-trend-bar

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [classify-trend-bar.md](../spec/classify-trend-bar.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyTrendBar`。一根趋势 K 一条结果。无命中返回 `unclear`。

## 范围

- `src/analyze/classifyTrendBar.ts`，并在 `src/analyze/index.ts` 导出
- `tests/analyze/classifyTrendBar.test.ts`
- 标签 `bull_trend_bar`、`bear_trend_bar` 写入 `src/types/analysis.ts` 与 types-contract
- 锚点 `BarHigh`、`BarLow`
- 阈值若在本任务选定，先写回规格

## 不做

- 十字、内包、外包函数
- 图表侧边栏
- 在本函数里重写实体比较。只用 `isBullTrendBar` / `isBearTrendBar` 和 `matchingBars`

## 完成

- 空数组抛 `TypeError`
- 注入 `Bar[]`，断言名称、两个锚点、`summary`、`confidence === 1`
- `evidence.items[i].shaved` 与结果对齐
