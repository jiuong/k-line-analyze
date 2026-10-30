# util-setup-prices

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) 的 `tickSize` 约束 |
| 依赖 | [util-measured-move](util-measured-move.md) |

## 目标

`entryBeyond`、`stopBeyond`、`targetFrom` 计算入场、止损和目标价。

## 范围

- `src/utils/setupPrices.ts`
- `tests/utils/setupPrices.test.ts`
- `tickSize` 省略时入场等于极值；传入时必须是有限数且大于 0
- `targetFrom` 接受测量移动的投影，或区间对侧价格

## 不做

- 不组装 `AnalysisResult`
- 不猜测品种的报价步长
- 图表侧边栏

## 完成

- 测试覆盖有 tick、无 tick、非法 tick、两侧止损
- 目标价只转发已给出的测量结果或对侧价格，不重新扫描 K 线
