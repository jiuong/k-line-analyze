# util-measured-move

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) |
| 依赖 | 无。可与 `impl-classify-range-break` 并行 |

## 目标

`projectMeasuredMove` 用一段腿的幅度，从锚点向指定方向投影一个价格。

## 范围

- `src/utils/measuredMove.ts`
- `tests/utils/measuredMove.test.ts`

## 不做

- 不选择用哪一段腿，不读取分析函数结果
- 不返回 `AnalysisResult`

## 完成

- 测试覆盖向上投影、向下投影、幅度为 0
- 非法幅度抛 `TypeError`
