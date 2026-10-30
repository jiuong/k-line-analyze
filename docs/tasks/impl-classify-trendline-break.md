# impl-classify-trendline-break

| 项 | 值 |
|----|----|
| 优先级 | P3 |
| 状态 | done |
| 规格 | [classify-trendline-break.md](../spec/classify-trendline-break.md) |
| 依赖 | [impl-classify-channel](impl-classify-channel.md) |

## 目标

实现 `classifyTrendlineBreak`。多头通道收盘跌破下轨为 `bear_line_break`，空头通道收盘升破上轨为 `bull_line_break`。顺势出轨不算。每根出轨记到下一条同向通道离开本通道为止。

## 范围

- `src/analyze/classifyTrendlineBreak.ts`，并导出
- `tests/analyze/classifyTrendlineBreak.test.ts`
- 锚点 `BreakBar` 用收盘价，并带上被破轨道的两个触点
- 通道只读 `classifyChannel`，破线只调用 `closesBeyond`

## 不做

- 影线刺破不算破线
- 不要求之后的再测，那是主要趋势反转
- 不输出 `range_break`
- 不重新拟合轨道
- 图表侧边栏

## 完成

- 无收盘破线为 `unclear`
- 注入 `Bar[]`，断言方向与 `BreakBar` 的价格是 close
