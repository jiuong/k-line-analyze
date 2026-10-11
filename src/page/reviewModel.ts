import { classifyReversalSignal } from "../analyze/classifyReversalSignal.js";
import { classifySwingTrend } from "../analyze/classifySwingTrend.js";
import type { AnalysisResult } from "../types/analysis.js";
import type { Bar } from "../types/bars.js";

export const REVIEW_ANALYZERS = [
  { id: "classifySwingTrend", label: "Swing trend", run: classifySwingTrend },
  {
    id: "classifyReversalSignal",
    label: "Reversal signal",
    run: classifyReversalSignal,
  },
] as const;

/** Run only the analyzers whose ids are enabled. */
export function runReview(
  bars: readonly Bar[],
  enabledIds: readonly string[] = [],
): AnalysisResult[] {
  const enabled = new Set(enabledIds);
  const windowBars = [...bars];
  return REVIEW_ANALYZERS.filter((item) => enabled.has(item.id)).map((item) =>
    item.run(windowBars),
  );
}
