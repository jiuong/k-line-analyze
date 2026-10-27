# Brooks 入场形态：理论基础

说明本仓库六个入场形态的**入场 / 止损 / 止盈**依据。算法以 [`docs/spec/`](../spec/) 为准；本文只解释「为什么」。

共享契约：[brooks-shared.md](../spec/brooks-shared.md)。测量层：[setup-measure.md](../spec/setup-measure.md)。

## 原文与口径

引用 Al Brooks 英文 Wiley 三部曲（2012）的**章名**（页码取自该书目录，不同印次可能略有出入）：

| 简称 | 书名 |
|------|------|
| *Trends* | *Trading Price Action Trends* |
| *Ranges* | *Trading Price Action Trading Ranges* |
| *Reversals* | *Trading Price Action Reversals* |

本仓库是可计算简化：能对齐的写清出处；刻意省略的（always-in、信号棒质量、高周期等）不展开。

## 本仓库怎么用这些形态

| 层 | 做什么 |
|----|--------|
| `classify*` | 识别形态，写出 `Entry` / `Stop` / `Target`（双顶双底的 `Target` 在 measure 补） |
| `measure*` | 复制点位，算盈亏比与胜负，按 `basis` 汇总 |
| Review 侧栏 | 勾选 measure 时，在该笔形态 `range` 上画 Entry/Stop/Target 线段 |

## 共享几何

| 做法 | 含义 | 本仓库 | 原文 |
|------|------|--------|------|
| 入场略超极值 | 跟突破确认，不挂在假突破价上 | `entryBeyond` | *Ranges* 术语表 breakout / breakout bar；止损入场习惯见 *Ranges* Ch.27 *Entering on Stops* |
| 止损略超保护位 | 保护位被穿则形态失效 | `stopBeyond` | *Ranges* Ch.29 *Protective and Trailing Stops*（约 p.517） |
| 测量移动 | 用已走完的一段幅度投影目标 | `projectMeasuredMove` | *Ranges* Ch.7（约 p.153）、Ch.8（约 p.165） |
| 区间对侧 | 失败突破后常试探另一边 | `targetFrom(对侧)` | *Ranges* Ch.5 失败突破与磁区讨论；Ch.8 区间相关测量 |

止盈管理总述：*Ranges* Ch.30 *Profit Taking and Profit Targets*（约 p.535）。

入场确定后，看多必须 `stop < entry < target`，看空必须 `stop > entry > target`。相等或反了不是有效交易，不进胜率。勾选对应 measure 时，图上仍画 Entry / Stop / Target，并在信号价标 `Fail`。测量锚点不因此改到入场外侧。

---

## Second entry

**原文：** *Trends* Ch.10 *Second Entries*；计数基础见 *Ranges* 前言 *Bar Counting Basics: High 1, High 2, Low 1, Low 2*，以及 *Ranges* Ch.17 *Bar Counting: High and Low 1, 2, 3, and 4 Patterns and ABC Corrections*（约 p.259）。

**语境：** 主趋势回调内，逆势腿→顺势腿（或趋势恢复）转折处的顺势相邻突破。同一回调内第 1、2 次为 H1/H2（空头 L1/L2）。例：多头 PB 中 W1/W3 空腿、W2 多腿 → W1→W2 为 H1，W3→新多头为 H2。原子函数**只输出** `high2` / `low2`。

**入场：** 转折邻域内 `K2` 突破 `K1` 同向极值（± tick）。触发价标在 K2；K2 极值作 `SignalBar`。

**止损：** Fib 扩展锚点 P1 之外（`stopBeyond(P1)`）。`measureSecondEntry` 直接采用原子 `Stop`。突破 K 须仍在冲刺所属同向 major 内；Stop 不在 Entry 反侧则不发单。

**止盈：** 回调前顺势腿 P1→P2，P3=K1 回调侧极值；`projectFibExtension` 得 TP1@1、TP2@1.272、TP3@1.414、TP4@1.618。测量胜率只用 TP1；图上标注 TP1–TP4，线段覆盖入场 K→离场 K。

**实现：** [classify-second-entry.md](../spec/classify-second-entry.md)；[classify-swing-trend.md](../spec/classify-swing-trend.md) 挂 `H2`/`L2`；测量见 [measure-second-entry.md](../spec/measure-second-entry.md)。

---

## Failed breakout

**原文：** *Ranges* Ch.5 *Failed Breakouts, Breakout Pullbacks, and Breakout Tests*（约 p.99）；失败通论 *Reversals* Ch.9 *Failures*。术语表 *failed breakout* / *breakout pullback* 见三部曲 List of Terms。

**语境：** 区间突破后**无跟随**，收盘回到区间内 → 假突破。方向与原突破相反。

**入场：** 「破了又收回」→ 突破方留不住价格。挂在被破边界（`BrokenEdge`）之外（反向）；收回棒极值只作 `SignalBar`。入场价确定后再写止损与止盈。

**止损：** 原突破棒外侧。再创该极值 → 失败叙事被否，可能转为真突破。

**止盈：** 同一区间对侧边界（区间另一边的常见目标）。

**实现：** [classify-failed-breakout.md](../spec/classify-failed-breakout.md)、[measure-failed-breakout.md](../spec/measure-failed-breakout.md)。前提：`range_break` 且无匹配 `follow_through`。

**简化：** 有跟随则归 BO-PB，不算失败突破。

---

## Breakout pullback

**原文：** *Ranges* Ch.5（同上，约 p.99）；术语表 *breakout pullback*（突破后 1–约 5 根内的回测，预期突破续行）。

**语境：** 突破**已有跟随**后，反向腿回到破位附近再出发 → 真突破的回测入场。

**入场：** 跟随证明破位有效；回测到 `BrokenEdge` 附近后，收盘再破回调腿起点 → 回测结束。挂在该回调腿起点之外；再出发棒极值只作 `SignalBar`。入场价确定后再写止损与止盈。

**止损：** 回测腿极值（`LegEnd`）之外。打穿则回测变成反向或更深回调。

**止盈：** 原区间高度（对侧 − `BrokenEdge`），自**已成立的入场价**向突破方向测量移动（*Ranges* Ch.7 / Ch.8）。

**实现：** [classify-breakout-pullback.md](../spec/classify-breakout-pullback.md)、[measure-breakout-pullback.md](../spec/measure-breakout-pullback.md)。

**简化：** 无跟随的收回不算本形态（见 Failed breakout）。

---

## Wedge

**原文：** *Reversals* Ch.5 *Wedges and Other Three-Push Reversal Patterns*；趋势内三推回调另见 *Ranges* Ch.18 *Wedge and Other Three-Push Pullbacks*（约 p.301）。

**语境：** 三次同向推进，动能减弱。反向收盘穿过第三推起点后交易反转（或旗形内反向）。本仓库用 `role` 标 `flag` / `reversal`，胜率不拆分。

Brooks 原文要点：触发后第一目标常测楔形起点一侧，再取形态高度的测量移动。本仓库目标取 `abs(Push3 − Push1)` 自入场投影，是可计算近似。

**入场：** 第三推后反向突破 → 三推被否。等突破确认，不猜第三推终点。

**止损：** Push3 之外。再创第三推极值 → 楔形失效。

**止盈：** `abs(Push3 − Push1)`，自 Entry 向反推方向投影。

**实现：** [classify-wedge.md](../spec/classify-wedge.md)、[measure-wedge.md](../spec/measure-wedge.md)。无反向突破则不写 Entry/Stop/Target。

**简化：** 不强制通道收口；不按 flag/reversal 分胜率；不自动升成 MTR。

---

## Major trend reversal

**原文：** *Reversals* Ch.3 *Major Trend Reversal*。书中常见要件：破主趋势线；多数情况下再测旧趋势极值（非绝对必须）。

**语境：** 本仓库口径：**收盘破通道逆势轨 → 内侧再测（更高低 / 更低高）→ 收盘破再测棒顺向极值** 才入场。是「破线 → 再测 → 出发」，不是单根反转信号。

**入场：** 破线＝原通道失效；内侧再测＝反向方在前极值附近站住；再突破再测棒＝新方向启动。

**止损：** 再测价（`Retest`）之外。再测被穿 → 内侧再测不成立。

**止盈：** 匹配通道触点跨度，自 Entry 向新方向测量移动（通道高度作尺子，呼应 *Ranges* Ch.7）。

**实现：** [classify-major-trend-reversal.md](../spec/classify-major-trend-reversal.md)、[measure-major-trend-reversal.md](../spec/measure-major-trend-reversal.md)。仅破线或仅再测不出本结果。

**简化：** 不替代三根 K 的 `classifyReversalSignal`；不做书中完整的「强突破 + 强跟随 + 强反转」过滤。

---

## Double top / bottom

**原文：** *Reversals* Ch.8 *Double Top and Bottom Pullbacks*；区间/旗形语境另见 *Ranges* Ch.12 *Double Top Bear Flags and Double Bottom Bull Flags*（约 p.213）、Ch.20 *“Reversal” Patterns: Double Tops and Bottoms…*（约 p.319）。

**语境：** 两同侧极值同带，中间反向摆动成颈线。常见做法：颈线收盘突破后入场，目标约一倍形态高度。

**入场：** 第二极值后收盘穿颈线 → 形态完成。

**止损：** 第二极值之外。再创第二顶/底 → 形态失效。

**止盈：** 高度 = 顶侧 `max(Top1,Top2)−Neckline` 或底侧 `Neckline−min(Bottom1,Bottom2)`；自颈线 1× 测量移动（**measure** 层投影；classify 不写 `Target`）。

**实现：** [classify-double-top-bottom.md](../spec/classify-double-top-bottom.md)、[measure-double-top-bottom.md](../spec/measure-double-top-bottom.md)。

**简化：** 不含微型双顶双底；不把更高低再测标成双底。

---

## 对照

| 形态 | 入场（一句话） | 止损 | 止盈 | 主出处 |
|------|----------------|------|------|--------|
| Second entry | 主趋势内回调后再突破 | 回调腿极值 | 前顺势腿测量 | *Trends* Ch.10；*Ranges* Ch.17 |
| Failed breakout | 无跟随且收回区间 | 突破棒外 | 区间对侧 | *Ranges* Ch.5；*Reversals* Ch.9 |
| Breakout pullback | 有跟随后回测再出发 | 回测腿极值 | 区间高度测量 | *Ranges* Ch.5 |
| Wedge | 反向破第三腿起点 | Push3 外 | Push1→Push3 幅度 | *Reversals* Ch.5；*Ranges* Ch.18 |
| Major trend reversal | 破线 + 再测后再突破 | 再测价外 | 通道高度测量 | *Reversals* Ch.3 |
| Double top/bottom | 收盘破颈线 | 第二极值外 | 颈线 1× 高度 | *Reversals* Ch.8；*Ranges* Ch.12 / Ch.20 |

**易混：** 有无 `follow_through` 区分 Failed breakout 与 BO-PB。Second entry 数主趋势回调突破；BO-PB 锚定区间破位回测。Wedge 是三推；MTR 要破线 + 再测，不自动升级。

## 相关文档

| 文档 | 用途 |
|------|------|
| [brooks-shared.md](../spec/brooks-shared.md) | 原子共享契约 |
| [setup-measure.md](../spec/setup-measure.md) | 测量类型与胜负 |
| [specification/chart.md](../specification/chart.md) | Review 侧栏与线段叠加 |
| [tasks/README.md](../tasks/README.md) | 实现任务索引 |
