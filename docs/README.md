# Documentation

The documents are split into current behavior and product plans. This keeps
implemented facts separate from unfinished work.

## Current Implementation

| Document | Scope |
| --- | --- |
| [Architecture](architecture.md) | Runtime flow, code ownership, and dependency rules |
| [Domain Model](data-model.md) | Records, relationships, and invariants |
| [Persistence](persistence.md) | IndexedDB, adapters, transactions, and errors |
| [Workflows](workflows.md) | User workflows available in the app |
| [Development](development.md) | Local commands and coding conventions |
| [Testing](testing.md) | Test ownership, shape, and coverage |
| [Deployment](deployment.md) | GitHub Pages release process |

## Planning

| Document | Scope |
| --- | --- |
| [Roadmap](roadmap.md) | Completed work and ordered milestones |
| [Data Portability](data-portability.md) | Backup, import, and cloud-snapshot design |

## Writing Rules

- Current documents describe only behavior that exists.
- Unfinished work belongs only in a planning document.
- Keep each paragraph focused and short.
- Group related list items under a clear heading.
- Link to the owning document instead of copying detailed rules.
- Update paths and commands in the same commit as the code change.
