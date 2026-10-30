# classifyBodyGap

Status: **implemented**. Task: [impl-classify-body-gap](../tasks/impl-classify-body-gap.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记相邻 K 之间的实体缺口。尚未被后续 K 补上的是 `open_body_gap`，已被补上的是 `filled_body_gap`。不把缺口解释成测量缺口或衰竭缺口。

## 输入

```ts
function classifyBodyGap(bars: Bar[]): AnalysisResult<Record<string, never>>;
```

无 `options`。缺口列表只来自 `findBodyGaps`。与前一根比较时，实体使用 `withGapBody`，与 `classifyReversalSignal` 同一规则。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `open_body_gap` | `findBodyGaps` 给出缺口，且没有补上它的后续索引 |
| `filled_body_gap` | 同一缺口已被后续 K 补上 |
| `unclear` | 没有缺口 |

一条缺口一条结果。

| LevelName | 价格 |
|-----------|------|
| `GapNear` | 见共享契约 |
| `GapFar` | 见共享契约 |

`range.start` 是缺口后那根 K 的开盘时间。若已补上，`range.end` 是补上那根 K 的开盘时间；否则 `end` 省略。`evidence` 为 `{}`。

```text
gaps={count}; last={lastName}
```

## 边界

- 不输出 `measuring_gap`、`exhaustion_gap`。本批没有这两个标签。
- 影线相触或相等不是缺口。判定放在 `findBodyGaps`。
- 不因为缺口而发出反转或趋势标签。
- 复盘页侧边栏勾选 **Body gap** 后，`GapNear` / `GapFar` 画成水平线。画法见 [chart.md](../specification/chart.md)。

## 约束

- `classifyReversalSignal` 调用 `withGapBody`。标签、确认 K 和打印价不变。
- 本函数不复制缺口并入实体的公式。

## 依赖

| 依赖 | 状态 |
|------|------|
| `withGapBody` | 已有。`src/utils/gapBody.ts` |
| `findBodyGaps` | 已有。`src/utils/bodyGaps.ts` |
| `toTimeString` / `fillSummary` | 已有 |
