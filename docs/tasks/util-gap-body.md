# util-gap-body

| 项 | 值 |
|----|----|
| 优先级 | P2 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md) 纯函数表；行为与 [classify-reversal-signal.md](../spec/classify-reversal-signal.md) 的缺口段一致 |
| 依赖 | 无。可与 P2 的摆动腿链并行 |

## 目标

把 `classifyReversalSignal` 里「缺口并入下一根实体」抽成 `withGapBody`。反转函数改为调用它。标签、确认 K 和打印价不变。

## 范围

- `src/utils/gapBody.ts`
- `tests/utils/gapBody.test.ts`
- `src/analyze/classifyReversalSignal.ts` 改为调用，不改规则
- 既有 `tests/analyze/classifyReversalSignal.test.ts` 保持通过

## 不做

- 不新建缺口标签
- 不改 H1 / L1 / 吞没的判定
- 不实现 `classifyBodyGap`

## 完成

- 不修改输入的 `bars`
- 反转测试无需为这次抽出而改期望
