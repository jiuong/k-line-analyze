# Example: classifySwingTrend (skill template)

**Authoritative spec:** [`docs/spec/classify-swing-trend.md`](../../../../docs/spec/classify-swing-trend.md)

Use this as the pattern when the user says:

> Identify whether a segment is an uptrend (Higher High + Higher Low) or a downtrend (Lower High + Lower Low).

## Minimal capture

| Field | Value |
|-------|-------|
| `functionId` | `classifySwingTrend` |
| Spec path | `docs/spec/classify-swing-trend.md` |
| Labels | `bull_trend` \| `bear_trend` \| `trading_range` \| `unclear` |
| Levels | `H1` `H2` `L1` `L2` |
| Deps | `fetchBars`, swing helper, time utils |

## Agent reminder

1. Write/update `docs/spec/classify-swing-trend.md` first if intent changes.
2. Do not implement until scaffolding deps exist (or create them in the same task if the user asked for implementation).
3. Follow [generation-checklist.md](../references/generation-checklist.md).
