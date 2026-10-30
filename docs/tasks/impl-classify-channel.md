# impl-classify-channel

| 项 | 值 |
|----|----|
| 优先级 | P3 |
| 状态 | done |
| 规格 | [classify-channel.md](../spec/classify-channel.md) |
| 依赖 | [impl-classify-swing-leg](impl-classify-swing-leg.md)、[util-trendline](util-trendline.md) |

## 目标

实现 `classifyChannel`。上升为 `bull_channel`，下降为 `bear_channel`。只描述轨道。

## 范围

- `src/analyze/classifyChannel.ts`，并导出
- `tests/analyze/classifyChannel.test.ts`
- 四个轨道锚点 `ChannelHigh1`、`ChannelHigh2`、`ChannelLow1`、`ChannelLow2`
- `evidence.items[i].overshoot` 只表示影线刺破而收盘仍在通道内
- 腿只读 `classifySwingLeg`，拟合只调用 `channelFromLegs`

## 不做

- 破线标签、楔形
- 直接调用 `findSwings`
- 图表侧边栏

## 完成

- 点数不足为 `unclear`，不外推
- 注入 `Bar[]`，断言轨道锚点顺序从早到晚
