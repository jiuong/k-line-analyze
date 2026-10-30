# util-setup-measure

| 项 | 值 |
|----|----|
| 优先级 | P7 |
| 状态 | done |
| 规格 | [setup-measure.md](../spec/setup-measure.md)（本任务先写） |
| 依赖 | 无。不改任何 `classify*` |

## 目标

提供入场测量的共享类型和三个纯函数：计划盈亏比、成交后先碰到目标还是止损、按形态标签汇总胜率。

## 范围

- 先写 [docs/spec/setup-measure.md](../spec/setup-measure.md)，再写 `src/utils/setupMeasure.ts` 与 `tests/utils/setupMeasure.test.ts`
- 在 [docs/specification/analyze.md](../specification/analyze.md) 加一节指针，链到该规格。不在此列出六个 `measure*`
- 方向沿用 `SetupDirection` 的 `up` / `down`。止损在入场之下为 `up`，在入场之上为 `down`

`SetupTrade` 字段：`basis`、`direction`、`signalTime`、`signalPrice`、`entry`、`stop`、`target`、`risk`、`reward`、`rewardRisk`、`maxRewardRisk`、`outcome`，以及可选 `context`。`outcome` 为 `win` | `loss` | `open` | `unfilled`。`maxRewardRisk` 为成交后到结案（或数据结束）的最大有利位移 / risk；未成交或 risk≤0 时为 `null`。

`SetupReport` 含 `functionId`、`trades`、`invalid`、整体 `stats`、按 `basis` 分组的 `byBasis`。`invalid` 不进胜率。`stats` 含笔数、成交、赢、亏、未平、未成交、`winRate`、`avgRewardRisk`。`winRate = wins / (wins + losses)`，分母为 0 时为 `null`。`avgRewardRisk` 只平均已分出胜负且盈亏比为有限数的计划值。

导出：

- `rewardRisk(entry, stop, target)`：`risk = abs(entry - stop)`，`reward = abs(target - entry)`。`risk <= 0` 时 `rewardRisk` 为 `null`
- `resolveOutcome(bars, prices)`：`prices` 含 `direction`、`entry`、`stop`、`target`、`entryTime`
- `summarizeTrades(trades)`：得到 `stats` 与 `byBasis`

成交从 `entryTime` 那根的下一根开始：

- `up` 用 `high >= entry` 成交，`down` 用 `low <= entry`
- 尚未成交时只碰到止损，或数据结束仍未碰到入场：`unfilled`
- 首次碰到入场的那根算成交。该根或之后先碰到目标为 `win`，先碰到止损为 `loss`
- 同一根同时覆盖止损和目标，记 `loss`。成交当根同时覆盖入场和止损，也记 `loss`
- 成交后到数据结束都没碰到：`open`
- `entryTime` 对不上任何 K 线开盘时间：调用方跳过该笔，本函数不猜测

`unfilled` 与 `open` 不进入胜率分母。

## 不做

- 不返回 `AnalysisResult`
- 不调用 `classify*`，不计算测量目标
- 不统计信号 K、微型双顶双底
- 图表侧边栏

## 完成

- 合成 `Bar[]` 覆盖：先到目标、先到止损、同根双触、成交前先到止损、未成交、成交后未平、`risk <= 0`
- 两组不同 `basis` 的 `byBasis` 胜率互不影响
