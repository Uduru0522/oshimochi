# Domain Model

This document defines the records and invariants used by the current app.
User actions are covered in [Workflows](workflows.md). Physical storage is
covered in [Persistence](persistence.md).

## Core Rules

- One physical schema stores every goods type.
- Field definitions are records, not database columns.
- IDs are stable and do not come from editable labels.
- Built-in item fields have fixed meaning.
- Soft-deleted items keep their values and image until purge.
- Domain records do not depend on IndexedDB or the UI.

## Naming

| Kind | Rule |
| --- | --- |
| JavaScript properties | `camelCase` |
| Stores and indexes | lowercase `snake_case` |
| IDs | opaque stable strings |
| User labels | unrestricted normal text |

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

IndexedDB does not enforce these links. Domain operations validate records before
opening a write transaction.

## Goods Types

A goods type classifies items and owns field definitions. It does not create a
new object store.

```js
{
  id: "stable-generated-id",
  displayName: "Tapestries",
  description: "Wall scrolls and related display goods.",
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z"
}
```

`displayName` may change. `id` must not change.

## Field Definitions

Field definitions drive forms, validation, labels, filters, sorting, and item
presentations.

### Supported Types

| Type | Stored value |
| --- | --- |
| `text` | short string |
| `long_text` | multiline string |
| `number` | finite number |
| `date` | calendar date string |
| `boolean` | `true` or `false` |
| `url` | HTTPS address |
| `select` | stable option ID |

`image` is used only by the protected built-in image field.

### Stable Identity

`key` is unique inside one goods type. `displayName` is editable.
`position` controls form and display order.

Selection choices have stable IDs:

```js
options: {
  choices: [
    { id: "stable-option-id", label: "Owned" }
  ]
}
```

Choice labels may change. New choices may be added. Stored item values keep the
same choice ID.

Two-option fields store booleans and define labels for both states:

```js
options: {
  falseLabel: "Uncensored",
  trueLabel: "Censored"
}
```

Definitions with `options: null` use `No` and `Yes`. Two-option fields are
required. Older items may lack a value when the field was added after the item;
the UI marks those items as incomplete.

### Built-In Fields

| Field | Required | Editable value | Removable |
| --- | --- | --- | --- |
| `id` | Yes | No | No |
| `name` | Yes | Yes | No |
| `image` | Yes | Yes | No |

`createdAt`, `updatedAt`, `isDeleted`, and `deletedAt` are system
properties.

Goods-type creation writes all three built-in field definitions. Field
management rejects changes that break their protected rules.

## Items

All goods types share the `items` store. `goodsTypeId` selects the matching
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

Custom values use field IDs as keys. Renaming or soft-deleting a field does not
rewrite its item values.

## Image Assets

Processed images are stored as `Blob` values. Items keep only
`imageAssetId`.

Each asset stores:

- media type
- width and height
- byte size
- creation and update timestamps

New items require one processed JPEG:

| Orientation | Output size |
| --- | --- |
| Portrait | `560 x 792` |
| Landscape | `792 x 560` |

The source file stays in the form draft and is not persisted. Older records with
`imageAssetId: null` remain readable.

## Dashboard Cards

Saved cards are catalog records defined by `dashboard-card.js`. Each has a stable
`id`, a unique non-negative `position`, and creation and update timestamps.
Summary cards also have a `title` and one calculation: `count`, `sum`, `average`,
`minimum`, or `maximum`. Removing a summary card removes its configuration
permanently; summary cards have no soft-delete state.

The built-in Recent items card uses `type: "recent-items"` and a boolean
`visible`, without calculation fields or a stored title. At most one such record
is allowed. Keeping a hidden record preserves the decision to hide it across
reloads and backups. Visibility and ordering share the summary-card storage and
snapshot transaction. Without a saved record, the view shows the default card
without writing to storage. Its first configuration change saves an explicit
record with the other cards. See [My collection workflows](workflows.md#my-collection).

Each source selects one collection by `goodsTypeId`. Numeric calculations also
select one `fieldId` per source. Count cards have no numeric field. Saved sources
remember collection and field names, and selection filters remember choice
labels. Calculations use IDs; remembered names identify references that later
become unavailable. Stale references remain valid card records and produce an
unavailable-reference result instead of a partial total.

Sources contain their own search query and typed field rules. Rules support the
item browser's text, number, date, two-option, and selection conditions. A date
rule stores either an absolute range or `datePreset: "this-year"`, resolved when
the card is read. `includeDeleted` defaults to `false` for the whole card.

`groupBy` defaults to `{ type: "collection" }`. Sum and count cards may instead
use `{ type: "field", fields: [...] }`, mapping one selection or two-option
field to each selected collection. Mappings remember field names, choice IDs
and labels, or the two boolean labels. Group identity uses the collection,
field, and stable choice ID (or boolean value), so label renames preserve it.
Choices from independent collections remain distinct. Missing category values
form an Uncategorized group; `false` remains a real category. Grouping changes
the breakdown, not the total or the card's filters.

`displayMode` defaults to `"auto"`; `"number"` and `"ring"` are explicit display
preferences saved with the card and included in backups. Ring mode applies only
to sums and counts. The automatic mode lets the view omit a ring when there is
only one contributing category.

`format` stores either `{ type: "number", currency: null }` or
`{ type: "currency", currency: "JPY" }`. Currency uses a three-letter uppercase
code and changes presentation only; it does not convert values. Count cards use
number formatting. Number formats may also carry
`unit: { symbol: "kg", position: "suffix" }` (or `"prefix"`). Symbols are
user-defined text of up to 32 characters and change presentation only. Units are
preserved in card storage and backups; they do not convert quantities.

## Lifecycle

Lifecycle records use:

```js
{
  isDeleted: true,
  deletedAt: "2026-07-20T00:00:00.000Z"
}
```

Repository reads always request one scope:

| Scope | Use |
| --- | --- |
| `active` | Normal browsing and editing |
| `deleted` | Recovery views |
| `all` | Complete integrity checks |

Deletion and restoration change only lifecycle properties. IDs, values, creation
timestamps, and image references stay unchanged.

An image used by a deleted item is retained. Permanent purge removes the deleted
item and its image in one transaction.

## Versions

The domain-model version is `2`. It is defined in
`src/data/models/domain-model.js`.

The domain-model version describes record meaning. The IndexedDB version
describes physical stores and indexes. They are separate values.

## Invariants

### Identity

- IDs and creation timestamps never change.
- `updatedAt` changes with each committed mutation.

### Relationships

- An active item belongs to an existing active goods type.
- Each custom value refers to a field from that goods type.
- An item image reference points to its owned asset.

### Fields

- Built-in fields cannot be removed or assigned another type.
- Field and selection-option IDs stay stable when labels change.

### Lifecycle

- Active records use `deletedAt: null`.
- Deleted records use `isDeleted: true` and a deletion timestamp.
- Item lifecycle changes do not alter item content.
