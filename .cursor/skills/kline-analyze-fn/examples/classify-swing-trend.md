# Example: classifySwingTrend (skill template)

**Authoritative spec:** [`docs/spec/classify-swing-trend.md`](../../../../docs/spec/classify-swing-trend.md)

Use this as the pattern when the user says:

> Split the window into trend segments using reversal K2 nodes. A bull reversal opens a bull trend; a bear reversal opens a bear trend. The last segment ends on the last bar.

## Minimal capture

| Field | Value |
|-------|-------|
| `functionId` | `classifySwingTrend` |
| Spec path | `docs/spec/classify-swing-trend.md` |
| Input | `Bar[]` |
| Labels | `bull_trend` \| `bear_trend` \| `unclear` |
| Levels | `H1` `L1` (segment endpoints) |
| Deps | `classifyReversalSignal`, time utils, `fillSummary` (caller supplies bars) |

## Agent reminder

1. Write/update `docs/spec/classify-swing-trend.md` first if intent changes.
2. Do not reimplement the reversal scan; call `classifyReversalSignal`.
3. Follow [generation-checklist.md](../references/generation-checklist.md).
