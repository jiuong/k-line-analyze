# classifyExtremeRetest

Status: **implemented**. Task: [impl-classify-extreme-retest](../tasks/impl-classify-extreme-retest.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记后一段摆动没有突破前一段同侧极值。后低高于前低是 `higher_low`。后高低于前高是 `lower_high`。

## 输入

```ts
function classifyExtremeRetest(
  bars: Bar[],
  options?: { swingSpan?: number; priceTolerance?: number },
): AnalysisResult<Record<string, never>>;
```

腿只读 `classifySwingLeg`。同一侧端点按索引去重后，只比较时间上相邻的一对。低点是多头腿的起点和空头腿的终点。高点是空头腿的起点和多头腿的终点。是否打到同一价带只调用 `pricesWithin`。

省略 `priceTolerance` 时，容差是 `0.25` 乘以全窗 `barRange` 的平均值。平均值为 0 时容差为 0。传入的 `priceTolerance` 是绝对价差，必须是有限数且 `>= 0`，否则 `TypeError`。`swingSpan` 原样下传。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `higher_low` | 后一个摆动低严格高于前一个摆动低，且 `pricesWithin` 为假 |
| `lower_high` | 后一个摆动高严格低于前一个摆动高，且 `pricesWithin` 为假 |
| `unclear` | 没有这样的一对 |

一对一条结果，按再测 K 的时间排序。

| LevelName | 价格 |
|-----------|------|
| `PriorExtreme` | 前低或前高 |
| `Retest` | 后低或后高 |

`range` 从前极值 K 到再测 K。`evidence` 为 `{}`。

```text
retests={count}; last={lastName}
```

## 边界

- 不要求前面有破线。破线加再测才是主要趋势反转。
- 不是双顶或双底。两个几乎相等的高是 `classifyDoubleTopBottom`。本函数要求再测停在极值的内侧。
- 不输出 `minor_bull_trend` / `minor_bear_trend`。

## 约束

- 比较的是摆动腿的端点，不是任意 K 的高低。落在容差带里，或已经突破到外侧，都不是本函数的结果。
- 容差只通过 `pricesWithin`。省略时的比例是 `0.25`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifySwingLeg` | 已有 |
| `pricesWithin` | 已有，`src/utils/priceCluster.ts` |
| `toTimeString` / `fillSummary` | 已有 |
