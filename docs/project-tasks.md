# Project tasks

Local tracker when Linear is unavailable. Status: `todo` | `doing` | `done` | `blocked`.

## Parent: K-line analyze foundation

| ID | Task | Status | Notes |
|----|------|--------|-------|
| skill-kline-analyze-fn | Project Cursor skill for generating analyzers | done | `.cursor/skills/kline-analyze-fn/` |
| spec-classify-swing-trend | Spec for swing trend classifier | done | `docs/spec/classify-swing-trend.md` |
| scaffold-types | Shared `AnalysisResult` / enums in `src/types` | todo | Mirror skill types-contract |
| scaffold-fetchBars | MT5 bars HTTP client | todo | Align with `D:\code\services\mt5\docs\API.md` |
| util-time-summary | TimeString ↔ Unix + summary fill helper | todo | |
| util-swings | Shared swing high/low helper | todo | Needed by classifySwingTrend |
| impl-classify-swing-trend | Implement + unit tests | todo | After scaffolding |

## How to add tasks

One goal per row; keep scope reviewable and independently testable.
