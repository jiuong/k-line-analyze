# impl-classify-micro-double

| 项 | 值 |
|----|----|
| 优先级 | P6 |
| 状态 | done |
| 规格 | [classify-micro-double.md](../spec/classify-micro-double.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md)、[util-price-cluster](util-price-cluster.md)、[util-setup-prices](util-setup-prices.md) |

## 目标

实现 `classifyMicroDouble`。相邻两根 K 的高或低落在容差内，为 `micro_double_top` 或 `micro_double_bottom`。

## 范围

- `src/analyze/classifyMicroDouble.ts`，并导出
- `tests/analyze/classifyMicroDouble.test.ts`
- 锚点 `Top1`、`Top2` 或 `Bottom1`、`Bottom2`
- 后一根若是外包则排除，判断只用 `isOutsideBar`
- 不调用 `findSwings`
- 容差在编码前写入规格，并写明是否与摆动双顶相同
- 反向突破后才填 `Entry`、`Stop`

## 不做

- 中间隔一根 K 的两个高
- 不输出 `double_top` / `double_bottom`
- 图表侧边栏

## 完成

- 同一对 K 两侧都接近时可以有两条结果，顶在底之前
- 注入相邻 `Bar[]`，断言没有摆动跨度也能命中
