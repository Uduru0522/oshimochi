# Roadmap

This document records unfinished work and decisions. It does not set release
dates. See [Workflows](workflows.md) for implemented behavior.

## Recommended Next Steps

### 1. Expand Browser Regression Coverage

- Cover custom-field entry, filtering, sorting, and presentation changes.
- Cover local backup and restore, including cancellation and invalid-file
  rejection without data loss.
- Run the suite in CI. See [Testing](testing.md#browser-regression-tests) for
  current browser coverage.
- Keep responsive, motion, offline-update, and real Google checks manual where
  automation would be brittle or require personal credentials.

### 2. Refactor Backup Administration

- Extract provider setup and controls, progress UI, and snapshot selection and
  restore review from the shared coordinator.
- Keep behavior unchanged and use browser regressions to verify each extraction.

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
