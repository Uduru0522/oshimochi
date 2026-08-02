# Workflows

This document specifies implemented and planned user workflows. Their data rules
come from [Domain Model](data-model.md), and their transactions follow
[Persistence](persistence.md).

## Create Goods Type

Status: implemented.

1. User opens Administration.
2. User chooses **Add goods type**.
3. User enters a display name and optional description.
4. The form validates required text and duplicate naming guidance.
5. A review step shows the entered type details and explains that protected fields
   are created automatically.
6. Confirmation creates the goods type and built-in field definitions atomically.
7. Navigation refreshes and opens the new goods type.

Display names do not need to be globally unique, but the UI should warn when an
active type already uses the same normalized name. IDs are generated internally.
User mode persists the result in IndexedDB. Debug mode applies the same workflow
to temporary in-memory data that disappears when the page reloads.

## Add Item

Status: generated fields, image cropping, review, atomic persistence, and listing
are implemented.

```mermaid
graph TD
  A["Open the collection Items view"] --> B["Choose Add item"]
  B --> C["Open modal and load goods type and active fields"]
  C --> D["Render empty form and required markers"]
  D --> E["Edit form values"]
  E --> F{"Required image selected?"}
  F -->|No| G["Choose and crop image"]
  G --> H["Keep processed preview in form state"]
  H --> E
  F -->|Yes| I{"Form valid?"}
  I -->|No| E
  I -->|Yes| J["Open review screen"]
  J --> K{"Confirm save?"}
  K -->|No| E
  K -->|Yes| L["Enter shared mutation state"]
  L --> M["Write asset and item in one transaction"]
  M --> N{"Transaction successful?"}
  N -->|Yes| O["Clear draft and show success"]
  N -->|No| P["Keep draft and show recoverable error"]
  O --> Q["Leave mutation state"]
  P --> Q
```

The draft and cropped image stay in UI memory until confirmation. The complete
source image is proportionally contained inside a fixed-height preview stage.
The preview image and crop bounds share the same explicit rendered rectangle,
so the complete source remains visible without horizontal scrolling. The user moves a crop rectangle
directly, changes its size with one slider, and switches its ratio with a
two-state portrait/landscape control. Those controls do not resize the stage.
Allowed crop ratios are portrait `1:sqrt(2)` and horizontal `sqrt(2):1`; the
generated JPEGs use fixed `560 x 792` or `792 x 560` output dimensions regardless
of source size or selected crop size.

Required entry fields use a neutral asterisk. Red warning indicators are
reserved for invalid input and persisted items that are missing required values.

Scheme-less web addresses are normalized to HTTPS and explicit HTTP addresses are
rejected. Two-option toggle fields have user-defined labels and always store
`true` or `false` for newly registered items. An unset value only exists when an
older item predates a newly added required field; the item list marks that
record as incomplete.

The editor applies the same domain validation used by persistence before opening
the review screen. Dates use four-digit years from `0001` through `9999`. Known
save failures show their actionable cause; browser-storage quota failures are
reported explicitly.

Closing the Add item dialog preserves an unfinished draft. **Clear all** uses a
two-click confirmation before discarding it. Closing the post-save success
screen is different: reopening Add item starts with a fresh draft rather than
returning to the previous Add another/Done screen.

Two-option fields are always required. Administration does not expose an
Optional setting for them. Legacy optional two-option definitions may be
upgraded to required without rewriting items; records that lack a value remain
visible with the same incomplete-item warning.

## Filter Items

Status: implemented for list and card presentations.

1. User opens **Filter** from the collection title bar.
2. User may enter a general search and add at most one rule for each active field.
3. Changes remain staged inside the dialog until **Apply filters** is chosen.
4. The item browser evaluates all applied field rules with AND semantics and
   shows the number of active filters in the title-bar action.
5. Clearing and applying filters restores the complete collection without
   reloading storage. The empty-result view also offers an immediate clear action.

Applying or clearing filters reconciles visible entries by item ID. List rows
collapse or expand, while cards scale out or in and the remaining grid reflows.
The complete presentation is not torn down and rebuilt.

Card exits leave grid flow at their current visual coordinates before fading, so
remaining and returning cards can move through one coordinated layout change.
Reordering duration scales with travel distance: nearby entries settle quickly,
while full-grid reversals remain traceable without changing the global fast UI timing.

Newly saved items use the same keyed reconciliation path. A matching item grows
into its collection position without replacing or reloading the existing list.

General search is case-insensitive. Space-separated terms use AND semantics,
quoted text matches a complete phrase, and a leading `-` excludes a term or
quoted phrase. Internal item UUIDs are neither searchable nor exposed as field
filters. Field rules follow their data type: text comparisons, collection-scaled
number sliders, open-ended date ranges, direct multi-choice controls for
two-option and selection-list fields, and URL text or domain matching. Equal
date endpoints mean one exact date. An empty first or second endpoint means no
lower or upper bound respectively.

Numeric sliders distribute distinct observed values evenly by rank rather than
by arithmetic distance. Extreme outliers therefore receive one position without
compressing the ordinary values into an unusable section of the track; selected
positions still resolve to their real inclusive numeric bounds.

Text, number, date, and URL rules can also include records that have no value for
that field. Two-option and selection-list rules need no separate missing-value
control: selecting no choices means missing values only, and selected choices
combine with OR. Image is required and is not exposed as a filter. Different
field rules combine with AND.

Filtering is an in-memory application operation over records already loaded by
the item browser. It is independent from list and card markup, so both consume
the same result set.

## Sort Items

Status: implemented for list and card presentations.

1. User opens **Sort** from the collection title bar.
2. User chooses last update, creation date, item name, or a supported custom field.
3. User chooses ascending or descending order and applies the staged selection.
4. Existing rows move into their new positions without being recreated.

Recently updated is the default order. Missing custom values always remain at
the end in either direction. Text uses case-insensitive natural ordering, while
numbers and dates retain their native order. Two-option and selection-list
fields sort by the labels visible to the user rather than their stored values.

Sorting runs after records are loaded and before filtering is evaluated. Both
presentations consume the same ordered result set.

## Switch Item Presentation

Status: implemented.

1. User chooses the list or card icon in the collection title bar.
2. The item browser retains loaded records and all applied filter and sort state.
3. Only the presentation renderer changes with a short content transition.

List remains the default compact management view. Cards prioritize the complete
processed image and item name. Their square image stage contains either supported
90-degree crop orientation without clipping, so portrait and landscape assets use
the same card geometry. Cards show up to three custom fields and indicate when
additional fields are available. Both presentations expose edit and delete actions
and use keyed updates after item mutations.

## Edit Items

Status: implemented for list and card presentations.

1. User opens an item through its edit icon.
2. The existing generated form is populated from the item and current field definitions.
3. The current image remains selected unless the user explicitly replaces and crops it.
4. User reviews the complete item and applies the changes.
5. The active presentation updates the keyed entry and reevaluates its filter and sort position.

Closing the editor preserves the active draft. **Clear changes** uses a two-click
confirmation and restores the values loaded when editing began. After a successful
save, closing the success screen clears that draft.

Text and custom values update without rewriting the image asset. Replacing the
image writes the new asset and item and removes the superseded asset in one
transaction. A failed transaction retains the review and draft for another attempt.

## Delete Items

Status: implemented for active items in list and card presentations.

1. User chooses the delete icon on an item row.
2. A modal confirmation identifies the item and explains that deletion is recoverable.
3. Confirming enters the shared mutation state and writes deletion timestamps.
4. The item record, custom values, and image asset remain in local storage.
5. After the write succeeds, only the deleted keyed entry leaves the active presentation.

Closing or cancelling the confirmation does not change the item. A failed write
keeps the item visible and presents the actionable storage error for another
attempt. Active filters and sorting are retained while the row is removed.

Restoration and permanent purge controls are separate future work. Until those
controls exist, soft-deleted records are retained but intentionally omitted from
the active collection UI.

## Manage Fields

Status: implemented.

Use **Manage fields** in visible UI. Do not expose terms such as column, object
store, or schema migration to ordinary users.

```mermaid
graph TD
  A["Open Manage fields"] --> B["Choose goods type"]
  B --> C{"Choose action"}
  C -->|Add| D["Configure new field"]
  C -->|Modify| E["Edit supported metadata"]
  C -->|Delete| F["Confirm soft deletion"]
  D --> G["Stage change in memory"]
  E --> G
  F --> G
  G --> H["Review staged changes"]
  H --> I{"Apply changes?"}
  I -->|No| J["Discard staged changes"]
  I -->|Yes| K["Validate complete change set"]
  K --> L{"Valid?"}
  L -->|No| H
  L -->|Yes| M["Enter shared mutation state"]
  M --> N["Apply records in one transaction"]
  N --> O{"Transaction successful?"}
  O -->|Yes| P["Clear staged changes"]
  O -->|No| Q["Keep staged changes and show error"]
  P --> R["Leave mutation state"]
  Q --> R
```

Rules:

- staged changes exist only in memory
- one staged change is allowed per field
- built-in fields cannot be deleted
- `id` and `name` cannot become optional
- deleting a field preserves existing item values
- the complete staged set is validated before opening a transaction

The current UI supports text, long text, number, date, two-option toggle, web-address, and
selection-list fields. Internal keys are generated once and are not exposed to
ordinary users. Selection options receive stable IDs. Existing options may be
renamed or extended, but not removed. Renaming changes only the display label;
stored item values continue to reference the same option ID.

Safe initial modifications:

- rename a display label
- rename a selection-option label without changing its stable ID
- change required to optional
- change field position
- add select options without invalidating existing values

Deferred migrations:

- change field data type
- make a field required while existing values are empty
- change a stable field key
- remove select options used by existing items

## Reset Local Data

Status: implemented.

1. User opens Administration and chooses **Reset local data**.
2. The confirmation view explains which browser-local records will be removed.
3. User types `RESET` exactly.
4. Confirmation enters the shared mutation state and clears goods types, field
   definitions, items, and image assets in one transaction.
5. Navigation remounts in the clean empty state.

The operation does not remove theme settings, cached application files, or any
backup previously exported outside the application.

## Mutation State

```mermaid
stateDiagram-v2
  [*] --> Ready
  Ready --> Busy : mutation starts
  Busy --> Ready : committed
  Busy --> Error : failed or aborted
  Error --> Ready : acknowledged or retried
```

When busy, the application disables conflicting mutations and keeps progress
visible. Harmless reading and navigation remain available when the active flow
can survive navigation safely.
