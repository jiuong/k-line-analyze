# classifySwingLeg

Status: **implemented**. Task: [impl-classify-swing-leg](../tasks/impl-classify-swing-leg.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

把摆动高和摆动低收成一段段腿。从低点到高点是 `bull_leg`，从高点到低点是 `bear_leg`。这不是 `classifySwingTrend` 的趋势段。

## 输入

```ts
function classifySwingLeg(
  bars: Bar[],
  options?: { swingSpan?: number },
): AnalysisResult<Record<string, never>>;
```

`swingSpan` 见共享契约，默认 `2`，原样传给 `findSwingLegs`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_leg` | 腿从摆动低走到下一摆动高 |
| `bear_leg` | 腿从摆动高走到下一摆动低 |
| `unclear` | 凑不出一高一低 |

一条腿一条结果，按起点时间排序。

| LevelName | 价格 |
|-----------|------|
| `LegStart` | 见共享契约 |
| `LegEnd` | 见共享契约 |

`range` 从起点摆动 K 的开盘时间到终点摆动 K 的开盘时间。`evidence` 为 `{}`。腿的幅度可由两个 level 相减得到，不重复放进 evidence。

```text
legs={count}; last={lastName}
```

## 边界

- 不输出 `bull_trend`、`bar_pullback`、`multi_leg_pullback`。
- 不调用 `singleLegDirection`。那条路径仍只回答「是不是一条腿」。
- 不合并同向的相邻腿。同向合并是调用方的事。
- 同一根 K 上的摆动高点和摆动低点不成腿。

## 约束

- 摆动定义以 `findSwings` 为准。本函数不写第二套拐点。
- 窗口两端因为凑不满 `swingSpan` 而没有摆动时，那些 K 不单独成腿。

## 依赖

| 依赖 | 状态 |
|------|------|
| `findSwingLegs` | 已有。`src/utils/swingLegs.ts`，内部调用 `findSwings` |
| `toTimeString` / `fillSummary` | 已有 |
