# classifyDoubleTopBottom

Status: **implemented**. Tasks: [impl-classify-double-top-bottom](../tasks/impl-classify-double-top-bottom.md), [neckline-on-double](../tasks/neckline-on-double.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记两个摆动高或两个摆动低打到同一价位带。高点是 `double_top`，低点是 `double_bottom`。相邻 K 的微型双顶双底不在这里。

理论基础：[entry-setups.md — Double top / bottom](../theory/entry-setups.md#double-top--bottom)。

## 输入

```ts
function classifyDoubleTopBottom(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): AnalysisResult<Record<string, never>>;
```

两个极值来自 `findSwings`。是否同一价位带只调用 `pricesWithin`。`swingSpan` 默认 `2`，原样传给 `findSwings`。

省略 `priceTolerance` 时，容差是 `0.25` 乘以全窗 `barRange` 的平均值，与 `classifyMicroDouble` 相同。平均值为 0 时容差为 0。传入的 `priceTolerance` 是绝对价差，必须是有限数且 `>= 0`，否则 `TypeError`。`tickSize` 省略时 `Entry` 与 `Stop` 等于极值本身；传入时必须是有限数且 `> 0`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `double_top` | 两个摆动高 `pricesWithin` 为真，且中间有更低的摆动低把它们分开 |
| `double_bottom` | 两个摆动低对称，中间有更高的摆动高 |
| `unclear` | 没有这样的一对 |

一对一条结果。高点和低点分开扫描。命中后，下一对的第一个点必须严格晚于上一对的第二个点。三个同带高点只保留最早一对。四个同带高点是 `(1,2)` 与 `(3,4)`。按第二个点的时间排序，同一时间 `double_top` 在前。

| LevelName | 价格 |
|-----------|------|
| `Top1` `Top2` | 双顶的两个高，从早到晚。双底不使用 |
| `Bottom1` `Bottom2` | 双底的两个低。双顶不使用 |
| `Neckline` | 两个同侧摆动之间的反向摆动极值。时间是该摆动 K 的开盘。有无突破都写 |
| `Entry` | 第二个极值之后，第一根收盘穿过颈线时的 `entryBeyond`。顶的方向是 `down`，底是 `up`。时间是突破 K。尚未突破则省略 |
| `Stop` | 有 `Entry` 时，`stopBeyond` 第二个极值。时间是第二个极值的 K |

没有 `Target`。测量目标不是双顶本身的职责。

```text
doubles={count}; last={lastName}
```

## 边界

- 不输出 `micro_double_top` / `micro_double_bottom`。
- 不把更高的低点标成双底。内侧再测是 `classifyExtremeRetest`。
- 不调用 `classifyMajorTrendReversal`。

## 约束

- `Top1` / `Top2` / `Bottom1` / `Bottom2` 的含义与类型契约里已有说明一致：双顶的峰、双底的谷。
- 不通过 `classifySwingLeg` 再过滤一次摆动。摆动只来自 `findSwings`，避免和腿的合并规则缠在一起。中间的颈线若需要腿，只读已经产出的 `classifySwingLeg`，不另找拐点。

## 依赖

| 依赖 | 状态 |
|------|------|
| `findSwings` | 已有 |
| `pricesWithin` | 已有，`src/utils/priceCluster.ts` |
| `setupPrices` | 已有。仅在颈线被突破时调用 |
| `toTimeString` / `fillSummary` | 已有 |
