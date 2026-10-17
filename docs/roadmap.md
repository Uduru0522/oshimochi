# Roadmap

This is a planning document. It records delivered capability groups and the
order of unfinished work. It does not set release dates.

## Delivered

### Platform

- Responsive local-first shell
- User and debug modes
- Light and dark themes with seven accent colors
- Three interface languages
- Offline app-shell cache
- GitHub Pages deployment
- Static architecture checks and unit tests

### Collection Setup

- Goods-type creation
- Protected built-in fields
- Staged custom-field management
- Atomic schema writes
- Navigation refresh after changes
- Typed local-data reset

### Item Entry

- Generated forms for all supported field types
- Required image crop in two orientations
- Review before save
- Atomic item and image writes
- Recoverable errors that keep the draft

### Item Browser

- Shared query pipeline for card and list views
- General and field-aware filtering
- Typed sorting
- Context-aware card fields
- Keyed add, edit, filter, sort, and delete motion

### Item Lifecycle

- Modal editing with optional image replacement
- Soft deletion
- Per-collection deleted-item recovery
- Permanent item and image purge

### Internal Structure

- Storage-neutral application operations
- Validated domain records
- IndexedDB and in-memory adapter parity
- Explicit record scopes
- Focused source and test ownership

### Portable Backup And Restore

- Coherent catalog reads through both storage adapters
- Versioned JSON snapshots with retained image data
- Local download of active and soft-deleted records
- Full validation and review before restore
- Atomic replacement of all user-data stores
- Failure behavior that preserves the previous catalog

Restore is full replacement. Merge is outside the current product.

### User-Owned Google Drive Backup

- Provider-neutral cloud backup contract
- User-supplied Google Cloud configuration
- Narrow `drive.file` permission and memory-only access tokens
- Existing-folder selection through Google Picker
- Compressed upload, listing, download, and validated restore
- Newest-three snapshot retention
- Shared local and cloud restore review
- Personal-account round trips on localhost and GitHub Pages

See [Data Portability](data-portability.md) for the snapshot contract, provider
boundary, ownership model, and setup steps.

## Recommended Next Steps

### 1. Close The Backup Release

- Confirm pull-request verification runs `npm run check` for PRs targeting `main`.
- Decide the next semantic version for the backup milestone.
- Run the complete user- and debug-mode smoke checks from `docs/development.md`.
- Confirm the deployed Pages workflow and personal Drive round trip.
- Create a milestone tag only after explicit owner approval.

After closing the backup release, discuss the separate icon work in
[PR #1](https://github.com/Uduru0522/wotagoods-manager/pull/1) before starting
another milestone.

### 2. Define Automatic Backup Policy

- Decide which successful mutations request a backup and how requests combine.
- Define disconnected, offline, retry, and failure behavior.
- Define visible last-success and pending status without blocking normal work.
- Add reminders before destructive operations where a fresh backup matters.
- Implement automatic backup only after these rules are agreed.

### 3. Add Browser Regression Coverage

- Choose a small end-to-end browser harness.
- Cover startup, IndexedDB persistence, one item workflow, and local restore.
- Keep responsive, motion, service-worker, and real Google checks manual where
  automation would be brittle or require personal credentials.

## Later Milestones

### Backup Health

- Show quota and retention health to the user.

### Multi-Device Data

Evaluate live synchronization only after identity, revision, conflict, and
deletion rules are defined.

## Outside Current Scope

- Server-hosted user database
- Shared developer-owned cloud backup
- Dropbox and OneDrive backup providers
- Multi-user accounts and permissions
- Live multi-device synchronization
- One IndexedDB store per goods type
- Destructive field-type conversion
- Import merge without explicit conflict rules
