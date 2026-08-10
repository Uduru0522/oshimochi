# Documentation

This directory separates current architecture from planned product behavior. A
document should state whether it describes implemented code or a future contract.

## Start Here

| Document | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Current runtime flow, module ownership, and dependency rules |
| [Development](development.md) | Local commands, conventions, browser storage, and common changes |
| [Testing Strategy](testing.md) | Test ownership, quality rules, coverage scope, and milestone matrices |
| [Deployment](deployment.md) | GitHub Pages workflow and release verification |
| [Roadmap](roadmap.md) | Implemented capabilities and ordered milestones |

## Data And Product Design

| Document | Purpose |
| --- | --- |
| [Domain Model](data-model.md) | Stable records, relationships, built-in fields, and deletion rules |
| [Persistence](persistence.md) | IndexedDB schema, adapters, transactions, errors, and migrations |
| [Workflows](workflows.md) | Implemented and planned goods-management workflows |
| [Data Portability](data-portability.md) | Planned versioned export/import contract and optional Google Drive snapshots |

## Documentation Rules

- `architecture.md` describes code that exists now.
- Design documents may describe future behavior but must label it clearly.
- `roadmap.md` is the source of truth for implementation status and sequence.
- Avoid copying the same detailed rules into several files; link to the owner.
- Update file paths and commands in the same commit that changes them.
