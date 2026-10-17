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

## Current Milestone: User-Owned Google Drive Backup

- [x] Define a provider-neutral cloud backup contract.
- [x] Let each user store their own public Google project setup locally.
- [x] Request only the `drive.file` permission.
- [x] Let the user choose the backup folder through Google Picker.
- [x] Keep access tokens in memory.
- [x] Upload, list, download, and validate app-owned snapshots.
- [x] Retain the newest three snapshots after upload.
- [x] Reuse the local restore review and atomic replacement flow.
- [ ] Verify consent, folder selection, upload, and restore with a real account
  on localhost.
- [ ] Repeat the cloud round trip on GitHub Pages.

See [Data Portability](data-portability.md) for the snapshot contract, provider
boundary, ownership model, and setup steps.

## Later Milestones

### Backup Policy

- Add reminders before destructive operations.
- Add automatic backup after the manual cloud workflow is verified.
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
