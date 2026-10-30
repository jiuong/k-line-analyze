# impl-measure-double-top-bottom

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [measure-double-top-bottom.md](../spec/measure-double-top-bottom.md)（本任务先写） |
| 依赖 | [util-setup-measure](util-setup-measure.md)、[neckline-on-double](neckline-on-double.md) |

## 目标

实现 `measureDoubleTopBottom`。颈线被收盘穿过之后，用颈线外翻 1 倍形态高度作为测量目标，再统计盈亏比和胜率。

## 范围

- 短规格，再写 `src/analyze/measureDoubleTopBottom.ts`、`tests/analyze/measureDoubleTopBottom.test.ts`，并从 `src/analyze/index.ts` 导出
- `options` 含 `swingSpan`、`tickSize`、`priceTolerance`，原样传给 `classifyDoubleTopBottom`
- 只收同时有 `Entry`、`Stop`、`Neckline` 的结果。没有突破的双顶双底不进 `trades`
- `basis` 为 `double_top`（`down`）或 `double_bottom`（`up`）
- 信号时间是 `Entry` 的 K，信号价是 `Neckline`
- 形态高度：顶是 `max(Top1, Top2) − Neckline` 的绝对值，底是 `Neckline − min(Bottom1, Bottom2)` 的绝对值
- 目标是 `projectMeasuredMove(Neckline, 高度, 交易方向)`，再交给 `rewardRisk`。不把 `Target` 写回原子函数
- 在 [docs/specification/analyze.md](../specification/analyze.md) 的测量层补本函数一行

## 不做

- 不改双顶双底的配对
- 不统计微型双顶双底
- 图表侧边栏

## 完成

- 断言目标等于颈线向交易方向翻出的 1 倍形态高度
- 一笔先到该目标，一笔先到止损
- 颈线尚未被收盘穿过时 `winRate` 为 `null`
