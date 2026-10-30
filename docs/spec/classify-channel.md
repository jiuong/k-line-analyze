# classifyChannel

Status: **implemented**. Task: [impl-classify-channel](../tasks/impl-classify-channel.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

用同一方向上的摆动腿拟合一条上轨和一条下轨。上升通道是 `bull_channel`，下降通道是 `bear_channel`。只描述轨道，不判断破线。

## 输入

```ts
function classifyChannel(
  bars: Bar[],
  options?: { swingSpan?: number },
): AnalysisResult<ChannelEvidence>;
```

`swingSpan` 原样传给 `classifySwingLeg`。轨道点只来自 `channelFromLegs`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_channel` | `channelFromLegs` 得到上升通道 |
| `bear_channel` | `channelFromLegs` 得到下降通道 |
| `unclear` | 没有可拟合的上下轨 |

一条通道一条结果。

| LevelName | 价格 |
|-----------|------|
| `ChannelHigh1` `ChannelHigh2` | 上轨两个触点，时间从早到晚 |
| `ChannelLow1` `ChannelLow2` | 下轨两个触点，时间从早到晚 |

`range` 从最早触点到最晚触点。`evidence.items[i].overshoot` 与 `results[i]` 对齐。从最早触点到最晚触点（含两端），某根 K 的影线严格穿出 `railPriceAt`，且收盘对上下轨的 `closesBeyond` 都为假，则为 `true`。没有这样的 K 时为 `false`。`unclear` 也是 `[{ overshoot: false }]`。触点落在线上不算刺破。只有收盘出轨不是 `overshoot`。

```text
channels={count}; last={lastName}
```

## 边界

- 不输出 `bull_line_break` / `bear_line_break`。破线是 `classifyTrendlineBreak`。
- 不输出楔形。三次推进是 `classifyWedge`。
- 不把通道改写成 `bull_trend`。

## 约束

- 至少需要上轨两点和下轨两点。点数不足则该段不是通道，而不是外推一条线。
- 拟合只在 `channelFromLegs`。按方向取出腿，保留时间顺序。相邻两条同向腿是一次重画，不做平行外推。多头：下轨是两条腿的起点，上轨是两条腿的终点，后高和后低都严格更高。空头：上轨是两条腿的起点，下轨是两条腿的终点，后高和后低都严格更低。三条同向腿且两对都成立时得到两条通道，中间腿的两个触点两边共用。某一对不顺向倾斜则跳过。通道按第一条腿的起点排序。
- 不直接调用 `findSwings`。摆动只从 `classifySwingLeg` 来。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifySwingLeg` | 已有 |
| `channelFromLegs` | 已有，`src/utils/trendline.ts` |
| `toTimeString` / `fillSummary` | 已有 |
