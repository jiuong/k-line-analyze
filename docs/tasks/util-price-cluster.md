# util-price-cluster

| 项 | 值 |
|----|----|
| 优先级 | P3 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) |
| 依赖 | 无 |

## 目标

`pricesWithin` 判断两个价格是否落在调用方给定的容差内。

## 范围

- `src/utils/priceCluster.ts`
- `tests/utils/priceCluster.test.ts`

## 不做

- 不决定容差的默认比例。默认值由调用它的分析函数在自己的 spec 里写下
- 不识别双顶或再测
- 不返回 `AnalysisResult`

## 完成

- 测试覆盖之内、相等、超出、容差为 0
- 非法容差抛 `TypeError`
