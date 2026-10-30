# neckline-on-double

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [classify-double-top-bottom.md](../spec/classify-double-top-bottom.md) |
| 依赖 | [impl-classify-double-top-bottom](impl-classify-double-top-bottom.md) |

## 目标

双顶双底把已经算出的颈线写成 `Neckline`。测量目标仍不由原子函数给出。

## 范围

- `src/analyze/classifyDoubleTopBottom.ts` 与现有测试
- 每一对结果都写 `Neckline`，突破前后都写。价格是两个同侧摆动之间的反向摆动极值（现有 `pair.neck`）。时间是该摆动 K 的开盘时间
- `LevelName` 增加 `Neckline`：`src/types/analysis.ts`、[types-contract.md](../../.cursor/skills/kline-analyze-fn/references/types-contract.md)、[brooks-shared.md](../spec/brooks-shared.md)
- 规格的点位表补上 `Neckline`，并保持「没有 `Target`」

## 不做

- 不写 `Target`，不计算颈线外翻
- 不改配对、容差、`Entry` / `Stop` 的规则
- 图表侧边栏

## 完成

- 有突破和无突破的双顶、双底都断言 `Neckline` 价与时间
- 仍然没有 `Target`
