# util-entry-counts

| 项 | 值 |
|----|----|
| 优先级 | P5 后补 |
| 状态 | done |
| 规格 | [brooks-shared.md](../spec/brooks-shared.md)；与 [classify-second-entry.md](../spec/classify-second-entry.md) 一致 |
| 依赖 | 无（只读 `Bar[]`） |

## 目标

提供**全序列**相邻破高/破低工具 `countAdjacentEntries`（`high1`–`high3` / `low1`–`low3`，每侧最多 3）。写入 `brooks-shared` Pure helpers。

## 与 SE 的关系（现状）

- **`classifySecondEntry` / `classifySwingTrend` 图上 H2·L2 不调用本 util。**
- 回调内 H1/H2 序号与 SE 发单走 [`findSecondEntriesFrom`](../spec/classify-second-entry.md)（摆动腿 hinge + 窗内第 2 次）。
- 本 util 保留为独立相邻计数；勿再写成「SE 唯一来源」。

## 范围

- `src/utils/entryCounts.ts`
- `tests/utils/entryCounts.test.ts`
- 写入 `brooks-shared.md` Pure helpers

## 不做

- 不返回 `AnalysisResult`
- 不算 Entry / Stop / Target（仍由 `classifySecondEntry` + `setupPrices`）
- 不调用 `classifySwingTrend` / `findSwingLegs`
- 不接入 SE 发单路径（见上）

## 完成

- 相邻 K 高低突破、同棒双标、tick、每侧封顶 3、无趋势窗也可出点
- 文档已区分：全局相邻计数 vs SE 回调窗 hinge