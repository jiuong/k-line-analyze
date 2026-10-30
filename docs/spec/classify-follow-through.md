# classifyFollowThrough

Status: **implemented**. Task: [impl-classify-follow-through](../tasks/impl-classify-follow-through.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记 `range_break` 之后、沿突破方向连续收在边界之外的那段 K。一段跟随一条 `follow_through`。

## 输入

```ts
function classifyFollowThrough(bars: Bar[]): AnalysisResult<Record<string, never>>;
```

突破只读 `classifyRangeBreak`。连续与否只调用 `consecutiveTrendBars`。最短根数是 `FOLLOW_THROUGH_BARS`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `follow_through` | 突破 K 的下一根起，`consecutiveTrendBars` 有一段同向趋势 K，且从这段开头连续收在 `BrokenEdge` 外侧的前缀达到 `FOLLOW_THROUGH_BARS`（`2`） |
| `unclear` | 没有这样的一段 |

| LevelName | 价格 |
|-----------|------|
| `BreakBar` | 复制对应突破的 close |
| `FollowBar` | 这段跟随最后一根的 close |
| `BrokenEdge` | 复制被破边界 |

`range` 从突破 K 到跟随的最后一根。`evidence` 为 `{}`。`side: "up"` 只认 `bull`，`side: "down"` 只认 `bear`。更后面另起的趋势 K 不算。不足 `FOLLOW_THROUGH_BARS` 的突破没有跟随，也不标成失败。

`FOLLOW_THROUGH_BARS` 定义在 `src/utils/barPredicates.ts`。`classifyTradingRange` 的默认 `followThroughBars` 引用同一个常量，用来按收盘截断宽幅区间。本函数还要求这些 K 是趋势 K。

```text
followThroughs={count}; last={lastName}
```

## 边界

- 不把跟随再标成 `range_break`。
- 没有达到根数的突破仍然只存在于 `classifyRangeBreak`。本函数不把它们叫做失败。失败是 `classifyFailedBreakout`。
- 不使用 `classifyTradingRange` 内部另写一份根数。宽幅截断与这里的最短跟随都读 `FOLLOW_THROUGH_BARS`。

## 约束

- 方向以突破的 `side` 为准，不重新比较区间高低。
- 不发出 `Entry` / `Stop` / `Target`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyRangeBreak` | 已有 |
| `consecutiveTrendBars` | 已有 |
| `FOLLOW_THROUGH_BARS` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
