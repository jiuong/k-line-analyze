# Example: classifySwingTrend (skill template)

**Authoritative spec:** [`docs/spec/classify-swing-trend.md`](../../../../docs/spec/classify-swing-trend.md)

Use this as the pattern when the user says:

> Split the window into trend segments by merging `findSwingLegs`. Same-direction legs chain when a pullback holds the prior extreme and the next impulse makes a new extreme. A covering opposite leg ends the prior trend and opens the reverse.

## Minimal capture

| Field | Value |
|-------|-------|
| `functionId` | `classifySwingTrend` |
| Spec path | `docs/spec/classify-swing-trend.md` |
| Input | `Bar[]` |
| Labels | `bull_trend` \| `bear_trend` \| `minor_bull_trend` \| `minor_bear_trend` \| `trading_range` \| `unclear` |
| Levels | Endpoints `BullTrendStart`/`BullTrendEnd` / `BearTrendStart`/`BearTrendEnd`; entry marks `H1`–`H3` / `L1`–`L3`; range uses `RangeHigh`/`RangeLow` |
| Deps | `findSwingLegs`, `entryCounts`, time utils, `fillSummary` (caller supplies bars) |

## Agent reminder

- Do not open segments on `classifyReversalSignal` K2 nodes.
- Pullback may be one bar, one opposite leg, or a recursive opposite swing trend.
- Opposite touch/cross of the guarded extreme → prior trend ends; that opposite leg opens the new trend.
