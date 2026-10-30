# classifyDoji

Status: **implemented**. Task: [impl-classify-doji](../tasks/impl-classify-doji.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记实体相对整根 K 过小的十字 K。一根合格 K 一条 `doji`。不把十字串解释成铁丝网。

## 输入

```ts
function classifyDoji(bars: Bar[]): AnalysisResult<Record<string, never>>;
```

无 `options`。只调用 `isDoji` 与 `matchingBars`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `doji` | `isDoji` |
| `unclear` | 没有十字 |

| LevelName | 价格 |
|-----------|------|
| `BarHigh` | 该 K 的 high |
| `BarLow` | 该 K 的 low |

`evidence` 为 `{}`。

```text
dojis={count}; last={lastName}
```

## 边界

- 不输出 `barbwire`、`tight_trading_range`。铁丝网仍只由 `classifyTradingRange` 判定。
- 不因为十字而否定相邻的趋势 K。那是 `classifyTrendBar` 的结果。

## 约束

- 实体比例只存在于 `isDoji`。默认 `DOJI_BODY_RATIO = 0.25`，与 `classifyTradingRange` 的 `dojiBodyRatio` 相同。零高度不是十字。
- 区间函数的铁丝网十字判定调用 `isDoji(bar, dojiBodyRatio)`，不复制公式。

## 依赖

| 依赖 | 状态 |
|------|------|
| `isDoji` / `matchingBars` | 已有，`src/utils/barPredicates.ts`。`body / barRange <= 0.25` |
| `toTimeString` / `fillSummary` | 已有 |
