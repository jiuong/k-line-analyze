# impl-classify-double-top-bottom

| 项 | 值 |
|----|----|
| 优先级 | P6 |
| 状态 | done |
| 规格 | [classify-double-top-bottom.md](../spec/classify-double-top-bottom.md) |
| 依赖 | [util-price-cluster](util-price-cluster.md)、[util-setup-prices](util-setup-prices.md)、已有 `findSwings` |

## 目标

实现 `classifyDoubleTopBottom`。两个摆动高为 `double_top`，两个摆动低为 `double_bottom`。

## 范围

- `src/analyze/classifyDoubleTopBottom.ts`，并导出
- `tests/analyze/classifyDoubleTopBottom.test.ts`
- 锚点使用已有的 `Top1`、`Top2`、`Bottom1`、`Bottom2`
- 颈线被收盘突破后才填 `Entry`、`Stop`。没有 `Target`
- 容差在编码前写入规格
- 摆动只来自 `findSwings`。中间必须有反向摆动把两点分开

## 不做

- 微型双顶双底
- 不把更高的低点标成双底
- 不调用 `classifyMajorTrendReversal`
- 图表侧边栏

## 完成

- 三个高点同一价位带时，后一对从前一对的第二个点之后开始
- 注入 `Bar[]`，断言 `Top1` 早于 `Top2`
