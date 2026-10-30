# util-bar-metrics

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) 纯函数表 |
| 依赖 | 无 |

## 目标

实现一根 K 的长度、实体、上下影线、收盘位置。只返回数字。

## 范围

- `src/utils/barMetrics.ts`：`barRange`、`body`、`upperTail`、`lowerTail`、`closeLocation`
- `tests/utils/barMetrics.test.ts`

## 不做

- 不返回 `AnalysisResult`，不判定十字或趋势 K
- 图表侧边栏
- 新的 `AnalysisLabel`

## 完成

- 注入单根 `Bar` 的单元测试覆盖实体、影线和零高度
- 不读 MT5
