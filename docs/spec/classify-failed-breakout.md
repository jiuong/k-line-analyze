# classifyFailedBreakout

Status: **implemented**. Task: [impl-classify-failed-breakout](../tasks/impl-classify-failed-breakout.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记一次区间突破没有形成跟随，并且之后有收盘回到区间内。一条失败一条 `failed_breakout`。

理论基础：[entry-setups.md — Failed breakout](../theory/entry-setups.md#failed-breakout)。

## 输入

```ts
function classifyFailedBreakout(
  bars: Bar[],
  options?: { tickSize?: number },
): AnalysisResult<{ directions: SetupDirection[] }>;
```

突破只读 `classifyRangeBreak`。跟随只读 `classifyFollowThrough`。同一条跟随是 `BreakBar` 时间相同，且 `BrokenEdge` 的价格和时间都相同。向上突破回到内侧是之后收盘 `<=` `BrokenEdge`；向下突破是收盘 `>=` `BrokenEdge`。等于边界算回到内侧。对侧边界不另写扫描：用 `BrokenEdge` 的价格和时间对上 `classifyTradingRange` 已有段的一侧，另一侧就是目标。`tickSize` 见共享契约。

`range` 从突破 K 到回到的那根。省略 `tickSize` 时 `Entry` 等于 `BrokenEdge`，`Stop` 等于突破 K 的 high（向上失败）或 low（向下失败）。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `failed_breakout` | 存在 `range_break`，同一突破没有 `follow_through`，且之后一根 K 的收盘回到边界内侧 |
| `unclear` | 没有这样的失败 |

| LevelName | 价格 |
|-----------|------|
| `BreakBar` | 突破 K 的 close |
| `BrokenEdge` | 被破的区间边界（入场触发价） |
| `ReturnBar` | 回到区间内那根 K 的 close |
| `SignalBar` | 失败方向上的信号极值。向上突破失败则取回到区间那根的 low；向下失败则取那根的 high（只作标注，不是入场价） |
| `Entry` | `entryBeyond(BrokenEdge)`，时间是回到内侧那根。先算入场，再写 Stop / Target |
| `Stop` | `stopBeyond(BreakBar 对应方向的极值)`。向上失败的止损在突破 K 的 high 之外；向下失败在其 low 之外 |
| `Target` | `targetFrom`，取区间对侧边界 |

`evidence.directions` 与 `results` 对齐，取值是交易方向：向上突破失败为 `down`，向下失败为 `up`。没有失败时为 `[]`。`tickSize` 省略时的 `Entry` 规则见共享契约。

```text
failedBreakouts={count}; last={lastName}
```

## 边界

- 已有 `follow_through` 的突破不是失败。之后的回调是 `classifyBreakoutPullback`。
- 不重新扫描区间。
- 不输出 `range_break` 或 `follow_through`。

## 约束

- 点位只调用 `entryBeyond` / `stopBeyond` / `targetFrom`。
- 对侧边界来自该突破的区间，不另寻高低点。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyRangeBreak` | 已有 |
| `classifyFollowThrough` | 已有 |
| `setupPrices` | 已有 |
| `classifyTradingRange` | 已有。只用来读取对侧边界 |
| `toTimeString` / `fillSummary` | 已有 |
