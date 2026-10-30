# impl-classify-follow-through

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [classify-follow-through.md](../spec/classify-follow-through.md) |
| 依赖 | [impl-classify-range-break](impl-classify-range-break.md)、[util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyFollowThrough`。突破之后沿该方向连续收在边界外，达到规格写明的根数，才是 `follow_through`。

## 范围

- `src/analyze/classifyFollowThrough.ts`，并导出
- `tests/analyze/classifyFollowThrough.test.ts`
- 锚点 `BreakBar`、`FollowBar`、`BrokenEdge`
- 连续根数下限在编码前写入规格
- 若与区间函数的跟随根数相同，共用一个常量并在规格写明

## 不做

- 不把未达根数的突破叫做失败
- 不重复输出 `range_break`
- 不发出入场、止损、目标
- 图表侧边栏

## 完成

- 方向来自突破的 `side`，不重新比较区间高低
- 注入 `Bar[]`，断言 `range` 从突破 K 到最后一根跟随
