# util-fib-extension

| 项 | 值 |
|----|----|
| 优先级 | P4 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) |
| 依赖 | 无。与 [util-fib-retracement](util-fib-retracement.md) 并列，互不调用 |

## 目标

按输入 `Bar[]` 的窗口高低定为 V1/V2，在 V2 之后取反向极值 V3，投影斐波那契**扩展**价格点位。

## 范围

- `src/utils/fibonacci.ts`（扩展 API）
- `tests/utils/fibonacci.test.ts`

## 不做

- 不改回撤默认档与行为
- 不用 `findSwingLegs`
- 不返回 `AnalysisResult` / 不接图表

## 完成

- `price(r) = V3 + r * (V2 − V1)`
- 默认 ratios 含 `0`～`1` 与 `1.272` / `1.414` / `1.618` / `2` / `2.618` / `3.618` / `4.236`
- V2 后无 K、同 bar 极值、零 range → `null`
- 非法入参抛 `TypeError`
