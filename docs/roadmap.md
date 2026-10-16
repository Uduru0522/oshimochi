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

## Current Milestone: Backup Export And Import

- [ ] Export one versioned local snapshot.
- [ ] Include active and soft-deleted records.
- [ ] Include every retained image asset.
- [ ] Validate the full file before a write starts.
- [ ] Review and confirm replacement of local data.
- [ ] Replace all user stores atomically.
- [ ] Keep existing data unchanged after any failure.

The first import mode is full replacement. Merge is outside this milestone.

See [Data Portability](data-portability.md) for the file and workflow design.

## Later Milestones

### Cloud Snapshots

- Upload and download the same snapshot format through Google Drive.
- Add reminders before destructive operations.
- Define bounded snapshot retention.

### Multi-Device Data

Evaluate live synchronization only after identity, revision, conflict, and
deletion rules are defined.

## Outside Current Scope

- Server-hosted user database
- Multi-user accounts and permissions
- Live Google Drive database access
- One IndexedDB store per goods type
- Destructive field-type conversion
- Import merge without explicit conflict rules
