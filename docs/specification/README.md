# Module specifications

Module-level design docs derived from [`../requirements.md`](../requirements.md) and [`../goal.md`](../goal.md).

## `specification/` vs `spec/`

| Directory | Scope |
|-----------|--------|
| [`docs/specification/`](./) | **Modules** (data / analyze / chart): shared APIs, directories, boundaries |
| [`docs/spec/`](../spec/) | **Single analysis function** authoritative specs (algorithms, labels, templates) |

## Modules

| Module | FR | Specification | Architecture |
|--------|----|---------------|--------------|
| Data | FR-1 | [`data.md`](data.md) | [`../architecture/data.md`](../architecture/data.md) |
| Analyze | FR-2 | [`analyze.md`](analyze.md) | [`../architecture/analyze.md`](../architecture/analyze.md) |
| Chart | FR-3 | [`chart.md`](chart.md) | [`../architecture/chart.md`](../architecture/chart.md) |

```mermaid
flowchart LR
  mt5[MT5_service]
  localStore[Local_bars_persist]
  analyzeLayer[Analyze_PA_functions]
  vizLayer[Viz_third_party_chart]
  mt5 -->|fetch_then_save| localStore
  localStore --> analyzeLayer --> vizLayer
```

## Related

- Goal: [`../goal.md`](../goal.md)
- Requirements: [`../requirements.md`](../requirements.md)
- Architecture: [`../architecture/`](../architecture/)
- Tasks: [`../project-tasks.md`](../project-tasks.md)
