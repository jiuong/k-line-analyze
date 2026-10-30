# util-bar-predicates

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) 纯函数表 |
| 依赖 | [util-bar-metrics](util-bar-metrics.md) |

## 目标

实现十字、趋势 K、内包、外包、光头光脚、连续趋势 K，以及四个形态函数共用的扫描循环。

## 范围

- `src/utils/barPredicates.ts`：`isDoji`、`isBullTrendBar`、`isBearTrendBar`、`isInsideBar`、`isOutsideBar`、`isShaved`、`consecutiveTrendBars`、`matchingBars`
- `tests/utils/barPredicates.test.ts`
- 选定的实体比例和连续根数写回 [brooks-shared.md](../spec/brooks-shared.md)，再写进代码

## 不做

- 不实现 `classifyTrendBar`、`classifyDoji`、`classifyInsideBar`、`classifyOutsideBar`
- 不返回 `AnalysisResult`
- 图表侧边栏

## 完成

- 谓词测试覆盖正例、反例和第一根没有前一根
- 内包与外包互斥有一条测试
- 度量比较只调用 `barMetrics`，不另写一套 high/low 公式
