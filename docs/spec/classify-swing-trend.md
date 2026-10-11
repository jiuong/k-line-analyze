# classifySwingTrend

Authoritative function spec. Skill mirror: `.cursor/skills/kline-analyze-fn/examples/classify-swing-trend.md`.

## Intent

Identify whether a price segment is an **uptrend** (Higher High + Higher Low) or a **downtrend** (Lower High + Lower Low). If neither structure is clear, report a trading range or unclear state.

## Identity

| Field | Value |
|-------|-------|
| `functionId` | `classifySwingTrend` |
| Export | `classifySwingTrend` |
| Impl path (planned) | `src/analyze/classifySwingTrend.ts` |
| Tests (planned) | `tests/analyze/classifySwingTrend.test.ts` |
| Status | **spec only** — not implemented yet |

## Parameters

```ts
function classifySwingTrend(
  bars: Bar[],
  options?: {
    /** Half-window for pivot detection; default TBD at implementation (e.g. 2 or 3) */
    swingStrength?: number;
  }
): AnalysisResult<SwingTrendEvidence>;
```

`Bar` matches MT5 `/bars` `data[]` ([`src/types/bars.ts`](../../src/types/bars.ts)).

| Param | Required | Notes |
|-------|----------|-------|
| `bars` | yes | Caller-supplied OHLC array |
| `options.swingStrength` | no | Pivot sensitivity |

## Dependencies

| Dep | Status | Notes |
|-----|--------|-------|
| Caller-supplied `Bar[]` | **exists** | Via `fetchBars` / fixtures outside this function |
| time utils | **partial** | Unix ↔ `TimeString` for `results[].levels` / `results[].range` |
| swing / pivot helper | **must create** | Shared `src/utils/swings.ts` |
| `AnalysisResult` types | **must create** | See skill `references/types-contract.md` |

## Algorithm (implementation guide)

1. Validate `bars`; resolve `swingStrength` (default TBD at implementation).
2. Detect swing highs and swing lows using `swingStrength` (local extrema).
3. Take the last two swing highs (`H1` older, `H2` newer) and last two swing lows (`L1` older, `L2` newer) — **confirm ordering in code comments to match this spec**.
4. Classify:
   - `bull_trend` if `H2.price > H1.price` **and** `L2.price > L1.price`
   - `bear_trend` if `H2.price < H1.price` **and** `L2.price < L1.price`
   - `trading_range` if both pairs exist but neither HH+HL nor LH+LL
   - `unclear` if fewer than two swing highs or two swing lows
5. Emit one `AnalyzeResult`. Fill its `levels` with `{ name, price, time }` for those four swings when present (`H*` → swing high, `L*` → swing low). Omit missing levels when `unclear`.
6. Set that item’s `range.start` / `range.end` to the earliest and latest of the used swing bar times (or full input window if `unclear` — prefer documenting chosen rule in the PR; default: used swings only when classified, else first/last bar times).
7. Set `evidence.swingStrength` to the resolved pivot half-window actually used; build `summary` from the template below; `confidence = 1`.

## Labels

| `results[].name` | Condition |
|---------|-----------|
| `bull_trend` | HH + HL |
| `bear_trend` | LH + LL |
| `trading_range` | Two highs + two lows, mixed structure |
| `unclear` | Insufficient swings |

## Levels

Shape: `Level[]` (`{ name: LevelName; price: number; time: TimeString }`).

| LevelName | Meaning | `price` |
|-----------|---------|---------|
| `H1` | Earlier swing high | bar high |
| `H2` | Later swing high | bar high |
| `L1` | Earlier swing low | bar low |
| `L2` | Later swing low | bar low |

## Summary template

```text
structure={label}; H1@{H1} H2@{H2} L1@{L1} L2@{L2}
```

Placeholders: `{H1}`…`{L2}` use each level’s `time`; missing levels render as `-`.

Example:

```text
structure=bull_trend; H1@2024-01-02T10:00:00Z H2@2024-01-03T14:00:00Z L1@2024-01-02T06:00:00Z L2@2024-01-03T08:00:00Z
```

## Evidence

Geometry lives in `results[].levels` / `results[].name`. `evidence` only carries the resolved param that cannot be derived from them:

```ts
type SwingTrendEvidence = {
  /** Resolved pivot half-window actually used (after defaulting) */
  swingStrength: number;
};
```

Always set `evidence.swingStrength`, including when `results[].name` is `unclear`.

## Test outline

| Case | Fixture idea | Expect |
|------|--------------|--------|
| Bull | Rising highs and lows | `bull_trend`, four levels with prices, `evidence.swingStrength` |
| Bear | Falling highs and lows | `bear_trend` |
| Range | HH but lower low (or LH + HL) | `trading_range` |
| Unclear | Flat / too few pivots | `unclear`, sparse levels, `evidence.swingStrength` still set |

Inject synthetic `Bar[]` directly; do not hit live MT5 in unit tests.
