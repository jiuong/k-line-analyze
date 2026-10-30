# impl-classify-swing-leg

| 项 | 值 |
|----|----|
| 优先级 | P2 |
| 状态 | done |
| 规格 | [classify-swing-leg.md](../spec/classify-swing-leg.md) |
| 依赖 | [util-swing-legs](util-swing-legs.md) |

## 目标

实现 `classifySwingLeg`。低到高为 `bull_leg`，高到低为 `bear_leg`。

## 范围

- `src/analyze/classifySwingLeg.ts`，并导出
- `tests/analyze/classifySwingLeg.test.ts`
- 标签 `bull_leg`、`bear_leg`；锚点 `LegStart`、`LegEnd`
- `swingSpan` 原样下传，默认 `2`

## 不做

- 不输出 `bull_trend` 或回调标签
- 不调用 `singleLegDirection`
- 不合并同向腿
- 图表侧边栏

## 完成

- 空数组抛 `TypeError`；凑不出一高一低为 `unclear`
- 注入 `Bar[]`，断言方向、起止锚点、`summary`、`confidence === 1`
