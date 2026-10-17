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
  application: "wotagoods-manager",
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
- downloaded file names use `wotagoods-backup-<UTC timestamp>.json.gz`
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

## Local Workflow

Export reads one catalog, validates it, encodes images, and downloads one gzip
archive. It does not change stored data. Archive creation blocks other app
input and reports its current stage until the download is ready.

Restore follows this order:

1. Read and decompress a selected gzip archive.
2. Parse and validate the full snapshot.
3. Show its date, record counts, and image size.
4. Ask for replacement confirmation.
5. Replace all user-data stores atomically.
6. Reload goods types and navigation.

Only step 5 uses the global mutation lock.

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

## User-Owned Google Drive

Wotagoods does not run a shared backup backend. GitHub Pages serves only the
static interface.

Each browser setup supplies three public values from a user- or group-controlled
Google Cloud project: a Web OAuth client ID, a restricted browser API key, and
the project number. This creates separate ownership boundaries:

| Resource | Owner |
| --- | --- |
| Drive files and storage | The signed-in Google account |
| Drive and Picker API quota | The user's Google Cloud project |
| OAuth and API key settings | The user's Google Cloud project |
| Live collection database | The user's browser profile |

No developer-owned OAuth client, API key, storage bucket, client secret, or
application server is used.

The client ID, restricted API key, project number, and selected folder metadata
are public configuration. Wotagoods stores them in `localStorage` on the current
origin. Access tokens stay in memory and disappear when the page closes or
reloads.

Google Identity Services obtains a short-lived token after a user action. The
app requests only the non-sensitive `drive.file` scope. Google Picker lets the
user grant this app access to one existing folder without exposing the rest of
Drive.

Backups use the folder selected by the user. New uploads are gzip archives. The
newest three Wotagoods snapshots in that folder are kept after each upload.
Downloaded gzip snapshots still pass the normal local validation and review
flow.

## Personal Google Setup

Each user creates a Google Cloud project, authorizes each browser origin, and
chooses an existing Drive folder. The app needs a Web OAuth client ID, a
restricted browser API key, and that project's number. It never needs a client
secret.

Follow [Google Drive Backup Setup](google-drive-backup.md) for beginner steps,
sharing behavior, debug-mode rules, and troubleshooting.

## Security Notes

- Never enter or commit a client secret. Browser apps cannot keep one secret.
- The client ID and API key are public browser configuration. Neither can read
  Drive data without a user access token.
- Restrict the API key to the approved websites, Google Picker API, and Google
  Drive API to prevent use from unrelated sites.
- Authorized JavaScript origins restrict where the browser flow can start.
- Google Picker grants access only to the folder the user selects.
- Access tokens are sent only to Google APIs and are not written to backups.
- Disconnect revokes the active grant when a valid token is available.
- Anyone with Drive account access can decompress and read the unencrypted
  archives.
- Users must trust the JavaScript served by the hosted origin while connected.

For stronger deployment isolation, a user can fork the repository, host the
same static app, and authorize only that origin. No backend is needed.

Official references:

- [Google browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Create a Web OAuth client](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)
- [Integrate Google Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker)
- [Choose Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Drive API usage limits](https://developers.google.com/workspace/drive/api/guides/limits)

## Verification

Automated tests cover:

- catalog integrity and atomic replacement
- snapshot versions, JSON shape, and image round trips
- invalid content and failed replacement behavior
- local file transfer
- gzip compression and decompression
- provider configuration, Google Identity loading, and Google Picker loading
- folder selection, Drive connection, listing, upload, retention, and guarded
  download

Manual checks cover browser downloads, file selection, popup consent,
responsive layout, and the real Google folder picker. A personal-account Drive
round trip has been completed on localhost and GitHub Pages. Shared-folder and
multi-account behavior remains a separate manual verification boundary.
