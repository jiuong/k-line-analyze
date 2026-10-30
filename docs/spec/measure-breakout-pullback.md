# measureBreakoutPullback

Status: **implemented**. Task: [impl-measure-breakout-pullback](../tasks/impl-measure-breakout-pullback.md). Shared rules: [setup-measure.md](setup-measure.md). Theory: [entry-setups.md — Breakout pullback](../theory/entry-setups.md#breakout-pullback).

## 职能

统计 `classifyBreakoutPullback` 的计划盈亏比与实现胜率。

## 输入

```ts
function measureBreakoutPullback(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): SetupReport;
```

`options` 原样传给 `classifyBreakoutPullback`。

## 规则

- 只收同时有 `Entry`、`Stop`、`Target`、`SignalBar` 的 `breakout_pullback`
- `basis` 为 `breakout_pullback`。方向用分类结果 `evidence.directions`，不靠止损和入场谁高谁低来猜
- 看多 `stop < entry < target`，看空相反。达不到的进入 `invalid`，不进胜率；勾选本 measure 时图上仍画 Entry / Stop / Target，并标 `Fail`
- 信号价是 `SignalBar`，信号时间是 `Entry` 的 K
- 目标用原子函数已有的区间高度投影，不重新测量

## Review 侧边栏

树根勾选：侧栏胜率摘要 + 图上每笔 `Entry` / `Stop` / `Target` 线段（仅覆盖该笔形态 `range`，两端带同色文字标注；见 [`../specification/chart.md`](../specification/chart.md)）。达不到目标顺序的信号同样画这三根线，并标 `Fail`。

## 不做

- 不改 `classifyBreakoutPullback`
- 不把没有跟随的回到区间内算进来
