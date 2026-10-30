# k-line-analyze

K-line (candlestick) analysis helpers driven by the local MT5 microservice bars API.

## Goal & requirements

- **Goal:** [`docs/goal.md`](docs/goal.md) — locate price-action structure on a symbol/timeframe window and mark it on a chart.
- **Requirements:** [`docs/requirements.md`](docs/requirements.md) — FR-1 data (fetch + local persist), FR-2 composable analyzers, FR-3 third-party chart overlays.
- **Module specs:** [`docs/specification/`](docs/specification/) — data / analyze / chart module design.
- **Architecture:** [`docs/architecture/`](docs/architecture/) — module architecture (data + analyze + chart).
- **Brooks entry theory:** [`docs/theory/entry-setups.md`](docs/theory/entry-setups.md) — why each measure setup enters, stops, and targets (with book chapter citations).

## Setup

```bash
npm install
cp .env.example .env   # set MT5_BASE_URL if needed
```

Requires Node.js 18+. Default base URL: `http://127.0.0.1:8000/api/v1`. The review page uses that default when `.env` is absent.

## Pull local test K-line data

Fetch bars from the MT5 service and save under `testdata/bars/` (**gitignored** — do not commit dumps).

```bash
# Last N bars
npm run pull-bars -- --symbol EURUSD --timeframe H1 --count 100

# Time range (Unix seconds or ISO-8601 UTC)
npm run pull-bars -- --symbol XAUUSD --timeframe M5 \
  --from 2024-01-01T00:00:00Z --to 2024-01-02T00:00:00Z
```

Optional: `--out <path>`, `--base-url <url>`. Env: `MT5_BASE_URL`.

Fixture shape: `{ data, meta, pulledAt }` (same as MT5 API envelope). Load in tests via `loadBarsFixture` from `src/data/loadBarsFixture.ts`. Unit tests mock HTTP / use synthetic bars — they do **not** call live MT5.

```bash
npm test
```

## Review page

```bash
npm run dev
```

Opens a Vite canvas on `http://127.0.0.1:5173`. Symbol and timeframe lists come from `../trading-playback/config/trading.json` (`GET /api/catalog`). From / To use the calendar control and are sent as UTC Unix seconds. Bars load through `GET /api/bars` (`loadBarsWithMeta`: local hit, otherwise MT5, offline when local coverage exists). Analysis stays off until a sidebar checkbox is enabled. Each measure/classify appears once; checking it draws that function's full results only (no parent/child cascade). Swing trend has Small-cycle trends and Entry count toggles, both off by default. Pan, zoom, and the crosshair come from `@trading-playback/kline-chart` via `attachPointerInteraction`. Sibling checkouts required: `../trading-playback` (chart packages built, plus `config/trading.json`). Chart code is imported only from `src/chart/`.

## Generate an analysis function

Use the project skill **`kline-analyze-fn`**:

- Invoke with `/kline-analyze-fn` or ask to add/generate a K-line analysis function from intent.
- Skill path: [`.cursor/skills/kline-analyze-fn/SKILL.md`](.cursor/skills/kline-analyze-fn/SKILL.md)
- **Authoritative function docs:** [`docs/spec/<functionId-kebab>.md`](docs/spec/) — required for every new analyzer.
- Data contract digest: skill `references/mt5-bars-contract.md` (source: `D:\code\services\mt5\docs\API.md`).

Scaffolding: `src/types/analysis.ts`, `src/utils/summary.ts`, `src/analyze/index.ts`.  
Analyzers: [`docs/spec/classify-reversal-signal.md`](docs/spec/classify-reversal-signal.md), [`docs/spec/classify-swing-trend.md`](docs/spec/classify-swing-trend.md).

## Task tracking

See [`docs/project-tasks.md`](docs/project-tasks.md).
