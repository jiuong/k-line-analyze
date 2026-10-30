# classifyInsideBar

Status: **implemented**. Task: [impl-classify-inside-bar](../tasks/impl-classify-inside-bar.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记高和低都落在前一根 K 之内的内包 K。一根一条 `inside_bar`。连续内包是多条结果，不是一个组合形态。

## 输入

```ts
function classifyInsideBar(bars: Bar[]): AnalysisResult<Record<string, never>>;
```

无 `options`。只调用 `isInsideBar` 与 `matchingBars`。第一根没有前一根，谓词为假。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `inside_bar` | `isInsideBar` |
| `unclear` | 没有内包 |

| LevelName | 价格 |
|-----------|------|
| `BarHigh` | 该 K 的 high |
| `BarLow` | 该 K 的 low |

`range` 覆盖内包 K 本身。`evidence` 为 `{}`。

```text
insideBars={count}; last={lastName}
```

## 边界

- 不输出 ii / iii 作为单独标签。
- 高 ≤ 前高且低 ≥ 前低，并且至少一侧更紧，才是内包。高低都相等不是内包。本函数不另加例外。
- 不把内包当成反转或突破。

## 约束

- 不读取 `classifyReversalSignal`。反转函数里已停用的内包规则不在这里复活。
- 时间空洞两侧的相邻数组元素仍按内包比较。

## 依赖

| 依赖 | 状态 |
|------|------|
| `isInsideBar` / `matchingBars` | 已有，`src/utils/barPredicates.ts`。全等不是内包 |
| `toTimeString` / `fillSummary` | 已有 |
