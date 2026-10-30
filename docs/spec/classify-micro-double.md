# classifyMicroDouble

Status: **implemented**. Task: [impl-classify-micro-double](../tasks/impl-classify-micro-double.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记相邻 K 上几乎相等的两个高或两个低。高点是 `micro_double_top`，低点是 `micro_double_bottom`。不使用摆动跨度。

## 输入

```ts
function classifyMicroDouble(
  bars: Bar[],
  options?: { tickSize?: number; priceTolerance?: number },
): AnalysisResult<Record<string, never>>;
```

比较相邻两根的 high 或 low，只调用 `pricesWithin`。不调用 `findSwings`。

省略 `priceTolerance` 时，容差是 `0.25` 乘以全窗 `barRange` 的平均值，与 `classifyDoubleTopBottom` 相同。平均值为 0 时容差为 0。传入的 `priceTolerance` 是绝对价差，必须是有限数且 `>= 0`，否则 `TypeError`。`tickSize` 省略时 `Entry` 与 `Stop` 等于极值本身；传入时必须是有限数且 `> 0`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `micro_double_top` | 相邻两根的 high 落在容差内，且后一根不是外包 |
| `micro_double_bottom` | 相邻两根的 low 落在容差内，且后一根不是外包 |
| `unclear` | 没有这样的一对 |

同一对 K 可以同时有高和低各一条，如果两侧都落在容差内。按时间然后按 `micro_double_top` 在前排序。

| LevelName | 价格 |
|-----------|------|
| `Top1` `Top2` | 两根 K 的 high |
| `Bottom1` `Bottom2` | 两根 K 的 low |
| `Entry` | 第二根之后，第一根收盘穿过反向极值时的 `entryBeyond`。顶的反向极值是两根 `low` 的更低者，交易方向 `down`。底是两根 `high` 的更高者，方向 `up`。时间是突破 K。尚未突破则省略 |
| `Stop` | 有 `Entry` 时，`stopBeyond` 同侧极值。顶用两根 `high` 的更高者，底用两根 `low` 的更低者。时间是打出该极值的 K；相等时用后一根 |

`range` 覆盖这两根 K。

```text
microDoubles={count}; last={lastName}
```

## 边界

- 中间隔了任意一根 K 的两个高不是微型双顶。那要等它们成为摆动后再由 `classifyDoubleTopBottom` 判断。
- 外包使后一根单独包住前一根时，不把这一对叫做微型双顶或双底。外包与否调用 `isOutsideBar`。
- 不输出 `double_top` / `double_bottom`。

## 约束

- 不调用 `findSwings` 或 `classifySwingLeg`。
- `Top1` 的时间早于 `Top2`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `pricesWithin` | 已有，`src/utils/priceCluster.ts` |
| `isOutsideBar` | 已有，`src/utils/barPredicates.ts` |
| `setupPrices` | 已有，仅在突破后调用 |
| `toTimeString` / `fillSummary` | 已有 |
