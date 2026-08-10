# Domain Model

This document defines the stable application records. Goods types and their
protected built-in field definitions can now be created atomically. Remaining
mutation behavior is specified in [Workflows](workflows.md).

## Goals

- Support many goods types without changing physical database schema.
- Let each goods type define custom item fields.
- Keep protected item fields consistent across goods types.
- Preserve soft-deleted records until an explicit purge.
- Keep records independent from IndexedDB and UI components.
- Remain exportable to a versioned, storage-neutral format.

## Naming

- JavaScript record properties use `camelCase`.
- Persistent object-store and index names use lowercase `snake_case`.
- IDs are opaque stable strings and never derive from editable labels.
- User-facing labels use unrestricted normal text.

## Relationships

```mermaid
erDiagram
  goods_types ||--o{ field_definitions : defines
  goods_types ||--o{ items : classifies
  items o|--o| assets : references

  goods_types {
    string id PK
    string displayName
    string description
    boolean isDeleted
    datetime deletedAt
    datetime createdAt
    datetime updatedAt
  }

  field_definitions {
    string id PK
    string goodsTypeId FK
    string key
    string displayName
    string dataType
    boolean isRequired
    boolean isBuiltIn
    number position
    json defaultValue
    object options
    boolean isDeleted
    datetime deletedAt
    datetime createdAt
    datetime updatedAt
  }

  items {
    string id PK
    string goodsTypeId FK
    string name
    string imageAssetId FK
    object customValues
    boolean isDeleted
    datetime deletedAt
    datetime createdAt
    datetime updatedAt
  }

  assets {
    string id PK
    blob data
    string mediaType
    number width
    number height
    number byteSize
    datetime createdAt
    datetime updatedAt
  }
```

IndexedDB does not enforce relationships. Domain operations validate references
before opening a write transaction.

## Goods Type

A goods type classifies items and owns field definitions. It does not own a
physical table or object store.

```js
{
  id: "stable-generated-id",
  displayName: "Tapestries",
  description: "Wall scrolls, fabric posters, and related display goods.",
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
}
```

`displayName` may change. `id` must not. Creation order is sufficient for initial
navigation; explicit ordering can be added only when the UI supports reordering.

## Field Definition

Field definitions drive forms, validation, detail labels, and item presentations.
They are records, not physical database columns.

Initial data types:

```text
text
long_text
number
date
boolean
url
select
```

`image` is an internal type used by the protected built-in image field. It is
not offered as a general custom-field type in the first field manager.

Deferred types:

```text
tags
price
rating
image_set
relation
```

`key` is a stable identifier unique within one goods type. `displayName` is
editable. `position` gives forms and details deterministic field order.

Selection fields store stable option identities:

```js
options: {
  choices: [
    { id: "stable-option-id", label: "Owned" }
  ]
}
```

Labels may be renamed and new options may be added. Renaming preserves the
option ID, so existing item values remain valid. Option removal and
identity-changing edits remain deferred until item-value migration rules exist.

Two-option toggle fields store customizable presentation labels while item
values remain booleans:

```js
options: {
  falseLabel: "Uncensored",
  trueLabel: "Censored"
}
```

Older toggle definitions with `options: null` are read as `No / Yes` for
backward compatibility. Two-option fields are required, and new item forms
always write one boolean value. An item
may omit a required field only when it was created before that field existed;
the UI marks such records as incomplete until the missing values are supplied through item editing.

### Built-In Item Fields

| Field | Required | User editable | Deletable |
| --- | --- | --- | --- |
| `id` | Yes | No | No |
| `name` | Yes | Yes | No |
| `image` | Yes | Yes | No |

`createdAt`, `updatedAt`, `isDeleted`, and `deletedAt` are system properties.
Goods-type creation stores all three built-in field records so future renderers
can process built-in and custom fields through one path. The creation operation
sets their protected metadata; field-management operations reject changes that
violate these rules.

## Item And Custom Values

All goods types share the `items` store. `goodsTypeId` determines the applicable
field definitions.

```js
{
  id: "item-id",
  goodsTypeId: "goods-type-id",
  name: "Example item",
  imageAssetId: "asset-id",
  customValues: {
    "field-id-material": "polyester",
    "field-id-release-date": "2026-07-20"
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
}
```

Custom values use stable field IDs as keys. Renaming a field therefore does not
rewrite every item, and restoring a deleted field reveals its previous values.

## Image Asset

Processed images are stored as `Blob` values in asset records. Items store only
`imageAssetId`. This avoids Base64 overhead during ordinary browser use and keeps
image storage replaceable.

Required asset metadata:

- media type
- pixel width and height
- byte size
- creation and update timestamps

Item entry requires a processed low-resolution JPEG. Portrait output is
`560 x 792`; landscape output is `792 x 560`. Source files remain only in the
in-memory draft and are not written to IndexedDB. Legacy items may still have
`imageAssetId: null`; they remain readable for backward compatibility, but new
items cannot be created without an image.

## Soft Deletion

Goods types, field definitions, and items use:

```js
isDeleted: true
deletedAt: "2026-07-20T00:00:00.000Z"
```

The boolean supports filtering. The timestamp supports restoration, retention,
and audit UI. Deleting a goods type leaves dependent fields, items, and assets
recoverable. Permanent purge is a separate destructive operation that must
explicitly traverse dependent records.

Application and repository reads use one explicit lifecycle scope:

- `active` for ordinary browsing and editing
- `deleted` for recovery interfaces
- `all` for integrity checks and complete backup snapshots

Lifecycle transitions preserve every non-lifecycle property. Item deletion and
future restoration therefore retain the same item ID, custom values, creation
timestamp, and `imageAssetId`. Content edits and lifecycle transitions are
separate storage operations.

An asset referenced by a soft-deleted item is retained. Permanent purge must
delete the item and its owned image asset atomically. A future import must
validate every item-to-asset reference and asset metadata before replacing local
data.

## Model Version

The storage-independent domain model currently has version `1`, owned by
`src/data/models/domain-model.js`. This version describes record meaning and is
separate from the IndexedDB schema version and future export-format version.

## Invariants

- IDs and creation timestamps never change after creation.
- `updatedAt` changes with every committed mutation.
- Active items reference an existing, active goods type.
- Custom value keys reference fields belonging to the item's goods type.
- Built-in fields cannot be deleted or redefined as another type.
- Active records have `deletedAt: null`.
- Deleted records have `isDeleted: true` and a deletion timestamp.

Physical storage, versioning, and adapter rules are owned by
[Persistence](persistence.md).
