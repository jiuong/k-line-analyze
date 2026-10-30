# classifyClimax

Status: **implemented**. Task: [impl-classify-climax](../tasks/impl-classify-climax.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记连续强趋势 K，或相邻顺势摆动腿的幅度明显放大。多头一段 `buy_climax`，空头一段 `sell_climax`。它表示这段推进偏晚，不负责开一段新趋势。

## 输入

```ts
function classifyClimax(
  bars: Bar[],
  options?: { swingSpan?: number },
): AnalysisResult<ClimaxEvidence>;
```

连续 K 只调用 `consecutiveTrendBars(bars, 3)`。腿幅度只读 `classifySwingLeg` 的 `LegStart` / `LegEnd`。后一段同向腿的幅度至少是前一段的 2 倍，且前一段幅度大于 0。`swingSpan` 下传给 `readSwingLegs`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `buy_climax` | 至少 3 根连续多头趋势 K，或后一段 `bull_leg` 的幅度达到前一段的 2 倍 |
| `sell_climax` | 空头对称 |
| `unclear` | 没有这样的一段 |

一段一条结果。K 线路径的区间是那段连续 K。腿路径只取后一段腿。索引区间相交时只留更长的一段。等长留更早开始的。起点相同留 `source` 为 `bars` 的一段。

| LevelName | 价格 |
|-----------|------|
| `BarHigh` 或 `BarLow` | 多头高潮取这段最高 high 所在 K；空头取这段最低 low 所在 K。只保留极值的那一个 level 名 |

`evidence.items[i].source` 为 `bars` 或 `legs`，说明这条结果来自哪条路径。

```text
climaxes={count}; last={lastName}
```

## 边界

- 不输出 `bull_reversal`，也不因为高潮而打开 `bear_trend`。
- 不把高潮叫做测量缺口或衰竭缺口。
- 不使用 `high1` 计数。

## 约束

- 连续 K 与趋势 K 谓词共用 `consecutiveTrendBars`，不另写实体比较。
- 腿幅度用两个 level 的差，不把 high/low 再扫一遍。

## 依赖

| 依赖 | 状态 |
|------|------|
| `consecutiveTrendBars` | 已有 |
| `classifySwingLeg` / `readSwingLegs` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
