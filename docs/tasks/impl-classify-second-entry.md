# impl-classify-second-entry

| 项 | 值 |
|----|----|
| 优先级 | P5 |
| 状态 | done |
| 规格 | [classify-second-entry.md](../spec/classify-second-entry.md) |
| 依赖 | [impl-classify-pullback](impl-classify-pullback.md)、[util-swing-legs](util-swing-legs.md)、[util-fib-extension](util-fib-extension.md)、[util-setup-prices](util-setup-prices.md)、[util-entry-counts](util-entry-counts.md) |

## 目标

主趋势回调内按腿转折累计顺势 entryCount；只输出 `high2` / `low2`，止盈为 P1/P2/P3 斐波那契扩展 TP1–TP4。

## 范围

- `src/utils/secondEntries.ts`（共享检测）
- `src/analyze/classifySecondEntry.ts`
- `tests/analyze/classifySecondEntry.test.ts`
- `classifySwingTrend` 挂 `H2`/`L2`；`measureSecondEntry` 读 `TP1`

## 不做

- 不输出 H1/H3 交易单
- 不把 TP2–4 纳入 measure 胜率
- 图表侧边栏多目标线

## 完成

- ABC 多头回调 → 一条 `high2` 且 TP1 符合扩展公式
- 无第二转折 → `unclear`
- swingTrend 不再挂全序列 H1–H3

## 变更

- TP1–TP4 扩展比由 `0.618/1/1.272/1.414` 调整为 `1/1.272/1.414/1.618`（主目标 TP1 = 1.0）
- Stop 改为 `stopBeyond(P1)`（Fib 扩展锚点）
- 突破 K 须落在冲刺所属同向 major 内；Stop 须在 Entry 反侧，否则不发单
- Dual span：`majorSwingSpan` 默认 2（粗 major），`entrySwingSpan` 默认 1（细入场腿）；未闭合冲刺不吞后续窗；Linear [JIU-327](https://linear.app/jiuong/issue/JIU-327/se-dual-spanmajorspan2-entryspan1)
- 回调打穿细腿 P1 则回退 Stop/P1（P2 保留原终点）；Linear [JIU-328](https://linear.app/jiuong/issue/JIU-328/se回调打穿细腿-p1-则回退-stopp1)
- `entryCount`（整数 `>= 1`，默认 2）选择窗内第 N 次，标签 `highN`/`lowN`。Review 侧栏 `H/L` 输入只传给 Second Entry。SwingTrend 仍只挂 `H2`/`L2`。Linear [JIU-329](https://linear.app/jiuong/issue/JIU-329/second-entry入场序号开关-entrycount)
