# Persistence

This document describes the current storage adapters, IndexedDB schema, and
transaction rules.

## Runtime Adapters

Startup selects one adapter:

| Mode | Adapter | Lifetime |
| --- | --- | --- |
| User | `IndexedDbStorage` | Persists in the current browser origin |
| Debug | `DebugStorage` | Resets to fixtures on reload |

Both adapters implement `src/data/contracts/storage-contract.js` and return
plain domain records.

Views never receive IndexedDB requests, transactions, store names, or browser
storage events. User mode also never falls back to debug data after a failure.

## IndexedDB Schema

```text
Name:    wotagoods-manager
Version: 1
```

Goods types and custom fields are normal records. Creating them does not change
the database version.

| Store | Key | Indexes | Content |
| --- | --- | --- | --- |
| `goods_types` | `id` | `by_updated_at` | Goods-type records |
| `field_definitions` | `id` | `by_goods_type`, unique `by_goods_type_and_key` | Field records |
| `items` | `id` | `by_goods_type`, `by_goods_type_and_updated_at` | Items for all goods types |
| `assets` | `id` | none | Processed image blobs |
| `app_metadata` | `key` | none | Domain metadata |

IndexedDB cannot use booleans as index keys. Repositories query by parent ID and
then apply lifecycle scope in memory.

## Storage Contract

The adapter contract is grouped by responsibility:

| Group | Methods |
| --- | --- |
| Lifecycle | `initialize`, `close` |
| Goods types | `listGoodsTypes`, `createGoodsType` |
| Fields | `listFieldDefinitions`, `saveFieldDefinitions` |
| Items | `listItems`, `createItem`, `updateItemContent` |
| Item lifecycle | `updateItemLifecycle`, `purgeItem` |
| Assets | `getAsset` |
| Complete catalog | `readDataCatalog`, `replaceDataCatalog` |
| Maintenance | `resetData` |

### Record Scopes

Catalog reads require one explicit scope from
`src/data/models/record-lifecycle.js`:

| Scope | Result |
| --- | --- |
| `active` | Records available to normal workflows |
| `deleted` | Records available to recovery workflows |
| `all` | Complete records for integrity checks |

Callers do not use flags such as `includeDeleted`. The scope states which
catalog is being read.

### Item Write Boundaries

`updateItemContent` owns editable values and image replacement.
`updateItemLifecycle` owns only `isDeleted`, `deletedAt`, and `updatedAt`.

`purgeItem` accepts a deleted item ID. It rereads the item inside the write
transaction and removes both the item and its retained image.

## Transactions

Validation, image processing, and user confirmation finish before a transaction
starts. Each operation chooses its full store set at the start.

| Operation | Stores |
| --- | --- |
| Create goods type | `goods_types`, `field_definitions` |
| Apply field changes | `field_definitions` |
| Create item with image | `assets`, `items` |
| Edit item without image | `items` |
| Replace item image | `assets`, `items` |
| Delete or restore item | `items` |
| Purge deleted item | `items`, `assets` |
| Read backup catalog | `goods_types`, `field_definitions`, `items`, `assets` |
| Restore backup catalog | `goods_types`, `field_definitions`, `items`, `assets` |
| Reset local data | `goods_types`, `field_definitions`, `items`, `assets` |

Image replacement removes the old asset in the same transaction. Backup reads
use one read-only transaction. Restore clears and rewrites all four user stores
in one write transaction. Restore and reset keep `app_metadata`.

The global mutation controller blocks overlapping writes. IndexedDB protects
atomic commits. The debug adapter validates its full change before replacing
its in-memory arrays.

## Errors And Startup

Adapters translate browser failures into `StorageError` values. UI code uses
the stable error code and never parses browser event text.

Current error groups cover:

- storage unavailable or not initialized
- initialization or upgrade failure
- invalid adapter or invalid persisted data
- blocked upgrade
- failed operation

Startup follows one sequence:

1. show loading state
2. initialize the selected adapter
3. load goods types
4. build views and navigation
5. show a retry action on failure

A failed database must not look like an empty collection.

## Record Validation

Storage boundaries validate records:

- before a write
- after reading persisted data
- before returning data to application code

Invalid data produces a storage error. It is not skipped or repaired.

Shared primitive checks live in
`src/data/models/record-validation.js`. Lifecycle parsing and scopes live in
`record-lifecycle.js`. Each record model owns its remaining shape rules.

## Connection Lifecycle

- Repeated initialization returns the same ready state.
- `close()` releases the connection.
- `versionchange` closes stale connections.
- A blocked upgrade asks the user to close other tabs.

## Version Ownership

Two versions are active in the current app:

| Version | Meaning | Owner |
| --- | --- | --- |
| IndexedDB version | Physical stores and indexes | `database-schema.js` |
| Domain-model version | Record shape and meaning | `domain-model.js` |

`app_metadata` stores:

```js
{ key: "domainModelVersion", value: 1 }
```

The physical schema imports the domain version. It does not define domain
meaning.

## Source Ownership

| Path | Responsibility |
| --- | --- |
| `src/application/` | Storage-neutral operations |
| `src/data/contracts/` | Adapter interface and errors |
| `src/data/debug/` | In-memory adapter and fixtures |
| `src/data/indexeddb/` | Schema, connection, repositories, and adapter |
| `src/data/models/` | Domain construction and validation |
