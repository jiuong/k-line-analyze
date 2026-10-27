# measureSecondEntry

Status: **implemented**. Task: [impl-measure-second-entry](../tasks/impl-measure-second-entry.md). Shared rules: [setup-measure.md](setup-measure.md). Theory: [entry-setups.md — Second entry](../theory/entry-setups.md#second-entry).

## 职能

把 `classifySecondEntry` 的 `high2` / `low2` 收成带计划盈亏比与实现胜率的 `SetupReport`。主目标为 **`TP1`（1.0 扩展）**。图上线段覆盖 **入场 K → 离场 K**（止损/止盈触及，或未平仓时最后一根），并标注 TP1–TP4。

## 输入

```ts
function measureSecondEntry(
  bars: Bar[],
  options?: {
    tickSize?: number;
    majorSwingSpan?: number;
    entrySwingSpan?: number;
    swingSpan?: number;
  },
): SetupReport;
```

`options` 原样传给 `classifySecondEntry`（默认 majorSpan=2、entrySpan=1）。

## 规则

- 每条同时有 `Entry`、`Stop`、`TP1`、`SignalBar` 的 `high2`/`low2` 是一笔。缺任一则跳过。`unclear` 跳过
- 看多 `stop < entry < target`，看空相反。达不到的进入 `invalid`，不进胜率；勾选本 measure 时图上仍画 Entry / Stop / Target（目标取 TP1），并标 `Fail`
- `basis` 为该标签。`high2` 为 `up`，`low2` 为 `down`
- 信号价是 `SignalBar`，信号时间是 `Entry` 的 K
- 入场、止损与目标用原子函数价（目标 = `TP1`；止损 = classify `Stop`，即 Fib 扩展锚点 P1 经 `stopBeyond`）
- 盈亏比与胜负只调用 `rewardRisk` / `resolveOutcome` / `summarizeTrades`
- `tradeSpan: true`：`range` = `entryTime` → 离场 bar（win/loss 触及 bar；open 为序列末 bar；unfilled 为入场 bar）
- `targets` 带上 TP1–TP4 供 overlay 标注
- 胜率按 `basis` 分组

## Review 侧边栏

树根勾选：侧栏胜率摘要 + 图上每笔 `Entry` / `Stop` / `TP1`–`TP4` 线段（覆盖入场→离场）。达不到目标顺序的信号同样画线并标 `Fail`。

## 不做

- 不把 TP2–TP4 纳入胜率统计（仍画在图上）
- 不改其它 measure 的覆盖范围默认（仍用形态 `range`）
