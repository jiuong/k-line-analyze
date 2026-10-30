# measureDoubleTopBottom

Status: **implemented**. Task: [impl-measure-double-top-bottom](../tasks/impl-measure-double-top-bottom.md). Shared rules: [setup-measure.md](setup-measure.md). Theory: [entry-setups.md — Double top / bottom](../theory/entry-setups.md#double-top--bottom).

## 职能

颈线被收盘穿过之后，用颈线外翻 1 倍形态高度作为测量目标，再统计计划盈亏比与实现胜率。不把 `Target` 写回 `classifyDoubleTopBottom`。

## 输入

```ts
function measureDoubleTopBottom(
  bars: Bar[],
  options?: { swingSpan?: number; tickSize?: number; priceTolerance?: number },
): SetupReport;
```

`options` 原样传给 `classifyDoubleTopBottom`。

## 规则

- 只收同时有 `Entry`、`Stop`、`Neckline`，以及顶的 `Top1`/`Top2` 或底的 `Bottom1`/`Bottom2` 的结果。未突破不进 `trades`
- 颈线目标算完后，看多须 `stop < entry < target`，看空相反。达不到的进入 `invalid`，不进胜率；勾选本 measure 时图上仍画 Entry / Stop / Target，并标 `Fail`
- `basis` 为 `double_top`（`down`）或 `double_bottom`（`up`）
- 信号时间是 `Entry` 的 K，信号价是 `Neckline`
- 形态高度：顶是 `max(Top1, Top2) − Neckline` 的绝对值，底是 `Neckline − min(Bottom1, Bottom2)` 的绝对值
- 目标是 `projectMeasuredMove(Neckline, 高度, 交易方向)`，再交给 `rewardRisk` / `resolveOutcome` / `summarizeTrades`

## Review 侧边栏

树根勾选：侧栏胜率摘要 + 图上每笔 `Entry` / `Stop` / `Target` 线段（仅覆盖该笔形态 `range`，两端带同色文字标注；见 [`../specification/chart.md`](../specification/chart.md)）。达不到目标顺序的信号同样画这三根线，并标 `Fail`。

## 不做

- 不改双顶双底的配对
- 不统计微型双顶双底
- 不给原子函数写 `Target`
