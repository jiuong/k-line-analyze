# impl-classify-breakout-pullback

| 项 | 值 |
|----|----|
| 优先级 | P5 |
| 状态 | done |
| 规格 | [classify-breakout-pullback.md](../spec/classify-breakout-pullback.md) |
| 依赖 | [impl-classify-follow-through](impl-classify-follow-through.md)、[impl-classify-swing-leg](impl-classify-swing-leg.md)、[util-price-cluster](util-price-cluster.md)、[util-setup-prices](util-setup-prices.md) |

## 目标

实现 `classifyBreakoutPullback`。跟随成立后，第一条反向摆动腿回到被破边界附近，为 `breakout_pullback`。

## 范围

- `src/analyze/classifyBreakoutPullback.ts`，并导出
- `tests/analyze/classifyBreakoutPullback.test.ts`
- 锚点 `BrokenEdge`、`LegEnd`、`SignalBar`、`Entry`、`Stop`、`Target`
- 是否回到边界只调用 `pricesWithin`
- 容差在编码前写入规格
- 目标幅度用区间对侧到被破边界的距离，经 `projectMeasuredMove`

## 不做

- 没有跟随而回到区间内的，留给失败突破
- 不改 `classifyPullback` 的四种回调
- 不重新判定区间
- 图表侧边栏

## 完成

- 注入 `Bar[]`，断言用的是跟随之后的第一条反向腿
- 止损在回调腿终点之外
