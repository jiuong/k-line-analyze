# classifySignalBar

Status: **implemented**. Task: [impl-classify-signal-bar](../tasks/impl-classify-signal-bar.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

标记摆动极值上收盘靠近极值、影线短、实体合格的入场 K。多头 `bull_signal_bar`，空头 `bear_signal_bar`。只输出合格 K。

## 输入

```ts
function classifySignalBar(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number },
): AnalysisResult<SignalBarEvidence>;
```

候选 K 是 `findSwings` 的拐点 K。质量只用 `closeLocation`、影线度量、`isBullTrendBar` / `isBearTrendBar`、`isInsideBar`、`isOutsideBar`。不调用 `classifyTrendBar` 等分析函数，避免为了布尔值再扫一遍标签。`swingSpan` 传给 `findSwings`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `bull_signal_bar` | 摆动低点，且满足下面的多头质量规则 |
| `bear_signal_bar` | 摆动高点，且满足空头质量规则 |
| `unclear` | 没有合格 K |

| LevelName | 价格 |
|-----------|------|
| `SignalBar` | 多头取 low，空头取 high |
| `Entry` | `entryBeyond` |
| `Stop` | `stopBeyond`，多头在该 K low 之外，空头在该 K high 之外 |

没有 `Target`。本函数不知道用哪一段腿做测量。

`evidence.items[i].inside` 与 `evidence.items[i].outside` 来自对应谓词。

```text
signalBars={count}; last={lastName}
```

## 边界

- 不调用 `classifyReversalSignal`，也不输出 `bull_reversal`。
- 不要求这根 K 同时是 `high2` 或 `low2`。
- 不合格的拐点 K 不输出为「弱信号」。

## 质量规则

同一根 K 同时是摆动高点和摆动低点时跳过。`isDoji`、`isInsideBar`、`isOutsideBar` 都不合格。

| 侧 | 规则 |
|----|------|
| 多头 | `isBullTrendBar`，`closeLocation >= 2/3`，`lowerTail / barRange <= 0.25` |
| 空头 | `isBearTrendBar`，`closeLocation <= 1/3`，`upperTail / barRange <= 0.25` |

`SignalBar`、`Entry`、`Stop` 的时间都是这根 K。多头的保护位是该 K 的 low，空头是 high。

## 约束

- 不把 `classifyDoji` 的结果当输入。十字不合格，用 `isDoji` 判断。
- 内包线的极值不能同时是摆动拐点；谓词仍照常记录到 `evidence`。

## 依赖

| 依赖 | 状态 |
|------|------|
| `findSwings` | 已有 |
| `barMetrics` / `barPredicates` | 已有 |
| `setupPrices` | 已有 |
| `toTimeString` / `fillSummary` | 已有 |
