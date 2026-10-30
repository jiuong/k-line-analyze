import type { Bar } from "../types/bars.js";
import type { AnalysisResult, AnalyzeResult, LevelName } from "../types/analysis.js";
import { consecutiveTrendBars, type TrendBarDirection } from "../utils/barPredicates.js";
import { fillSummary } from "../utils/summary.js";
import type { SwingLeg } from "../utils/swingLegs.js";
import { toTimeString } from "../utils/time.js";
import { readSwingLegs } from "./classifySwingLeg.js";

const FUNCTION_ID = "classifyClimax";

const SUMMARY = "climaxes={count}; last={lastName}";

const CLIMAX_TREND_BARS = 3;

const LEG_EXPANSION = 2;

export type ClimaxSource = "bars" | "legs";

export type ClimaxEvidence = {
  items: { source: ClimaxSource }[];
};

export type ClassifyClimaxOptions = {
  swingSpan?: number;
};

type Piece = {
  start: number;
  end: number;
  direction: TrendBarDirection;
  source: ClimaxSource;
};

/** A late push: a run of trend bars, or a leg that doubles the previous one. A miss is `unclear`. */
export function classifyClimax(
  bars: Bar[],
  options?: ClassifyClimaxOptions,
): AnalysisResult<ClimaxEvidence> {
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new TypeError("classifyClimax: bars must be a non-empty array");
  }
  const swingSpan = resolveSwingSpan(options);
  const kept = select([
    ...barPieces(bars),
    ...legPieces(readSwingLegs(bars, swingSpan)),
  ]);
  if (kept.length === 0) return assemble([unclearResult(bars)], []);
  return assemble(
    kept.map((piece) => toResult(bars, piece)),
    kept.map((piece) => ({ source: piece.source })),
  );
}

function barPieces(bars: readonly Bar[]): Piece[] {
  return consecutiveTrendBars(bars, CLIMAX_TREND_BARS).map((run) => ({
    start: run.start,
    end: run.end,
    direction: run.direction,
    source: "bars",
  }));
}

function legPieces(legs: readonly SwingLeg[]): Piece[] {
  const previous = new Map<SwingLeg["direction"], SwingLeg>();
  const pieces: Piece[] = [];
  for (const leg of legs) {
    const prior = previous.get(leg.direction);
    previous.set(leg.direction, leg);
    if (prior === undefined) continue;
    const base = Math.abs(prior.endPrice - prior.startPrice);
    const next = Math.abs(leg.endPrice - leg.startPrice);
    if (base <= 0 || next < base * LEG_EXPANSION) continue;
    pieces.push({
      start: leg.startIndex,
      end: leg.endIndex,
      direction: leg.direction,
      source: "legs",
    });
  }
  return pieces;
}

function select(pieces: readonly Piece[]): Piece[] {
  const ranked = [...pieces].sort((left, right) => {
    const length = right.end - right.start - (left.end - left.start);
    if (length !== 0) return length;
    if (left.start !== right.start) return left.start - right.start;
    if (left.source !== right.source) return left.source === "bars" ? -1 : 1;
    return left.end - right.end;
  });
  const kept: Piece[] = [];
  for (const piece of ranked) {
    const overlaps = kept.some(
      (other) => piece.start <= other.end && other.start <= piece.end,
    );
    if (!overlaps) kept.push(piece);
  }
  kept.sort((left, right) => left.start - right.start || left.end - right.end);
  return kept;
}

function toResult(bars: readonly Bar[], piece: Piece): AnalyzeResult {
  const bull = piece.direction === "bull";
  const index = extremeIndex(bars, piece.start, piece.end, bull);
  const bar = bars[index]!;
  const time = toTimeString(bar.time);
  const name: LevelName = bull ? "BarHigh" : "BarLow";
  return {
    name: bull ? "buy_climax" : "sell_climax",
    range: { start: toTimeString(bars[piece.start]!.time), end: timeOf(bars, piece.end) },
    levels: [{ name, price: bull ? bar.high : bar.low, time }],
  };
}

function extremeIndex(
  bars: readonly Bar[],
  start: number,
  end: number,
  bull: boolean,
): number {
  let chosen = start;
  for (let index = start + 1; index <= end; index += 1) {
    const better = bull
      ? bars[index]!.high > bars[chosen]!.high
      : bars[index]!.low < bars[chosen]!.low;
    if (better) chosen = index;
  }
  return chosen;
}

function timeOf(bars: readonly Bar[], index: number): string {
  return toTimeString(bars[index]!.time);
}

function resolveSwingSpan(options?: ClassifyClimaxOptions): number {
  if (options === undefined) return 2;
  assertOptions(options);
  if (options.swingSpan === undefined) return 2;
  if (!Number.isInteger(options.swingSpan) || options.swingSpan < 1) {
    throw new TypeError("classifyClimax: swingSpan must be an integer >= 1");
  }
  return options.swingSpan;
}

function assertOptions(options: ClassifyClimaxOptions): void {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("classifyClimax: options must be an object");
  }
}

function unclearResult(bars: readonly Bar[]): AnalyzeResult {
  return {
    name: "unclear",
    range: {
      start: toTimeString(bars[0]!.time),
      end: toTimeString(bars[bars.length - 1]!.time),
    },
    levels: [],
  };
}

function assemble(
  results: AnalyzeResult[],
  items: ClimaxEvidence["items"],
): AnalysisResult<ClimaxEvidence> {
  const last = results[results.length - 1]!;
  const count = results.filter((item) => item.name !== "unclear").length;
  return {
    functionId: FUNCTION_ID,
    results,
    summary: fillSummary(SUMMARY, { count, lastName: last.name }),
    confidence: 1,
    evidence: { items },
  };
}
