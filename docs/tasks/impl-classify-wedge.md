# impl-classify-wedge

| 项 | 值 |
|----|----|
| 优先级 | P6 |
| 状态 | done |
| 规格 | [classify-wedge.md](../spec/classify-wedge.md) |
| 依赖 | [impl-classify-swing-leg](impl-classify-swing-leg.md)、[util-price-cluster](util-price-cluster.md)、[util-measured-move](util-measured-move.md)、[util-setup-prices](util-setup-prices.md) |

## 目标

实现 `classifyWedge`。同向三次推进为 `wedge_top` 或 `wedge_bottom`。

## 范围

- `src/analyze/classifyWedge.ts`，并导出
- `tests/analyze/classifyWedge.test.ts`
- 锚点 `Push1`、`Push2`、`Push3`
- 第三推之后已经反向突破时才填 `Entry`、`Stop`、`Target`
- 三推全部落在反向主趋势内时 `evidence.items[i].role` 为 `flag`，否则为 `reversal`
- 间距比较只调用 `pricesWithin`

## 不做

- 不要求通道先成立
- 不把 `role = reversal` 写成主要趋势反转
- 不用三根趋势 K 代替三条摆动腿
- 图表侧边栏

## 完成

- 只有两次测试时为 `unclear` 或不输出该段
- 没有反向突破时结果里没有 `Entry`
- 可与双顶双底、微型双顶并行
