# classifySecondEntry

Status: **implemented**. Task: [impl-classify-second-entry](../tasks/impl-classify-second-entry.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

在主趋势（`bull_trend` / `bear_trend`）的回调窗内，按摆动腿「逆势 → 顺势」转折累计与主趋势同向的相邻突破；**仅当同一回调窗内出现第 2 次**（`high2` / `low2`）时输出交易单。止盈用回调前顺势冲刺腿的 P1/P2 与触发对 K1 回调侧极值 P3 做斐波那契扩展。

回调窗由摆动腿定义：每条顺势冲刺腿之后，直到下一条创出严格新极值的顺势腿（含该恢复腿）为止。例：多头 W1/W3 空腿、W2 多腿 → W1→W2 为 H1；W3→新多头为 H2。

理论基础：[entry-setups.md — Second entry](../theory/entry-setups.md#second-entry)。

## 输入

```ts
function classifySecondEntry(
  bars: Bar[],
  options?: { tickSize?: number; swingSpan?: number },
): AnalysisResult<Record<string, never>>;
```

| Option | Default | Role |
|--------|---------|------|
| `tickSize` | omit → `0` | 入场/止损步进 |
| `swingSpan` | `2` | 转发给 `classifySwingTrend` / `findSwingLegs` |

## 算法

1. `classifySwingTrend(bars, { swingSpan, attachEntryMarks: false })` 取主段。
2. `findSwingLegs`；对多/空分别按冲刺→回调窗切分；冲刺腿须落在同向 `bull_trend`/`bear_trend` 内。
3. 窗内每个「逆势腿 → 顺势腿」转折，在顺势腿上取最早同向相邻突破（不受全局 high1–3 封顶限制）。
4. 同一窗序号为 **2** 时发单。无任何 `high2`/`low2` → `unclear`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `high2` | 多头回调窗内第 2 次顺势高位突破 |
| `low2` | 空头回调窗内第 2 次顺势低位突破 |
| `unclear` | 没有任何 H2/L2 |

| LevelName | 价格 |
|-----------|------|
| `SignalBar` | K2 趋势侧极值 |
| `Entry` | `K1.high + tick` 或 `K1.low - tick`，时间 K2 |
| `Stop` | `stopBeyond`：高位保护 K1.low，低位保护 K1.high |
| `P1` `P2` | 回调前冲刺腿起止价 |
| `P3` | K1 回调侧极值（多 `low` / 空 `high`） |
| `TP1`–`TP4` | `projectFibExtension(P1,P2,P3)` 在 `1` / `1.272` / `1.414` / `1.618` |

```text
entries={count}; last={lastName}
```

## 依赖

| 依赖 | 状态 |
|------|------|
| `classifySwingTrend` | 已有（`attachEntryMarks: false`） |
| `findSwingLegs` / `findSecondEntriesFrom` | 已有 |
| `projectFibExtension` / `setupPrices` | 已有 |
