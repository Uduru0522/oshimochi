# Data Portability

This document defines future export, import, backup, and cloud-snapshot behavior.
No transfer feature is implemented yet.

## Why Export Is Required

Browser storage belongs to one origin and browser profile:

- localhost and GitHub Pages have separate databases
- another browser or device cannot see the collection automatically
- clearing site data removes the local collection

Export is therefore a data-safety feature, not only a convenience.

## Export Contract

Exports use a versioned, storage-neutral representation. They must not expose raw
IndexedDB transactions, index layouts, or browser-specific object identities.

The first implementation may use one JSON file with encoded image content for
portability. A later archive can store JSON metadata and binary image files while
preserving the same domain records.

Every export includes:

- export-format version
- domain-model version
- creation timestamp
- application identity
- goods types, field definitions, items, and assets

A first-version envelope should keep transport metadata separate from domain
records:

```js
{
  application: "wotagoods-manager",
  exportFormatVersion: 1,
  domainModelVersion: 1,
  createdAt: "2026-08-10T00:00:00.000Z",
  data: {
    goodsTypes: [],
    fieldDefinitions: [],
    items: [],
    assets: []
  }
}
```

Export reads complete `all` record scopes. Soft-deleted records and assets
retained for recovery are part of the collection and must not be omitted.

## Import Contract

Import validates the complete file before opening a mutation. Validation covers:

- application identity and supported export/domain versions
- each record through its domain parser
- unique record, field-key, and selection-option identities
- goods-type, field, item, and asset relationships
- image media type, dimensions, byte size, and encoded payload
- lifecycle consistency for active and soft-deleted records

The first implementation supports replacement only. It stages a fully validated
storage-neutral snapshot, presents a review, and replaces all user-data stores in
one transaction after explicit confirmation. Invalid, unsupported, or partial
files leave the current collection untouched.

Controlled merge may be added only after identity collisions, option changes,
deleted records, and asset ownership have deterministic conflict rules. The
application must never silently combine collections.

Before destructive replacement or future migrations, the UI should offer an
export of the existing collection. This is preferable to automatically retaining
an opaque database copy that the user cannot inspect or manage.

## Google Drive

The first Google Drive integration should upload and download complete export
snapshots. It is not a live database.

Live multi-device synchronization is deferred until these are designed:

- revision identity
- concurrent-edit conflicts
- deletion propagation
- authentication expiry
- offline changes
- user-visible recovery

## Retention Direction

1. Complete deleted-item recovery and purge semantics.
2. Implement explicit local export and validated replacement import.
3. Add backup reminders before destructive operations.
4. Add optional Google Drive snapshot upload and download.
5. Consider bounded automatic retention only after storage costs and conflict
   behavior are understood.
