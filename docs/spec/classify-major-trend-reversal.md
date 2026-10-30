# classifyMajorTrendReversal

Status: **implemented**. Task: [impl-classify-major-trend-reversal](../tasks/impl-classify-major-trend-reversal.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记通道被收盘打破之后，又出现对前极值的内侧再测。先有向下破线、再有 `higher_low`，是 `bull_major_reversal`。先有向上破线、再有 `lower_high`，是 `bear_major_reversal`。

理论基础：[entry-setups.md — Major trend reversal](../theory/entry-setups.md#major-trend-reversal)。

## 输入

```ts
function classifyMajorTrendReversal(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): AnalysisResult<Record<string, never>>;
```

破线只读 `classifyTrendlineBreak`。再测只读 `classifyExtremeRetest`。`swingSpan` 默认 `2`，传给这两个函数。`priceTolerance` 只传给再测。`tickSize` 省略时 `Entry` 与 `Stop` 等于极值本身；传入时必须是有限数且 `> 0`。本函数不拟合通道，不比较两个低点，不调用 `findSwings`。

破线按时间排序。每条破线拿走最早的一条尚未使用、方向匹配、且再测 K 严格晚于破线 K 的再测。更早的再测不能配后来的破线。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_major_reversal` | 一条 `bear_line_break` 之后出现 `higher_low` |
| `bear_major_reversal` | 一条 `bull_line_break` 之后出现 `lower_high` |
| `unclear` | 两种结果对不上 |

一对破线加再测一条结果。按再测 K 的时间排序，同一时间 `bull_major_reversal` 在前。`range` 从破线 K 到再测 K。`evidence` 为 `{}`。

| LevelName | 价格 |
|-----------|------|
| `BreakBar` | 复制破线 K 的 close |
| `PriorExtreme` | 复制再测的前极值 |
| `Retest` | 复制再测价 |
| `Entry` | 再测 K 之后，第一根收盘突破该 K 顺向极值时的 `entryBeyond`。多头极值是再测 K 的 high，方向 `up`。空头是再测 K 的 low，方向 `down`。时间是突破 K。尚未突破则省略 `Entry`、`Stop`、`Target` |
| `Stop` | 有 `Entry` 时，`stopBeyond(Retest)`。时间是再测 K |
| `Target` | 有 `Entry` 时，通道高度从 `Entry` 经 `projectMeasuredMove` 向新方向投影，再 `targetFrom`。时间是突破 K。高度是匹配通道上 `max(ChannelHigh1, ChannelHigh2) - min(ChannelLow1, ChannelLow2)`。匹配要求被破轨的触点价和时间与破线结果里复制的触点一致，且通道最晚触点不晚于破线 K。多条命中时取最晚触点 |

```text
majorReversals={count}; last={lastName}
```

## 边界

- 只有破线、或只有更高的低点，都不是本函数的结果。它们留在各自的原子函数里。
- 不替代 `classifyReversalSignal` 的 `bull_reversal` / `bear_reversal`。
- 不把 `wedge_top` 自动升成主要趋势反转。

## 约束

- 再测的时间必须晚于破线 K。更早的 `higher_low` 不能配这条破线。
- 不调用 `findSwings`。
- 点位只在再测之后已经突破时填写。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyTrendlineBreak` | 已有 |
| `classifyExtremeRetest` | 已有 |
| `classifyChannel` | 已有，只读取轨道高度，不重新拟合 |
| `projectMeasuredMove` | 已有 |
| `setupPrices` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
