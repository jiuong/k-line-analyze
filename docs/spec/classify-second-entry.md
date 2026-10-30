# classifySecondEntry

Status: **implemented**. Task: [impl-classify-second-entry](../tasks/impl-classify-second-entry.md). Shared contract: [brooks-shared.md](brooks-shared.md).

## 职能

在主趋势（`bull_trend` / `bear_trend`）的回调窗内，按摆动腿「逆势 → 顺势」转折累计与主趋势同向的相邻突破；**同一回调窗内只输出第 `entryCount` 次**（默认 2，即 `high2` / `low2`；`1` 为 `high1` / `low1`，`4` 为 `high4` / `low4`）。止盈用回调前顺势冲刺腿的 P1/P2 与触发对 K1 回调侧极值 P3 做斐波那契扩展。

回调窗由摆动腿定义：每条顺势冲刺腿之后，直到下一条创出严格新极值的顺势腿（含该恢复腿）为止。例：多头 W1/W3 空腿、W2 多腿 → W1→W2 为 H1；W3→新多头为 H2。

理论基础：[entry-setups.md — Second entry](../theory/entry-setups.md#second-entry)。

## 输入

```ts
function classifySecondEntry(
  bars: Bar[],
  options?: {
    tickSize?: number;
    entryCount?: number;
    majorSwingSpan?: number;
    entrySwingSpan?: number;
    swingSpan?: number;
  },
): AnalysisResult<Record<string, never>>;
```

| Option | Default | Role |
|--------|---------|------|
| `tickSize` | omit → `0` | 入场/止损步进 |
| `entryCount` | `2` | 回调窗内第几次顺势突破才发单。整数 `>= 1`。`1` → `high1`/`low1`，`2` → `high2`/`low2` |
| `majorSwingSpan` | `2` | 转发给 `classifySwingTrend`（粗 major / always-in） |
| `entrySwingSpan` | `1` | 转发给 `findSecondEntriesFrom` 的回调窗腿 |
| `swingSpan` | — | `majorSwingSpan` 未设时的别名（不改 `entrySwingSpan` 默认） |

## 算法

1. `classifySwingTrend(bars, { swingSpan: majorSwingSpan, attachEntryMarks: false })` 取主段。
2. `findSwingLegs(bars, entrySwingSpan)`；对多/空分别按冲刺→回调窗切分；冲刺腿须落在同向 `bull_trend`/`bear_trend` 内。未在后续创出新极值的冲刺不发窗，并跳过该冲刺继续扫描（避免早期深摆动吞掉后续窗）。
3. 窗内每个「逆势腿 → 顺势腿」转折，在顺势腿上取最早同向相邻突破（不受全局 high1–3 封顶限制）。
4. **P1/Stop 防守回退：** 以窗的细腿冲刺为初值；若冲刺结束后至突破 K 的回调逆向极值已打穿冲刺起点（空：`max(high) > start`；多：`min(low) < start`），则沿更早同向腿起点回退 P1，**P2 仍为原冲刺终点**；重复直至未打穿或无更早同向腿。`Stop = stopBeyond(P1)`，Fib 共用该 P1/P2。
5. 同一窗序号为 **`entryCount`**（默认 2）时发单，且须同时满足：
   - **突破 K**（`breakIndex`）仍落在冲刺腿所属同向 major 的 `[start, end]` 内（主趋势已翻向则不发）；
   - **Stop**（`stopBeyond(P1)`，经回退后）在 Entry 反侧（多 `stop < entry`，空相反）。
6. 无任何合法 `highN`/`lowN` → `unclear`。非法 `entryCount`（非整数或 `< 1`）抛 `TypeError`。

## 输出

| `results[].name` | 条件 |
|------------------|------|
| `highN` | 多头回调窗内第 N 次顺势高位突破（`N = entryCount`） |
| `lowN` | 空头回调窗内第 N 次顺势低位突破 |
| `unclear` | 没有任何达到 N 的突破 |

| LevelName | 价格 |
|-----------|------|
| `SignalBar` | K2 趋势侧极值 |
| `Entry` | `K1.high + tick` 或 `K1.low - tick`，时间 K2 |
| `Stop` | `stopBeyond(P1)`：回退后的防守锚（有 `tickSize` 时略超） |
| `P1` `P2` | P1=经回退的冲刺起点；P2=原细腿冲刺终点 |
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
