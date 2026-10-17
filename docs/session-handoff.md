# Session Handoff

Updated 2026-10-18. This document is a short entrypoint for the next development
session. Detailed rules stay in their owning documents.

## Start Here

1. Read the repository rules in [AGENTS.md](../AGENTS.md).
2. Check the current branch, working tree, and open pull requests.
3. Run `npm run check` before changing behavior.
4. Use the [documentation index](README.md) for implementation details.
5. Use the [roadmap](roadmap.md) for unfinished work and recommended order.

## Current Baseline

- `main` contains the portable backup and user-owned Google Drive milestone and
  is deployed to GitHub Pages.
- The package version and latest release tag are `0.5.0` and `v0.5.0`.
  The backup release passed deployment and owner-confirmed smoke checks.
- Pull request [#1](https://github.com/Uduru0522/oshimochi/pull/1)
  contains the Oshimochi rename, branding, and themeable icon integration.
- Stale pre-release IndexedDB data was reset after the image field became
  required. No legacy-data migration was kept.

## Architecture Summary

Oshimochi is a build-free static browser app. Node.js 24 runs the local
server and repository checks, but the deployed app uses native browser modules.

| Layer | Responsibility |
| --- | --- |
| `src/app/` | Runtime composition, startup, routing, and shared state |
| `src/application/` | Storage-neutral use cases and item queries |
| `src/data/` | Domain validation, IndexedDB, and debug storage |
| `src/services/` | Browser files, preferences, service worker, and cloud transfer |
| `src/views/`, `src/navigation/` | Feature UI, routes, and navigation |
| `src/shared/` | Product-neutral DOM, dialog, drag, and motion helpers |

Dependency direction is enforced by `scripts/verify-static.js`. Read
[Architecture](architecture.md) before moving responsibilities between layers.
See [Deployment](deployment.md) for GitHub Actions verification and Pages
workflow details.

## Completed Functionality

- **Collections:** goods-type creation, protected fields, staged custom-field
  editing, overview, and direct item navigation.
- **Items:** typed forms, required image cropping, card and list views, search,
  field filters, sorting, editing, and keyed motion.
- **Lifecycle:** soft deletion, per-collection recovery, and permanent item and
  image purge.
- **Interface:** responsive wide and narrow layouts, three languages, two
  themes, seven accent colors, and offline app-shell caching.
- **Data safety:** compressed local backup, validated review, atomic full
  restore, local-data reset, and retained deleted records and images.
- **Cloud backup:** user-owned Google setup, Drive folder selection, manual
  upload and restore, and newest-three snapshot retention.

The [workflows](workflows.md) document owns user behavior. The
[data-portability](data-portability.md) document owns backup details.

## Important Decisions

- IndexedDB is the live user database. Debug mode is isolated in memory.
- GitHub Pages hosts only static files. There is no maintainer-owned account,
  database, OAuth client, API key, or backup storage.
- Each Drive user supplies public configuration from a Google Cloud project
  they control. Access tokens stay in memory.
- Drive backup is a manual snapshot workflow, not synchronization. Restore
  replaces the complete local catalog and never merges records.
- Backups are gzip-compressed but not encrypted. Preferences and Google setup
  are not part of a snapshot.
- Browser data and settings are origin-specific. Localhost and GitHub Pages do
  not share them.
- Oshimochi has its own database, preferences, and snapshot identity. See
  [Persistence](persistence.md#indexeddb-schema) for the storage boundary.
- The app is pre-release. Obsolete development data should be reset rather than
  creating permanent compatibility behavior without an explicit product need.

## Known Limitations

- Google setup is manual, and Drive must reconnect after a page reload.
- Automatic backup, live synchronization, conflict resolution, and shared user
  accounts do not exist.
- Google Workspace Shared Drives are unsupported. The multi-account shared
  folder flow has not completed a release-level verification pass.
- Only the newest three app snapshots are kept in the selected folder.
- Backups can be read by anyone who can access and decompress their files.
- Responsive layout, browser storage, service-worker behavior, and real Google
  dialogs rely on manual checks because there is no automated browser suite.

## Resume Point

The Google Drive milestone works with a personal account on localhost and the
hosted app. Continue with the ordered work in
[Recommended Next Steps](roadmap.md#recommended-next-steps). Keep new plans in
the roadmap until they are implemented.
