# Data Portability

**Planning scope:** Export, import, and cloud snapshots are not implemented.
This document defines their intended contract.

## Goals

Browser data belongs to one origin and browser profile. Localhost, GitHub Pages,
other browsers, and other devices do not share it.

The portability work must let users:

- keep a readable backup outside browser storage
- move a collection between browser origins
- restore a complete collection after data loss
- inspect a file before replacing local data

## Snapshot Format

The snapshot is versioned and independent from IndexedDB. It must not expose
transactions, indexes, or browser object identities.

The first format may use one JSON file with encoded image data.

Every snapshot contains:

### Envelope

- application identity
- export-format version
- domain-model version
- creation timestamp

### Records

- goods types
- field definitions
- items
- image assets

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

The snapshot includes active and soft-deleted records. It also includes assets
retained for deleted items.

## Export Plan

1. Read complete record scopes.
2. Validate every record.
3. Map records into the storage-neutral snapshot.
4. Serialize the snapshot.
5. Download it as a local file.

Export is read-only. A failure must not change local data.

## Import Plan

### Validation

Validate the whole file before opening a transaction:

- application identity and supported versions
- record shapes and unique IDs
- field keys and selection-option IDs
- goods-type, field, item, and asset links
- image type, size, dimensions, and encoded data
- active and deleted lifecycle state

### Replacement

1. Parse and validate the file.
2. Show versions, date, counts, and replacement effect.
3. Ask for explicit confirmation.
4. Replace all user stores in one transaction.
5. Remount navigation and the active view after commit.

Invalid, unsupported, or partial files leave the current collection unchanged.

The first import mode is replacement only. Silent merge is not allowed.

## Google Drive Plan

Google Drive will store and retrieve complete snapshot files. It will not act as
a live database.

Live synchronization needs separate rules for:

- revision identity
- concurrent edits
- deletion propagation
- expired authentication
- offline edits
- conflict review and recovery

## Verification Plan

### Pure Format Tests

- deterministic serialization
- supported and unsupported versions
- duplicate identities
- broken relationships
- malformed image data
- round trip from records to snapshot and back

### Storage Tests

- complete scopes include deleted records and retained assets
- replacement uses one transaction
- parse and validation failures do not write
- transaction failure leaves existing records unchanged

### Browser Checks

- file selection and cancellation
- export download
- import review
- replacement confirmation
- readable failures

## Delivery Order

1. Define and test the snapshot model.
2. Add local export.
3. Add validated replacement import.
4. Add backup reminders.
5. Add optional Google Drive upload and download.
