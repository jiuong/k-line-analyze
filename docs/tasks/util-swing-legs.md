# util-swing-legs

| 项 | 值 |
|----|----|
| 优先级 | P2 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md)；腿的定义见 [classify-swing-leg.md](../spec/classify-swing-leg.md) |
| 依赖 | 已有 `findSwings`。可与 P2 的缺口链并行 |

## 目标

`findSwingLegs` 把 `findSwings` 的结果收成从低到高或从高到低的腿。

## 范围

- `src/utils/swingLegs.ts`
- `tests/utils/swingLegs.test.ts`
- `swingSpan` 原样传给 `findSwings`

## 不做

- 不改 `singleLegDirection`
- 不输出 `bull_leg` / `bear_leg`
- 不合并同向腿

## 完成

- 测试覆盖一高一低、同向不合并、两端凑不满 span 时不成腿、同一根 K 上的高低点不成腿
- 不返回 `AnalysisResult`，不另写拐点比较
