# measureWedge

Status: **implemented**. Task: [impl-measure-wedge](../tasks/impl-measure-wedge.md). Shared rules: [setup-measure.md](setup-measure.md). Theory: [entry-setups.md — Wedge](../theory/entry-setups.md#wedge).

## 职能

只统计第三推之后已经反向突破的楔形的计划盈亏比与实现胜率。

## 输入

```ts
function measureWedge(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): SetupReport;
```

`options` 原样传给 `classifyWedge`。

## 规则

- 没有 `Entry`、`Stop` 或 `Target` 的楔形跳过
- 看多 `stop < entry < target`，看空相反。达不到的进入 `invalid`，不进胜率；勾选本 measure 时图上仍画 Entry / Stop / Target，并标 `Fail`
- `basis` 为 `wedge_top` 或 `wedge_bottom`。顶为 `down`，底为 `up`
- 信号时间是 `Entry` 的 K，信号价是 `Entry` 的价格
- `evidence.items[i].role` 抄到该笔 `context`（`flag` 或 `reversal`）。胜率仍只按 `basis` 分
- 目标用原子函数已有的 `abs(Push3 − Push1)` 投影

## Review 侧边栏

树根勾选：侧栏胜率摘要 + 图上每笔 `Entry` / `Stop` / `Target` 线段（仅覆盖该笔形态 `range`，两端带同色文字标注；见 [`../specification/chart.md`](../specification/chart.md)）。达不到目标顺序的信号同样画这三根线，并标 `Fail`。

## 不做

- 不改 `classifyWedge`
- 不按 `flag` / `reversal` 分出两个胜率
