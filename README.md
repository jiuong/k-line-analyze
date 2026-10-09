# k-line-analyze

K-line (candlestick) analysis helpers driven by the local MT5 microservice bars API.

## Generate an analysis function

Use the project skill **`kline-analyze-fn`**:

- Invoke with `/kline-analyze-fn` or ask to add/generate a K-line analysis function from intent.
- Skill path: [`.cursor/skills/kline-analyze-fn/SKILL.md`](.cursor/skills/kline-analyze-fn/SKILL.md)
- **Authoritative function docs:** [`docs/spec/<functionId-kebab>.md`](docs/spec/) — required for every new analyzer.
- Data contract digest: skill `references/mt5-bars-contract.md` (source: `D:\code\services\mt5\docs\API.md`).

First seeded spec: [`docs/spec/classify-swing-trend.md`](docs/spec/classify-swing-trend.md) (spec only; implementation pending scaffolding).

## Task tracking

See [`docs/project-tasks.md`](docs/project-tasks.md).
