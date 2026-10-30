# classifyOutsideBar

Status: **implemented**. Task: [impl-classify-outside-bar](../tasks/impl-classify-outside-bar.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记高高于前一根且低低于前一根的外包 K。一根一条 `outside_bar`。

## 输入

```ts
function classifyOutsideBar(bars: Bar[]): AnalysisResult<Record<string, never>>;
```

无 `options`。只调用 `isOutsideBar` 与 `matchingBars`。第一根没有前一根，谓词为假。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `outside_bar` | `isOutsideBar` |
| `unclear` | 没有外包 |

| LevelName | 价格 |
|-----------|------|
| `BarHigh` | 该 K 的 high |
| `BarLow` | 该 K 的 low |

`evidence` 为 `{}`。

```text
outsideBars={count}; last={lastName}
```

## 边界

- 外包不是 `bull_reversal` / `bear_reversal`，也不是吞没信号。吞没仍属于 `classifyReversalSignal`。
- 不输出方向。外包 K 的方向留给读取它的组合函数。

## 约束

- 高低比较只写在 `isOutsideBar`：高高于前高且低低于前低。一侧相等不是外包。
- 与内包互斥：同一根相对前一根不能既内包又外包。互斥由两个谓词保证。高低全等时两边都为假。

## 依赖

| 依赖 | 状态 |
|------|------|
| `isOutsideBar` / `matchingBars` | 已有，`src/utils/barPredicates.ts`。两侧都必须严格超出 |
| `toTimeString` / `fillSummary` | 已有 |
