# Roadmap

This document records unfinished work and decisions. It does not set release
dates. See [Workflows](workflows.md) for implemented behavior.

## Recommended Next Steps

### 1. Dashboard

Replace the placeholder with a fixed overview panel and user-defined summary
cards. Per-card filters are part of the agreed scope.

#### Overview And Cards

- Show collection, active-item, and deleted-item counts in the overview.
- Allow adding, editing, removing, and reordering named cards.
- Support count, sum, average, minimum, and maximum calculations over selected
  collections. Numeric calculations choose one numeric field per collection;
  field names may differ between collections.
- Offer number and currency formatting. Currency formatting does not convert
  values; sources must use the same unit.
- Provide a result preview while configuring a card, with drafts kept separate
  from saved settings.

#### Filtering And Calculation Rules

- Configure filters within each selected collection, reusing the item browser's
  text, number, date, two-option, and selection rules. Match every field rule;
  selected choices within one rule are alternatives.
- Combine the matching items from the selected collections before calculating.
  An average uses all matching numeric values, not an average of collection
  averages.
- Support date ranges and a relative "this year" preset for purchase-date
  fields. Resolve relative dates when reading the dashboard.
- Default to active items, with a per-card option to include deleted items.
- Exclude missing numeric values, retain zero, and show how many matching items
  contribute a value. A count may be zero; numeric calculations without values
  show an empty result instead of implying a measured zero.
- Store collection, field, and choice references by stable IDs. Renaming labels
  must preserve the card. An unavailable source or field must show a repair
  state rather than silently dropping a condition or displaying a partial total.
- Explain unavailable references using the affected collection, field, or choice
  names and a specific action, such as choosing a replacement field or removing
  a collection from the card. Keep enough label context to identify a reference
  after it becomes unavailable; avoid a generic "Card needs repair" message.

#### Persistence And Verification

- Save card definitions and ordering with the catalog and include them in local
  and Drive backups. Restore must replace matching card configuration along
  with its collections and fields.
- Define the catalog and snapshot version changes before implementing storage.
  Preserve import of released backups without cards as an empty card list.
- Keep user and debug card storage isolated. Use storage-neutral application
  queries and avoid loading image blobs for dashboard calculations.
- Cover empty catalogs, no cards, no matching values, loading, read failures,
  and unavailable card references in all interface languages and layouts.
- Build small reviewable slices: calculation rules and regression tests; card
  persistence and backup round trips; dashboard and card editor; browser checks
  and documentation. Follow the local review and commit rules in
  [AGENTS.md](../AGENTS.md#local-review-before-commits).

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
