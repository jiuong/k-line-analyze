# impl-classify-extreme-retest

| 项 | 值 |
|----|----|
| 优先级 | P3 |
| 状态 | done |
| 规格 | [classify-extreme-retest.md](../spec/classify-extreme-retest.md) |
| 依赖 | [impl-classify-swing-leg](impl-classify-swing-leg.md)、[util-price-cluster](util-price-cluster.md) |

## 目标

实现 `classifyExtremeRetest`。后低不低于前低为 `higher_low`，后高不高于前高为 `lower_high`。

## 范围

- `src/analyze/classifyExtremeRetest.ts`，并导出
- `tests/analyze/classifyExtremeRetest.test.ts`
- 锚点 `PriorExtreme`、`Retest`
- 容差默认值在编码前写入规格
- 腿只读 `classifySwingLeg`，比较只调用 `pricesWithin`

## 不做

- 不要求前面有破线
- 不输出双顶双底
- 可与 `impl-classify-channel` 并行
- 图表侧边栏

## 完成

- 注入 `Bar[]`，断言再测在前极值的内侧
- 两个几乎相等的高不标成 `lower_high`
