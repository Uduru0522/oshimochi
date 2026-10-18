# Roadmap

This document records unfinished work and decisions. It does not set release
dates. See [Workflows](workflows.md) for implemented behavior.

## Recommended Next Steps

### 1. Refine Oshimochi Branding

- Local review of the selected `オシもち。` wordmark is complete. Finish the
  feature pull request and CI review, then wait for owner approval to merge.
- Keep normal UI/body fonts, the existing mascot/icon, core functionality,
  storage keys, and snapshot identities unchanged.

### 2. Dashboard

- Agree on useful collection summaries and shortcuts.
- Define the empty-catalog, loading, and failure states.
- Replace the current placeholder using storage-neutral application queries.

Discuss the content and scope before implementation.

### 3. Define Automatic Backup Policy

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
