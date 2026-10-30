# setup-measure

Status: **implemented**. Task: [util-setup-measure](../tasks/util-setup-measure.md). Shared contract for entry measurement. Measure functions return `SetupReport`, not `AnalysisResult`.

## 职能

入场测量的共享类型与三个纯函数：计划盈亏比、成交后先碰到目标还是止损、按形态标签汇总胜率。不调用 `classify*`，不计算测量目标。

## 方向

复用 `SetupDirection`：`up` / `down`。止损在入场之下为 `up`，在入场之上为 `down`。

## 类型

```ts
type SetupOutcome = "win" | "loss" | "open" | "unfilled";

type SetupTrade = {
  basis: string;
  direction: SetupDirection;
  signalTime: TimeString;
  signalPrice: number;
  entry: number;
  stop: number;
  target: number;
  risk: number;
  reward: number;
  rewardRisk: number | null;
  /** Max favorable / risk from fill until stop or target (or end of bars). Null if unfilled or risk <= 0. */
  maxRewardRisk: number | null;
  outcome: SetupOutcome;
  /** Owning pattern span; chart draws Entry/Stop/Target only over this range. */
  range: { start: TimeString; end?: TimeString };
  context?: Record<string, unknown>;
};

type SetupStats = {
  count: number;
  filled: number;
  wins: number;
  losses: number;
  open: number;
  unfilled: number;
  winRate: number | null;
  avgRewardRisk: number | null;
};

type InvalidSignal = {
  basis: string;
  direction: SetupDirection;
  signalTime: TimeString;
  signalPrice: number;
  entry: number;
  stop: number;
  target: number;
  range: { start: TimeString; end?: TimeString };
};

type SetupReport = {
  functionId: string;
  trades: SetupTrade[];
  invalid: InvalidSignal[];
  stats: SetupStats;
  byBasis: Record<string, SetupStats>;
};
```

`count = trades.length`。`filled = wins + losses + open`。四类结果互斥。`winRate = wins / (wins + losses)`，分母为 0 时为 `null`。`avgRewardRisk` 只平均已分出胜负且 `rewardRisk` 为有限数的计划值。`unfilled` 与 `open` 不进入胜率分母。

看多要求 `stop < entry < target`，看空要求 `stop > entry > target`（`setupInOrder`）。不成立的候选只进入 `invalid`，不调用 `resolveOutcome`，不进入 `stats` / `byBasis`。`measureReport` 做这次分流。

## 导出

```ts
function rewardRisk(
  entry: number,
  stop: number,
  target: number,
): { risk: number; reward: number; rewardRisk: number | null };

function resolveOutcome(
  bars: Bar[],
  prices: {
    direction: SetupDirection;
    entry: number;
    stop: number;
    target: number;
    entryTime: TimeString;
  },
): SetupOutcome;

function resolveTradeResult(
  bars: Bar[],
  prices: {
    direction: SetupDirection;
    entry: number;
    stop: number;
    target: number;
    entryTime: TimeString;
  },
): { outcome: SetupOutcome; maxFavorable: number };

function summarizeTrades(trades: SetupTrade[]): {
  stats: SetupStats;
  byBasis: Record<string, SetupStats>;
};

function tradeRangeFrom(range: {
  start: TimeString;
  end?: TimeString;
}): { start: TimeString; end?: TimeString };
```

| 函数 | 规则 |
|------|------|
| `rewardRisk` | `risk = abs(entry - stop)`，`reward = abs(target - entry)`。`risk <= 0` 时 `rewardRisk` 为 `null`，否则为 `reward / risk`。价格非有限抛 `TypeError` |
| `resolveOutcome` | 见下。`entryTime` 必须等于某根 K 的开盘 `TimeString`，对不上抛错，不猜测索引。止损相对入场与方向不符（`up` 止损应在入场之下，`down` 在之上）抛 `TypeError`。非有限价格或非法方向抛 `TypeError`。非数组 `bars` 抛 `TypeError` |
| `resolveTradeResult` | 与 `resolveOutcome` 同一扫描；额外返回成交后到结案（或数据结束）的最大有利位移 `maxFavorable`。`unfilled` 时为 `0`。`settleSetup` 用 `maxFavorable / risk` 写入 `maxRewardRisk` |
| `summarizeTrades` | 整体 `stats` 与按 `basis` 分组的 `byBasis`。各组胜率互不影响 |
| `tradeRangeFrom` | 把形态 `range` 拷到 `SetupTrade.range`；无 `end` 时只带 `start` |

## 成交与结果

扫描从 `entryTime` 那根的**下一根**开始。

- `up`：`high >= entry` 成交；`low <= stop` 碰到止损；`high >= target` 碰到目标
- `down`：`low <= entry` 成交；`high >= stop` 碰到止损；`low <= target` 碰到目标
- 尚未成交时只碰到止损，或数据结束仍未碰到入场：`unfilled`
- 首次碰到入场的那根算成交。该根或之后先碰到目标为 `win`，先碰到止损为 `loss`
- 同一根同时覆盖止损和目标，记 `loss`。成交当根同时覆盖入场和止损，也记 `loss`
- 成交后到数据结束都没碰到：`open`
- 成交后在同一窗口内：`up` 取 `max(high) - entry`，`down` 取 `entry - min(low)`，再除以 `risk` 得 `maxRewardRisk`（止损前最大盈亏比）

## 不做

- 不返回 `AnalysisResult`
- 不调用 `classify*`，不投影测量目标
- 不统计信号 K、微型双顶双底

Review 页的 measure 树根勾选与 Entry/Stop/Target 叠加由 chart 层负责，不在本工具模块内。
