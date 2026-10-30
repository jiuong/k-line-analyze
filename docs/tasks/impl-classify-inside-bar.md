# impl-classify-inside-bar

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [classify-inside-bar.md](../spec/classify-inside-bar.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyInsideBar`。一根内包一条 `inside_bar`。连续内包是多条结果。

## 范围

- `src/analyze/classifyInsideBar.ts`，并导出
- `tests/analyze/classifyInsideBar.test.ts`
- 标签 `inside_bar`；锚点 `BarHigh`、`BarLow`
- 相等的高或低是否算内包，实现前写入规格，逻辑只留在 `isInsideBar`

## 不做

- 不输出 ii / iii 组合标签
- 不读取 `classifyReversalSignal`
- 图表侧边栏

## 完成

- 空数组抛 `TypeError`；第一根不成内包
- 注入 `Bar[]`，断言名称、锚点、`summary`、`confidence === 1`
