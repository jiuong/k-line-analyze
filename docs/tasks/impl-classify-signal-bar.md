# impl-classify-signal-bar

| 项 | 值 |
|----|----|
| 优先级 | P5 |
| 状态 | done |
| 规格 | [classify-signal-bar.md](../spec/classify-signal-bar.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md)、[util-setup-prices](util-setup-prices.md)、已有 `findSwings` |

## 目标

实现 `classifySignalBar`。只输出摆动极值上合格的 `bull_signal_bar` 或 `bear_signal_bar`。

## 范围

- `src/analyze/classifySignalBar.ts`，并导出
- `tests/analyze/classifySignalBar.test.ts`
- 锚点 `SignalBar`、`Entry`、`Stop`。没有 `Target`
- 质量规则（收盘位置、影线、是否允许内包或外包）在编码前写入规格
- 候选 K 来自 `findSwings`。质量只用度量和谓词，不调用形态分析函数

## 不做

- 不调用 `classifyReversalSignal`
- 不要求同时是 `high2` / `low2`
- 不合格的拐点不输出为弱信号
- 图表侧边栏

## 完成

- 注入 `Bar[]`，断言只保留合格 K
- `evidence.items[i].inside` 与 `outside` 来自谓词
