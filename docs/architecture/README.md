# Architecture documentation

Module architecture designs for this repository. Structure follows a **lean arc42** outline tailored to one module per file.

## Doc layers (do not conflate)

| Layer | Answers | Location |
|-------|---------|----------|
| Goal / requirements | *What* and acceptance | [`../goal.md`](../goal.md), [`../requirements.md`](../requirements.md) |
| Specification | Module contracts, APIs, on-disk rules | [`../specification/`](../specification/) |
| Architecture | Structure, runtime, decisions, quality | [`docs/architecture/`](./) |
| Function spec | Single analyzer algorithm | [`../spec/`](../spec/) |

Architecture docs **link** to specification for API and file-format detail; they must not paste large contract dumps.

## Required outline (every module arch doc)

1. Introduction and goals  
2. Constraints  
3. Context and scope  
4. Solution strategy  
5. Building block view  
6. Runtime view  
7. Deployment and operations  
8. Cross-cutting concepts  
9. Architecture decisions  
10. Quality requirements  
11. Risks and technical debt  
12. Glossary and references  

## Writing rules

- Include at least one **context/component** mermaid diagram and one **runtime** sequence (or equivalent flow).
- Decisions: short table or bullets with Context / Decision / Consequences; mark deferred items and link task IDs.
- Keep English body text aligned with goal / requirements / specification.
- Update related indexes (`goal`, `specification`, `project-tasks`, root README) when adding a module arch doc.

## Modules

| Module | FR | Architecture | Specification |
|--------|----|--------------|---------------|
| Data | FR-1 | [`data.md`](data.md) | [`../specification/data.md`](../specification/data.md) |
| Analyze | FR-2 | [`analyze.md`](analyze.md) | [`../specification/analyze.md`](../specification/analyze.md) |
| Chart | FR-3 | [`chart.md`](chart.md) | [`../specification/chart.md`](../specification/chart.md) |
