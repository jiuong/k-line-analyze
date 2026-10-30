# classifyRangeBreak

Status: **implemented**. Task: [impl-classify-range-break](../tasks/impl-classify-range-break.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记收盘离开 `classifyTradingRange` 已认定边界的那根 K。向上或向下都是 `range_break`。成功、失败和回调不在这里区分。

## 输入

```ts
function classifyRangeBreak(bars: Bar[]): AnalysisResult<RangeBreakEvidence>;
```

无额外 `options`。区间只读 `classifyTradingRange` 的 `RangeHigh` / `RangeLow` 与其 `range`。不重写宽幅、窄幅、铁丝网或突破模式的扫描。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `range_break` | 区间结束之后，收盘高于该段 `RangeHigh`，或收盘低于该段 `RangeLow` |
| `unclear` | 没有这样的收盘 |

每个区间的第一次这样的收盘是一条结果。后续收盘不再为同一区间重复开结果。

| LevelName | 价格 |
|-----------|------|
| `BreakBar` | 突破 K 的 close |
| `BrokenEdge` | 被穿过的 `RangeHigh` 或 `RangeLow` |

`evidence.items[i].side` 为 `up` 或 `down`，且与 `results[i]` 对齐。没有离界收盘时只有一条 `unclear`，`evidence.items` 为 `[]`。

`range.start` 是突破 K 的开盘时间，`end` 省略。扫描从该段 `range.end` 的下一根到最后一根。同一根 K 可以同时是两个已结束区间的第一次。

```text
rangeBreaks={count}; last={lastName}
```

## 边界

- 不输出 `successful_breakout`、`failed_breakout`、`follow_through`、`breakout_pullback`。
- 区间内部的假突破仍由 `classifyTradingRange` 用来截断区间，不在这里再标一次。
- 不把 `classifySwingTrend` 的 `trading_range` 当作边界。只用 `classifyTradingRange` 的四类区间。

## 约束

- 不修改区间函数的标签和边界价。
- 影线穿出而收盘仍在边界内，不是 `range_break`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyTradingRange` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
