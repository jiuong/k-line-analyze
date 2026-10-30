# impl-classify-range-break

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [classify-range-break.md](../spec/classify-range-break.md) |
| 依赖 | 已有 `classifyTradingRange`。可与 [util-measured-move](util-measured-move.md) 并行 |

## 目标

实现 `classifyRangeBreak`。收盘离开区间边界为 `range_break`。不区分成功或失败。

## 范围

- `src/analyze/classifyRangeBreak.ts`，并导出
- `tests/analyze/classifyRangeBreak.test.ts`
- 标签 `range_break`；锚点 `BreakBar`、`BrokenEdge`
- `evidence.items[i].side` 为 `up` 或 `down`
- 每个区间只保留第一次这样的收盘
- 边界只读 `classifyTradingRange` 的 `RangeHigh` / `RangeLow`

## 不做

- 不重写区间扫描
- 不用 `classifySwingTrend` 的 `trading_range`
- 不输出跟随、失败或回调
- 图表侧边栏

## 完成

- 影线穿出而收盘仍在界内不是结果
- 注入 `Bar[]`，断言每个区间至多一条，且价格是收盘
