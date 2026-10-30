# util-trendline

| 项 | 值 |
|----|----|
| 优先级 | P3 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md)；轨道见 [classify-channel.md](../spec/classify-channel.md) |
| 依赖 | [util-swing-legs](util-swing-legs.md) |

## 目标

`channelFromLegs` 用摆动腿拟合上轨和下轨。`closesBeyond` 判断收盘是否穿过一条轨。

## 范围

- `src/utils/trendline.ts`
- `tests/utils/trendline.test.ts`
- 点数不足时返回空，不外推

## 不做

- 不输出 `bull_channel` 或破线标签
- 不判断楔形
- 不直接调用 `findSwings`

## 完成

- 测试覆盖四点才能成通道、收盘在轨外、只有影线刺破不算破线
- 不返回 `AnalysisResult`
