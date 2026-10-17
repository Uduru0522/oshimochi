# Documentation

The documents are split into current behavior and product plans. This keeps
implemented facts separate from unfinished work.

## Current Implementation

| Document | Scope |
| --- | --- |
| [Session Handoff](session-handoff.md) | Current baseline, decisions, limitations, and resume point |
| [Architecture](architecture.md) | Runtime flow, code ownership, and dependency rules |
| [Domain Model](data-model.md) | Records, relationships, and invariants |
| [Persistence](persistence.md) | IndexedDB, adapters, transactions, and errors |
| [Workflows](workflows.md) | User workflows available in the app |
| [Development](development.md) | Local commands and coding conventions |
| [Testing](testing.md) | Test ownership, shape, and coverage |
| [Deployment](deployment.md) | GitHub Pages release process |
| [Data Portability](data-portability.md) | Snapshot format, local restore, and user-owned Drive backup |
| [Google Drive Setup](google-drive-backup.md) | Beginner setup, sharing rules, testing, and troubleshooting |
| [Brand Icon](oshimochi-brand-icon.md) | Shared SVG, accent colors, and installed-app icon |

## Planning

| Document | Scope |
| --- | --- |
| [Roadmap](roadmap.md) | Completed work and ordered milestones |

## Writing Rules

- Current documents describe only behavior that exists.
- Unfinished work belongs only in a planning document.
- Keep each paragraph focused and short.
- Group related list items under a clear heading.
- Link to the owning document instead of copying detailed rules.
- Update paths and commands in the same commit as the code change.
