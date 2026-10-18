# Data Portability

IndexedDB is the live database. A backup is a portable copy, not a second live
database.

Users can download a compressed backup or store it in their own Google Drive.
Restore always replaces the full local catalog. It never merges records.

## Current Behavior

Every backup contains:

- active and soft-deleted records
- retained image assets
- snapshot and domain-model versions
- a unique snapshot ID and UTC creation time

Theme, accent, language, cached app files, OAuth configuration, and access
tokens are not included.

Restore validates the full backup before writing. A confirmed restore replaces
all collection data in one transaction. It does not merge records.

Backup files are gzip-compressed JSON. Images use base64 text inside the
snapshot. Compression reduces transfer overhead but does not encrypt or sign
the data. Restore accepts only gzip backup archives.

## Ownership

| Layer | Responsibility |
| --- | --- |
| Storage adapter | Read or replace one coherent data catalog |
| Application | Build, validate, summarize, and restore snapshots |
| File service | Download and read local files |
| Backup provider | Transfer serialized snapshots to remote storage |
| Administration view | Show progress, review, confirmation, and errors |

Transfer services receive serialized text. They do not receive repositories,
domain records, or a storage adapter.

## Data Catalog

A catalog contains all user collection data:

```js
{
  goodsTypes: [],
  fieldDefinitions: [],
  items: [],
  assets: []
}
```

Both storage adapters expose:

| Method | Rule |
| --- | --- |
| `readDataCatalog()` | Read all four sets in one read-only operation |
| `replaceDataCatalog(catalog)` | Validate, clear, and write all four sets atomically |

The IndexedDB adapter keeps `app_metadata` during replacement. The debug
adapter replaces its temporary catalog and resets on reload.

## Snapshot Format

Format version `1` uses this envelope:

```js
{
  application: "oshimochi",
  exportFormatVersion: 1,
  domainModelVersion: 1,
  snapshotId: "generated-uuid",
  createdAt: "2026-10-17T00:00:00.000Z",
  data: {
    goodsTypes: [],
    fieldDefinitions: [],
    items: [],
    assets: []
  }
}
```

Only snapshots with the `oshimochi` application identity are accepted. Drive
listing and retention also operate only on Oshimochi's file marker. Files from
another identity are left untouched and are not listed or converted.

An asset keeps its metadata and replaces the domain `Blob` with:

```js
{
  encoding: "base64",
  content: "..."
}
```

Import rebuilds the `Blob` and checks its byte count.

Canonical output has these rules:

- record arrays are ordered by ID
- JSON uses two-space indentation and one final newline
- downloaded file names use `oshimochi-backup-<UTC timestamp>.json.gz`
- compressed archives use the `application/gzip` media type

## Validation

Every selected or downloaded backup is untrusted. Validation finishes before a
replacement transaction opens.

Checks cover:

- application identity and supported versions
- snapshot identity and creation time
- record arrays and unique IDs
- protected fields and field ownership
- item values and collection relationships
- image references, ownership, types, and byte sizes
- timestamps and soft-deletion state

Older items may lack a required custom value added later. Restore keeps that
state so the normal incomplete-item warning remains useful.

Unreferenced assets are preserved. Invalid data never opens a write
transaction. An aborted transaction keeps the previous catalog.

## Restore Boundary

Export reads and validates one coherent catalog, encodes images, and transfers
a gzip archive without changing stored data. Archive creation blocks app input
and reports its current stage.

Both local files and cloud downloads pass through the same snapshot validation
and review. Only the confirmed catalog replacement uses the global mutation
lock. A successful commit reloads goods types and navigation.

See [Workflows](workflows.md#administration) for user actions.

## Cloud Provider Contract

The Administration view depends on a small provider interface:

| Operation | Purpose |
| --- | --- |
| `configure()` / `clearConfiguration()` | Manage local provider setup |
| `prepare()` | Load the remote identity library |
| `connect()` / `disconnect()` | Manage the short account session |
| `selectDestination()` | Let the user grant access to one backup folder |
| `uploadSnapshot(backup)` | Compress and store a snapshot archive |
| `listSnapshots()` | Return normalized snapshot metadata |
| `downloadSnapshot(id)` | Return text for normal validation |
| `subscribe(listener)` | Report connection and account state |

Provider code stays under `src/services/backups/`. Snapshot parsing and restore
do not depend on Google Drive.

## Google Drive Adapter

The adapter uses Google Identity Services with a short-lived, memory-only token
and the `drive.file` scope. Google Picker selects an existing folder. The user
supplies a Web OAuth client ID, restricted browser API key, and Cloud project
number; there is no shared application backend. See
[Persistence](persistence.md#browser-settings) for local configuration keys.

Uploads retain the newest three Oshimochi snapshots in the selected folder.
Listing and retention use the application marker described in
[Snapshot Format](#snapshot-format). Downloaded text still passes normal
snapshot validation and restore review.

The [Google Drive guide](google-drive-backup.md) owns setup instructions,
resource ownership, sharing limitations, security notes, and troubleshooting.
See [Testing](testing.md#backup-coverage) for automated coverage and
[manual checks](testing.md#backup-and-restore).
