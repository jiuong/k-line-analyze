import type { Bar, TimeString } from "../types/bars.js";
import { setupInOrder, type SetupDirection } from "./setupPrices.js";
import { toTimeString } from "./time.js";

export type SetupOutcome = "win" | "loss" | "open" | "unfilled";

export type SetupTrade = {
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
  /**
   * Max favorable excursion / risk from fill through the same window as
   * `outcome` (until stop or target, or end of bars). Null when unfilled or risk <= 0.
   */
  maxRewardRisk: number | null;
  outcome: SetupOutcome;
  /** Span for overlay Entry/Stop/Target segments (pattern or entry→exit). */
  range: { start: TimeString; end?: TimeString };
  /** Optional extra target lines (name + price) for overlay labels. */
  targets?: SetupTargetLevel[];
  context?: Record<string, unknown>;
};

export type SetupStats = {
  count: number;
  filled: number;
  wins: number;
  losses: number;
  open: number;
  unfilled: number;
  winRate: number | null;
  avgRewardRisk: number | null;
};

/** A triggered setup whose stop / entry / target are not in trade order. */
export type InvalidSignal = {
  basis: string;
  direction: SetupDirection;
  signalTime: TimeString;
  signalPrice: number;
  entry: number;
  stop: number;
  target: number;
  range: { start: TimeString; end?: TimeString };
  targets?: SetupTargetLevel[];
};

export type SetupTargetLevel = {
  name: string;
  price: number;
};

export type SetupCandidate = {
  basis: string;
  direction: SetupDirection;
  signalTime: TimeString;
  signalPrice: number;
  entry: number;
  stop: number;
  target: number;
  entryTime: TimeString;
  range: { start: TimeString; end?: TimeString };
  /**
   * When true, overlay `range` is entry bar → exit bar (stop/target hit, or
   * last bar while open). Default keeps the classify pattern span.
   */
  tradeSpan?: boolean;
  /** Extra target lines for overlay (e.g. TP1–TP4). Win-rate still uses `target`. */
  targets?: readonly SetupTargetLevel[];
  context?: Record<string, unknown>;
};

export type SetupReport = {
  functionId: string;
  trades: SetupTrade[];
  /** Signals that cannot reach a target beyond entry. Not in `stats`. */
  invalid: InvalidSignal[];
  stats: SetupStats;
  byBasis: Record<string, SetupStats>;
};

export type ResolveOutcomePrices = {
  direction: SetupDirection;
  entry: number;
  stop: number;
  target: number;
  entryTime: TimeString;
};

function assertFinite(price: number, name: string): void {
  if (!Number.isFinite(price)) {
    throw new TypeError(`${name}: price must be finite`);
  }
}

function assertDirection(direction: SetupDirection): void {
  if (direction !== "up" && direction !== "down") {
    throw new TypeError("resolveOutcome: direction must be up or down");
  }
}

/**
 * Ordered triples become trades. Anything else is an invalid signal:
 * no outcome scan and no win-rate stats.
 */
export function settleSetup(
  bars: readonly Bar[],
  candidate: SetupCandidate,
): { trade: SetupTrade } | { invalid: InvalidSignal } {
  const range = tradeRangeFrom(candidate.range);
  if (
    !setupInOrder(
      candidate.direction,
      candidate.entry,
      candidate.stop,
      candidate.target,
    )
  ) {
    return {
      invalid: {
        basis: candidate.basis,
        direction: candidate.direction,
        signalTime: candidate.signalTime,
        signalPrice: candidate.signalPrice,
        entry: candidate.entry,
        stop: candidate.stop,
        target: candidate.target,
        range,
        ...(candidate.targets !== undefined ? { targets: [...candidate.targets] } : {}),
      },
    };
  }
  const planned = rewardRisk(candidate.entry, candidate.stop, candidate.target);
  const settled = resolveTradeResult(bars, {
    direction: candidate.direction,
    entry: candidate.entry,
    stop: candidate.stop,
    target: candidate.target,
    entryTime: candidate.entryTime,
  });
  const tradeRange = candidate.tradeSpan
    ? {
        start: candidate.entryTime,
        end: settled.exitTime ?? candidate.entryTime,
      }
    : range;
  const trade: SetupTrade = {
    basis: candidate.basis,
    direction: candidate.direction,
    signalTime: candidate.signalTime,
    signalPrice: candidate.signalPrice,
    entry: candidate.entry,
    stop: candidate.stop,
    target: candidate.target,
    risk: planned.risk,
    reward: planned.reward,
    rewardRisk: planned.rewardRisk,
    maxRewardRisk:
      settled.outcome === "unfilled" || planned.risk <= 0
        ? null
        : settled.maxFavorable / planned.risk,
    outcome: settled.outcome,
    range: tradeRange,
  };
  if (candidate.targets !== undefined) trade.targets = [...candidate.targets];
  if (candidate.context !== undefined) trade.context = candidate.context;
  return { trade };
}

export function measureReport(
  functionId: string,
  bars: readonly Bar[],
  candidates: readonly SetupCandidate[],
): SetupReport {
  const trades: SetupTrade[] = [];
  const invalid: InvalidSignal[] = [];
  for (const candidate of candidates) {
    const settled = settleSetup(bars, candidate);
    if ("trade" in settled) trades.push(settled.trade);
    else invalid.push(settled.invalid);
  }
  const { stats, byBasis } = summarizeTrades(trades);
  return { functionId, trades, invalid, stats, byBasis };
}

/** Copy a classify result's span onto a trade for overlay segments. */
export function tradeRangeFrom(
  range: { start: TimeString; end?: TimeString },
): { start: TimeString; end?: TimeString } {
  return range.end === undefined
    ? { start: range.start }
    : { start: range.start, end: range.end };
}

/** Planned risk, reward, and reward/risk. `risk <= 0` leaves `rewardRisk` null. */
export function rewardRisk(
  entry: number,
  stop: number,
  target: number,
): { risk: number; reward: number; rewardRisk: number | null } {
  assertFinite(entry, "rewardRisk");
  assertFinite(stop, "rewardRisk");
  assertFinite(target, "rewardRisk");
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return {
    risk,
    reward,
    rewardRisk: risk <= 0 ? null : reward / risk,
  };
}

function touchesEntry(bar: Bar, direction: SetupDirection, entry: number): boolean {
  return direction === "up" ? bar.high >= entry : bar.low <= entry;
}

function touchesStop(bar: Bar, direction: SetupDirection, stop: number): boolean {
  return direction === "up" ? bar.low <= stop : bar.high >= stop;
}

function touchesTarget(bar: Bar, direction: SetupDirection, target: number): boolean {
  return direction === "up" ? bar.high >= target : bar.low <= target;
}

export type TradeResult = {
  outcome: SetupOutcome;
  /** Favorable price travel from entry over the outcome window; 0 when unfilled. */
  maxFavorable: number;
  /** Exit bar time when filled (stop/target/open end). Omitted when unfilled. */
  exitTime?: TimeString;
};

/**
 * Outcome plus max favorable excursion after fill, in one scan.
 * Scans from the bar after `entryTime`. Missing `entryTime` throws.
 */
export function resolveTradeResult(
  bars: readonly Bar[],
  prices: ResolveOutcomePrices,
): TradeResult {
  if (!Array.isArray(bars)) {
    throw new TypeError("resolveOutcome: bars must be an array");
  }
  assertDirection(prices.direction);
  assertFinite(prices.entry, "resolveOutcome");
  assertFinite(prices.stop, "resolveOutcome");
  assertFinite(prices.target, "resolveOutcome");

  const { direction, entry, stop, target, entryTime } = prices;
  if (direction === "up" && !(stop < entry)) {
    throw new TypeError("resolveOutcome: up stop must be below entry");
  }
  if (direction === "down" && !(stop > entry)) {
    throw new TypeError("resolveOutcome: down stop must be above entry");
  }

  const entryIndex = bars.findIndex((bar) => toTimeString(bar.time) === entryTime);
  if (entryIndex < 0) {
    throw new Error("resolveOutcome: entryTime is not in bars");
  }

  let fillIndex: number | undefined;
  for (let index = entryIndex + 1; index < bars.length; index += 1) {
    const bar = bars[index]!;
    if (touchesEntry(bar, direction, entry)) {
      fillIndex = index;
      break;
    }
    if (touchesStop(bar, direction, stop)) {
      return { outcome: "unfilled", maxFavorable: 0 };
    }
  }
  if (fillIndex === undefined) {
    return { outcome: "unfilled", maxFavorable: 0 };
  }

  let maxFavorable = 0;
  for (let index = fillIndex; index < bars.length; index += 1) {
    const bar = bars[index]!;
    const favorable =
      direction === "up" ? bar.high - entry : entry - bar.low;
    if (favorable > maxFavorable) maxFavorable = favorable;
    const hitStop = touchesStop(bar, direction, stop);
    const hitTarget = touchesTarget(bar, direction, target);
    const exitTime = toTimeString(bar.time);
    if (hitStop) return { outcome: "loss", maxFavorable, exitTime };
    if (hitTarget) return { outcome: "win", maxFavorable, exitTime };
  }
  const last = bars[bars.length - 1]!;
  return {
    outcome: "open",
    maxFavorable,
    exitTime: toTimeString(last.time),
  };
}

/**
 * Whether the trade hits target or stop after `entryTime`.
 * Scans from the bar after `entryTime`. Missing `entryTime` throws.
 */
export function resolveOutcome(bars: readonly Bar[], prices: ResolveOutcomePrices): SetupOutcome {
  return resolveTradeResult(bars, prices).outcome;
}

function emptyStats(): SetupStats {
  return {
    count: 0,
    filled: 0,
    wins: 0,
    losses: 0,
    open: 0,
    unfilled: 0,
    winRate: null,
    avgRewardRisk: null,
  };
}

function finalizeStats(stats: SetupStats, rrSum: number, rrCount: number): SetupStats {
  const decided = stats.wins + stats.losses;
  return {
    ...stats,
    filled: stats.wins + stats.losses + stats.open,
    winRate: decided === 0 ? null : stats.wins / decided,
    avgRewardRisk: rrCount === 0 ? null : rrSum / rrCount,
  };
}

function accumulate(
  trades: readonly SetupTrade[],
): { stats: SetupStats; rrSum: number; rrCount: number } {
  const stats = emptyStats();
  let rrSum = 0;
  let rrCount = 0;
  for (const trade of trades) {
    stats.count += 1;
    if (trade.outcome === "win") stats.wins += 1;
    else if (trade.outcome === "loss") stats.losses += 1;
    else if (trade.outcome === "open") stats.open += 1;
    else stats.unfilled += 1;

    if (
      (trade.outcome === "win" || trade.outcome === "loss") &&
      trade.rewardRisk !== null &&
      Number.isFinite(trade.rewardRisk)
    ) {
      rrSum += trade.rewardRisk;
      rrCount += 1;
    }
  }
  return { stats: finalizeStats(stats, rrSum, rrCount), rrSum, rrCount };
}

/** Overall and per-`basis` win-rate stats. `unfilled` and `open` stay out of the win-rate denominator. */
export function summarizeTrades(trades: readonly SetupTrade[]): {
  stats: SetupStats;
  byBasis: Record<string, SetupStats>;
} {
  if (!Array.isArray(trades)) {
    throw new TypeError("summarizeTrades: trades must be an array");
  }

  const { stats } = accumulate(trades);
  const byBasis: Record<string, SetupStats> = {};
  const groups = new Map<string, SetupTrade[]>();
  for (const trade of trades) {
    const list = groups.get(trade.basis);
    if (list) list.push(trade);
    else groups.set(trade.basis, [trade]);
  }
  for (const [basis, group] of groups) {
    byBasis[basis] = accumulate(group).stats;
  }
  return { stats, byBasis };
}
