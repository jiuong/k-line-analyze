import type { SetupReport } from "../utils/setupMeasure.js";

export type SetupTradeRow = {
  measure: string;
  basis: string;
  range: string;
  entry: number;
  stop: number;
  target: number;
  status: string;
  planRr: number | null;
  maxRr: number | null;
};

/** Flatten checked measure reports into table rows (trades then invalid per report). */
export function setupTradeRows(reports: readonly SetupReport[]): SetupTradeRow[] {
  const rows: SetupTradeRow[] = [];
  for (const report of reports) {
    for (const trade of report.trades) {
      rows.push({
        measure: report.functionId,
        basis: trade.basis,
        range: formatRange(trade.range),
        entry: trade.entry,
        stop: trade.stop,
        target: trade.target,
        status: trade.outcome,
        planRr: trade.rewardRisk,
        maxRr: trade.maxRewardRisk,
      });
    }
    for (const signal of report.invalid) {
      rows.push({
        measure: report.functionId,
        basis: signal.basis,
        range: formatRange(signal.range),
        entry: signal.entry,
        stop: signal.stop,
        target: signal.target,
        status: "Fail",
        planRr: null,
        maxRr: null,
      });
    }
  }
  return rows;
}

function formatRange(range: { start: string; end?: string }): string {
  return range.end === undefined ? range.start : `${range.start} – ${range.end}`;
}
