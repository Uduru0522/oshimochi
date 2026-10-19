# Roadmap

This document records unfinished work and decisions. It does not set release
dates. See [Workflows](workflows.md) for implemented behavior.

## Recommended Next Steps

### 1. Prepare The My Collection Pull Request

My collection, the card editor, and Recent items are feature-complete on the
feature branch. The owner has approved the final diff and local testing,
including the refactor and embedded-browser scroll/focus fix. See
[My collection workflows](workflows.md#my-collection) for the completed scope.

The refactor addresses card packing and scroll stability, rendering and preview
lifecycle ownership, and shared calculation work. Organize the approved changes
into small, focused commits and prepare one feature pull request. Follow
[AGENTS.md](../AGENTS.md#local-review-before-commits); merging still requires
explicit owner approval.

### 2. Define Automatic Backup Policy

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

### Wide Navigation Scroll Hints

Add top and bottom fade hints to the wide category list, matching the narrow
navigation's edge hint. Show each hint only while more categories remain in
that direction.

### Field Editing Confirmation

Make pending field changes and the final confirmation action easier to notice.
Clearly distinguish staged edits from saved changes so users know when they
still need to confirm them.

### Collection Details

Allow editing an existing collection's name and description.

### Item Details In Collections

Reuse the dashboard's read-only item detail dialog in the collection item browser.

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
