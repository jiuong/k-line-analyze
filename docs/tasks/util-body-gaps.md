# util-body-gaps

| 项 | 值 |
|----|----|
| 优先级 | P2 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md)；缺口定义见 [classify-body-gap.md](../spec/classify-body-gap.md) |
| 依赖 | [util-gap-body](util-gap-body.md) |

## 目标

`findBodyGaps` 列出相邻实体缺口，以及后来补上它的那根 K 的索引。

## 范围

- `src/utils/bodyGaps.ts`
- `tests/utils/bodyGaps.test.ts`
- 实体比较调用 `withGapBody`，不复制公式

## 不做

- 不输出 `open_body_gap` / `filled_body_gap`
- 不判断测量缺口或衰竭缺口
- 图表侧边栏

## 完成

- 测试覆盖向上缺口、向下缺口、未补上、已补上、影线相触不算缺口
- 不返回 `AnalysisResult`
