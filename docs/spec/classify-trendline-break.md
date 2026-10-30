# classifyTrendlineBreak

Status: **implemented**. Task: [impl-classify-trendline-break](../tasks/impl-classify-trendline-break.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记收盘穿过已有通道轨道的那根 K。向上穿出下降通道下轨或上升通道上轨的方向由通道方向决定：收盘突破 `bear_channel` 的上轨为 `bull_line_break`，收盘跌破 `bull_channel` 的下轨为 `bear_line_break`。

## 输入

```ts
function classifyTrendlineBreak(
  bars: Bar[],
  options?: { swingSpan?: number },
): AnalysisResult<Record<string, never>>;
```

通道只读 `classifyChannel`。是否破线只调用 `closesBeyond`。`swingSpan` 原样下传。

扫描从被破轨较晚触点的下一根开始。下一条同向通道里，晚于本通道最晚触点的最早触点之前结束；共用的更早触点不截断。没有这样的触点则扫到最后一根。每根收盘出轨一条结果。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_line_break` | 收盘向上突破通道上轨 |
| `bear_line_break` | 收盘向下跌破通道下轨 |
| `unclear` | 没有这样的收盘 |

一根破线 K 一条结果。

| LevelName | 价格 |
|-----------|------|
| `BreakBar` | 该 K 的 close |
| `ChannelHigh1` 或 `ChannelLow1` | 被破的那条轨的第一个触点，便于对照。第二条触点用 `ChannelHigh2` 或 `ChannelLow2` |

`range` 是破线 K 的开盘时间。`evidence` 为 `{}`。

```text
breaks={count}; last={lastName}
```

## 边界

- 只有影线刺破、收盘回到通道内，不是本函数的结果。那是通道的 `overshoot`。
- 不要求之后再测前高或前低。再测是 `classifyExtremeRetest`。两者都有才是 `classifyMajorTrendReversal`。
- 不输出 `range_break`。区间边界的突破是 `classifyRangeBreak`。

## 约束

- 不重新拟合轨道。线上的价格用 `railPriceAt`。是否在轨外只调用 `closesBeyond`：上轨看收盘是否高于线，下轨看收盘是否低于线。收盘落在线上不是外侧。影线刺破、收盘未出轨不是破线。
- 顺通道方向的收盘突破不是趋势线被打破。`closesBeyond` 只回答收盘是否在给定轨的外侧。`classifyTrendlineBreak` 只把多头通道的下轨、空头通道的上轨当破线。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyChannel` | 已有 |
| `closesBeyond` | 已有，`src/utils/trendline.ts` |
| `toTimeString` / `fillSummary` | 已有 |
