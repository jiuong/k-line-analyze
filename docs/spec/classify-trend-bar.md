# classifyTrendBar

Status: **implemented**. Task: [impl-classify-trend-bar](../tasks/impl-classify-trend-bar.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记实体占优的趋势 K。多头一根 `bull_trend_bar`，空头一根 `bear_trend_bar`。不判断趋势段，也不判断这根 K 能否当信号 K。

## 输入

```ts
function classifyTrendBar(bars: Bar[]): AnalysisResult<TrendBarEvidence>;
```

无 `options`。分类只调用 `isBullTrendBar` / `isBearTrendBar`。扫描只用 `matchingBars`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_trend_bar` | `isBullTrendBar` |
| `bear_trend_bar` | `isBearTrendBar` |
| `unclear` | 没有趋势 K |

一根 K 一条结果，按时间排序。一根 K 不会同时是多头和空头趋势 K。

| LevelName | 价格 |
|-----------|------|
| `BarHigh` | 该 K 的 high |
| `BarLow` | 该 K 的 low |

`evidence.items[i].shaved` 来自 `isShaved`，与 `results[i]` 对齐。`unclear` 时 `items` 为 `[]`。

```text
trendBars={count}; last={lastName}
```

## 边界

- 不输出 `doji`、`inside_bar`、`outside_bar`。那些是另外三个函数。
- 不输出 `bull_trend` / `bear_trend`。
- 光头光脚不是标签。

## 约束

- 不得在本函数里重写实体、影线或收盘位置的比较。趋势 K 要求 `body / barRange >= 0.5`（`TREND_BAR_BODY_RATIO`），且收盘在开盘的趋势一侧。
- 十字与趋势 K 互斥由谓词保证。本函数不另做一次互斥。`0.25 < body / barRange < 0.5` 的 K 两者都不是。

## 依赖

| 依赖 | 状态 |
|------|------|
| `isBullTrendBar` / `isBearTrendBar` / `isShaved` / `matchingBars` | 已有，`src/utils/barPredicates.ts`。实体比例 `0.5`。`isShaved` 为上下影线都为 0 |
| `toTimeString` / `fillSummary` | 已有 |
