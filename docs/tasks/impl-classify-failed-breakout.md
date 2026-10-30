# impl-classify-failed-breakout

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [classify-failed-breakout.md](../spec/classify-failed-breakout.md) |
| 依赖 | [impl-classify-range-break](impl-classify-range-break.md)、[impl-classify-follow-through](impl-classify-follow-through.md)、[util-setup-prices](util-setup-prices.md) |

## 目标

实现 `classifyFailedBreakout`。没有跟随，且之后收盘回到区间内，为 `failed_breakout`。

## 范围

- `src/analyze/classifyFailedBreakout.ts`，并导出
- `tests/analyze/classifyFailedBreakout.test.ts`
- 锚点 `BreakBar`、`ReturnBar`、`SignalBar`、`Entry`、`Stop`、`Target`
- 点位只调用 `entryBeyond`、`stopBeyond`、`targetFrom`
- 目标取该区间的对侧边界

## 不做

- 已有跟随的突破不是失败
- 不重新扫描区间
- 不输出 `range_break` 或 `follow_through`
- 图表侧边栏

## 完成

- `tickSize` 省略时 `Entry` 等于信号极值
- 注入 `Bar[]`，断言回到区间的收盘和止损在突破极值之外
