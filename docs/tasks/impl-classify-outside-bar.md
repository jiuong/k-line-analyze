# impl-classify-outside-bar

| 项 | 值 |
|----|----|
| 优先级 | P1 |
| 状态 | done |
| 规格 | [classify-outside-bar.md](../spec/classify-outside-bar.md) |
| 依赖 | [util-bar-predicates](util-bar-predicates.md) |

## 目标

实现 `classifyOutsideBar`。一根外包一条 `outside_bar`，不带方向。

## 范围

- `src/analyze/classifyOutsideBar.ts`，并导出
- `tests/analyze/classifyOutsideBar.test.ts`
- 标签 `outside_bar`；锚点 `BarHigh`、`BarLow`

## 不做

- 不把它当成反转或吞没
- 图表侧边栏
- 重写高低比较

## 完成

- 空数组抛 `TypeError`
- 注入 `Bar[]`，断言名称、锚点、`summary`、`confidence === 1`
- 与内包互斥由谓词保证，本任务不另写一套
