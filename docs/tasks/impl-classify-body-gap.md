# impl-classify-body-gap

| 项 | 值 |
|----|----|
| 优先级 | P2 |
| 状态 | done |
| 规格 | [classify-body-gap.md](../spec/classify-body-gap.md) |
| 依赖 | [util-body-gaps](util-body-gaps.md) |

## 目标

实现 `classifyBodyGap`。未补上为 `open_body_gap`，已补上为 `filled_body_gap`。

## 范围

- `src/analyze/classifyBodyGap.ts`，并导出
- `tests/analyze/classifyBodyGap.test.ts`
- 标签如上；锚点 `GapNear`、`GapFar`
- 只调用 `findBodyGaps`

## 不做

- 测量缺口、衰竭缺口
- 复制 `withGapBody`

## 完成

- 空数组抛 `TypeError`；无缺口为 `unclear`
- 注入 `Bar[]`，断言两种名称、两侧锚点、已补上时的 `range.end`
