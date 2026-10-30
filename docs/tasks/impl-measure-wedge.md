# impl-measure-wedge

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-wedge.md](../spec/measure-wedge.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[impl-classify-wedge](impl-classify-wedge.md) |

## 目标

实现 `measureWedge`。只统计第三推之后已经反向突破的楔形。

## 范围

- 短规格，再写 `src/analyze/measureWedge.ts`、`tests/analyze/measureWedge.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 含 `swingSpan`、`tickSize`、`priceTolerance`，原样传给 `classifyWedge`
- 没有 `Entry`、`Stop` 或 `Target` 的楔形跳过，不进 `trades`
- `basis` 为 `wedge_top` 或 `wedge_bottom`。顶为 `down`，底为 `up`
- 信号时间是 `Entry` 的 K，信号价是 `Entry` 的价格。不另加第三腿起点 level
- `evidence.items[i].role` 抄到该笔 `context`（`flag` 或 `reversal`）。胜率仍只按 `basis` 分
- 目标用原子函数已有的 `abs(Push3 − Push1)` 投影
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改 `classifyWedge`
- 不按 `flag` / `reversal` 分出两个胜率
- 图表侧边栏

## 完成

- 已突破的一笔进入 `trades`，未突破的楔形不进入
- 一笔先到目标，一笔先到止损
- `context` 与对应 `role` 一致
