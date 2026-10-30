# impl-classify-doji

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [classify-doji.md](../spec/classify-doji.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyDoji`。一根十字一条 `doji`。无命中返回 `unclear`。

## 范围

- `src/analyze/classifyDoji.ts`，并导出
- `tests/analyze/classifyDoji.test.ts`
- 标签 `doji`；锚点 `BarHigh`、`BarLow`
- 与 `classifyTradingRange` 的十字比例若相同，必须共用 `isDoji`，并在规格里写明

## 不做

- 铁丝网判断
- 图表侧边栏
- 重写实体比例

## 完成

- 空数组抛 `TypeError`
- 注入 `Bar[]`，断言名称、锚点、`summary`、`confidence === 1`
- 可与另外三个 P1 形态函数并行
