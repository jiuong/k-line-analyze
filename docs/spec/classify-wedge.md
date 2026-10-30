# classifyWedge

Status: **implemented**. Task: [impl-classify-wedge](../tasks/impl-classify-wedge.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记同向三次推进。三次高点推进是 `wedge_top`，三次低点推进是 `wedge_bottom`。通道是否收口只作证据，没有通道也可以成立。

理论基础：[entry-setups.md — Wedge](../theory/entry-setups.md#wedge)。

## 输入

```ts
function classifyWedge(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): AnalysisResult<WedgeEvidence>;
```

三推只从 `classifySwingLeg` 的同向腿终点取。多头腿的终点是高，空头腿的终点是低。时间上连续的三条同向腿为一组。命中后下一组从第三腿之后开始。

省略 `priceTolerance` 时，容差是 `0.25` 乘以全窗 `barRange` 的平均值。平均值为 0 时容差为 0。传入的 `priceTolerance` 是绝对价差，必须是有限数且 `>= 0`，否则 `TypeError`。`swingSpan` 默认 `2`，原样传给 `classifySwingLeg`。`tickSize` 省略时 `Entry` 与 `Stop` 等于极值本身；传入时必须是有限数且 `> 0`。

抬高或走平：后一个极值不低于前一个，或 `pricesWithin` 为真。楔形底对称，后一个不高于前一个或落在容差内。间距是相邻极值的绝对价差。后一段不远于前一段加上容差，只通过 `pricesWithin(later, min(later, earlier), tolerance)` 判断，所以大幅收缩仍成立。

若从第一腿起点到第三腿终点的 K 全部落在 `classifySwingTrend` 的一段反向主趋势里，`evidence.items[i].role` 为 `flag`，否则为 `reversal`。`wedge_top` 的反向主趋势是 `bear_trend`，`wedge_bottom` 是 `bull_trend`。`minor_bull_trend` 与 `minor_bear_trend` 不算。`role` 不改变 `name`。`swingSpan` 不传给 `classifySwingTrend`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `wedge_top` | 三个依次抬高或走平的摆动高，且后一段间距不大于前一段间距加上容差 |
| `wedge_bottom` | 三个摆动低，对称 |
| `unclear` | 没有三推 |

| LevelName | 价格 |
|-----------|------|
| `Push1` `Push2` `Push3` | 三个极值，从早到晚 |
| `Entry` | 第三推终点之后，第一根收盘穿过第三腿起点时的 `entryBeyond`。顶的方向是 `down`，底是 `up`。时间是突破 K。尚未突破则省略 `Entry` |
| `Stop` | 第三推极值之外的 `stopBeyond`。有 `Entry` 时才输出。时间是第三推的 K |
| `Target` | 有 `Entry` 时，`projectMeasuredMove` 取 `abs(Push3 − Push1)`，从 `Entry` 向反向投影，再经 `targetFrom`。时间是突破 K |

`range` 从第一腿起点到第三腿终点。`evidence.items` 与非 `unclear` 结果对齐。没有楔形时 `items` 为空。

`evidence.items[i].role` 为 `flag` 或 `reversal`。

```text
wedges={count}; last={lastName}
```

## 边界

- 两次测试不是楔形。那是双顶或双底。
- 不因为 `role = reversal` 就输出 `bull_major_reversal`。
- 不要求 `classifyChannel` 先成立。若调用方同时有通道，收口与否可在实现时写入 `evidence.items[i].converging`，默认省略该字段。

## 约束

- 三推必须来自三条同向摆动腿，不能用三根趋势 K 代替。
- 点位函数只在第三推之后已经出现反向突破时填写。没有突破不发明入场价。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifySwingLeg` | 已有。只读 `readSwingLegs` |
| `classifySwingTrend` | 已有，只用于 `role` |
| `pricesWithin` | 已有，`src/utils/priceCluster.ts` |
| `projectMeasuredMove` | 已有 |
| `setupPrices` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
