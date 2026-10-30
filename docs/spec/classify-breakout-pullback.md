# classifyBreakoutPullback

Status: **implemented**. Task: [impl-classify-breakout-pullback](../tasks/impl-classify-breakout-pullback.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记跟随已经成立之后，反向摆动腿回到被破边界附近。一条这样的回调一条 `breakout_pullback`。

理论基础：[entry-setups.md — Breakout pullback](../theory/entry-setups.md#breakout-pullback)。

## 输入

```ts
function classifyBreakoutPullback(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): AnalysisResult<{ directions: SetupDirection[] }>;
```

跟随只读 `classifyFollowThrough`。回调腿只读 `readSwingLegs`。`swingSpan` 只传给它，默认 `2`。是否回到边界只调用 `pricesWithin(leg.endPrice, BrokenEdge, tolerance)`。

省略 `priceTolerance` 时，容差是 `0.25` 乘以全窗平均 `barRange`。平均为 0 则容差为 0。传入值必须是有限数且 `>= 0`，否则 `TypeError`。`tickSize` 见共享契约。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `breakout_pullback` | 一条 `follow_through` 之后的第一条反向腿，终点落在容差内，且之后有一根收盘重新突破该腿 `LegStart`，期间没有收盘回到区间内侧 |
| `unclear` | 没有这样的回调 |

结果 `range` 从回调腿起点到出发 K。

| LevelName | 价格 |
|-----------|------|
| `BrokenEdge` | 跟随结果里的被破边界，原样复制 |
| `LegEnd` | 回调腿终点 |
| `SignalBar` | 出发 K 的突破侧极值。向上取 high，向下取 low（只作标注，不是入场价） |
| `Entry` | `entryBeyond(回调腿起点)`，时间是出发 K。先算入场，再写 Stop / Target |
| `Stop` | `stopBeyond`，保护位是回调腿 `LegEnd` |
| `Target` | `targetFrom(projectMeasuredMove(entry, magnitude, direction))`。幅度是 `abs(对侧边界 − BrokenEdge)`。时间是出发 K |

`evidence.directions` 与 `results` 对齐，取值是该回调的交易方向。没有回调时为 `[]`。

```text
breakoutPullbacks={count}; last={lastName}
```

## 边界

- 没有跟随的回到区间内是 `failed_breakout`，不是本函数。
- 不把 `classifyPullback` 的四种回调改名。
- 不输出 `follow_through`。

## 选择

1. 向上突破只看 `bear_leg`，向下只看 `bull_leg`。方向由 `BrokenEdge` 与 `classifyTradingRange` 的 `RangeHigh` / `RangeLow` 是否同一价格和时间决定。对不上则跳过。
2. 腿的起点不早于跟随的最后一根。每条跟随只取时间上第一条。它的终点不在容差内，就跳过这条跟随。
3. 出发 K 是该腿结束之后、下一条同向反向腿开始之前，第一根收盘突破 `LegStart` 的 K。没有则跳过。
4. 从突破后的下一根到这根出发 K，向上突破出现 `close <= BrokenEdge`，或向下出现 `close >= BrokenEdge`，就跳过。
5. 幅度用对侧边界。向上突破的对侧是 `RangeLow`，向下是 `RangeHigh`。

## 约束

- 不重新判定区间和跟随。
- 点位只走 `setupPrices` 与 `projectMeasuredMove`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifyFollowThrough` | 已有 |
| `classifySwingLeg` / `readSwingLegs` | 已有 |
| `classifyTradingRange` | 已有，只读已有边界 |
| `pricesWithin` | 已有，`src/utils/priceCluster.ts` |
| `projectMeasuredMove` | 已有 |
| `setupPrices` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
