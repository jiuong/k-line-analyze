# util-fib-retracement

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) |
| 依赖 | 无 |

## 目标

按输入 `Bar[]` 窗口高低极值与出现时间，投影斐波那契**回撤**价格点位。

## 范围

- `src/utils/fibonacci.ts`
- `tests/utils/fibonacci.test.ts`

## 不做

- 扩展点位见 [util-fib-extension](util-fib-extension.md)（独立 API，本任务不实现）
- 不返回 `AnalysisResult`
- 不改 `classifyPullback` / 图表 overlay

## 完成

- 先低后高 → `high_to_low`；先高后低 → `low_to_high`
- 同 bar 极值或零 range → `null`
- 默认 ratios：`0 / 0.236 / 0.382 / 0.5 / 0.618 / 0.786 / 1`
- 非法入参抛 `TypeError`
