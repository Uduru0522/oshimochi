# Roadmap

This document records unfinished work and decisions. It does not set release
dates. See [Workflows](workflows.md) for implemented behavior.

## Recommended Next Steps

### 1. Refactor Backup Administration

- Extract provider setup and controls, snapshot selection, and restore review
  from the shared coordinator.
- Keep behavior unchanged and use browser regressions to verify each extraction.

### 2. Refine Oshimochi Branding

- Use `オシもち！` as the visible wordmark in every UI language.
- Remove the visible `Goods manager` subtitle from the sidebar/header branding.
- Use Zen Maru Gothic Black (900) if feasible. Inspect the current font setup
  and prefer a maintainable integration that works on GitHub Pages and offline.
  Evaluate self-hosting, retain the required license, and document attribution.
- Keep normal UI/body fonts, the existing mascot/icon, and the soft, rounded
  brand direction. Make only small layout adjustments needed by the wordmark.
- Preserve core functionality, internal identifiers, storage keys, snapshot
  identities, and technical constants.
- Update relevant branding documentation and verify the wordmark across all
  interface languages and narrow/wide layouts.

Start this feature after the backup administration refactor.

### 3. Dashboard

- Agree on useful collection summaries and shortcuts.
- Define the empty-catalog, loading, and failure states.
- Replace the current placeholder using storage-neutral application queries.

Discuss the content and scope before implementation.

### 4. Define Automatic Backup Policy

- Decide which successful mutations request a backup and how requests combine.
- Define disconnected, offline, retry, and failure behavior.
- Define visible last-success and pending status without blocking normal work.
- Add reminders before destructive operations where a fresh backup matters.
- Implement automatic backup only after these rules are agreed.

## Outstanding Drive Verification

- Configure Drive for the fresh Oshimochi storage and snapshot identity.
- Verify a new upload and restore on localhost and GitHub Pages using the
  [Drive round-trip checklist](google-drive-backup.md#test-the-full-flow).
- Verify the multi-account, shared-folder flow before treating it as a release
  guarantee. Use a dedicated test folder.

## Later Milestones

### Collection Details

Allow editing an existing collection's name and description.

### Backup Health

Show quota and retention health to the user.

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
