# Documentation

Use this index as the entrypoint for development and user guides. Current
behavior and unfinished work have separate owners.

## Start A Development Session

1. Read the repository rules in [AGENTS.md](../AGENTS.md).
2. Inspect the current branch, working tree, and open pull requests.
3. Use [Testing](testing.md) to check the baseline before changing behavior.
4. Use the [Roadmap](roadmap.md) to discuss the next feature before implementing it.

## Current Implementation

| Document | Scope |
| --- | --- |
| [Workflows](workflows.md) | User actions available in the app |
| [Google Drive Setup](google-drive-backup.md) | Cloud setup, sharing, round-trip checks, and troubleshooting |
| [Development](development.md) | Local setup and coding conventions |
| [Design Philosophy](design.md) | Visual principles and reusable patterns established by My collection |
| [Testing](testing.md) | Automated checks, test design, and manual browser checklists |
| [Deployment](deployment.md) | GitHub Pages configuration and release procedure |
| [Architecture](architecture.md) | Runtime flow, code ownership, and dependency rules |
| [Domain Model](data-model.md) | Records, relationships, and invariants |
| [Persistence](persistence.md) | Browser settings, IndexedDB, adapters, and transactions |
| [Data Portability](data-portability.md) | Snapshot format, validation, and cloud-provider contract |

## Planning

| Document | Scope |
| --- | --- |
| [Roadmap](roadmap.md) | Unfinished work, decisions, and recommended order |

Documentation rules live in [AGENTS.md](../AGENTS.md#documentation). Link to the
owning guide instead of repeating its detailed instructions.
