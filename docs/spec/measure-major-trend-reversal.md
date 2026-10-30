# measureMajorTrendReversal

Status: **implemented**. Task: [impl-measure-major-trend-reversal](../tasks/impl-measure-major-trend-reversal.md). Shared rules: [setup-measure.md](setup-measure.md). Theory: [entry-setups.md — Major trend reversal](../theory/entry-setups.md#major-trend-reversal).

## 职能

只统计再测之后已经顺向突破的主要趋势反转的计划盈亏比与实现胜率。

## 输入

```ts
function measureMajorTrendReversal(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): SetupReport;
```

`options` 原样传给 `classifyMajorTrendReversal`。

## 规则

- 没有 `Entry`、`Stop` 或 `Target` 的结果跳过
- 看多 `stop < entry < target`，看空相反。达不到的进入 `invalid`，不进胜率；勾选本 measure 时图上仍画 Entry / Stop / Target，并标 `Fail`
- `basis` 为 `bull_major_reversal`（`up`）或 `bear_major_reversal`（`down`）
- 信号时间是 `Entry` 的 K，信号价是 `Retest`
- 目标用原子函数已有的通道高度投影

## Review 侧边栏

树根勾选：侧栏胜率摘要 + 图上每笔 `Entry` / `Stop` / `Target` 线段（仅覆盖该笔形态 `range`，两端带同色文字标注；见 [`../specification/chart.md`](../specification/chart.md)）。达不到目标顺序的信号同样画这三根线，并标 `Fail`。

## 不做

- 不改 `classifyMajorTrendReversal`
- 不把只有破线或只有再测算成交易
