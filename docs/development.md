# Development Notes

## Running The App

```powershell
npm start
```

Open:

```text
http://localhost:4173
```

Debug mode:

```text
http://localhost:4173?debug=1
```

The app can be opened directly through `index.html`, but the local server is preferred because manifest and service worker behavior are browser-origin dependent.

## Verification

Run the complete static and unit-test suite:

```powershell
npm run check
```

`npm run check` validates JavaScript syntax, browser import reachability,
dependency cycles and layer boundaries, referenced assets, and offline-cache
coverage. It also rejects disabled, focused, duplicate, or accidentally discovered
tests, then runs the dependency-free `node:test` suite in `test/`.

Run the scoped data-layer coverage guard with:

```powershell
npm run test:coverage:data
```

See [Testing Strategy](testing.md) for ownership rules, the meaning of one
behavior per test, known browser-automation gaps, and milestone-specific test
matrices.

After runtime or layout changes, start the server and verify:

- `http://localhost:4173`
- `http://localhost:4173?debug=1`

For persistence changes, create a goods type in each mode and reload:

- user-mode goods types must remain after reload
- debug-mode goods types must return to the fixtures after reload
- successful creation must open the new goods type's Items view
- a duplicate display name may warn but must not be blocked

For field-management changes:

- confirm protected fields have no edit or removal commands
- stage several additions, edits, removals, and order changes before applying
- confirm changing views discards unapplied staging without database writes
- reload after applying and confirm user-mode changes remain
- reload debug mode and confirm field changes return to fixtures

For item-registration changes:

- add values for every supported custom field type and review them before saving
- confirm image selection is required before review
- confirm scheme-less web addresses normalize to HTTPS and HTTP is rejected
- move and resize portrait and landscape crop rectangles, then confirm fixed-resolution thumbnails survive reload
- confirm two-option fields use their configured labels and always produce one boolean value for new items
- confirm Administration reveals the field editor after Add, Edit, and Remove actions
- confirm item URLs open as links and saved two-option values render as read-only selectors
- confirm Add item preserves unfinished drafts, confirms Clear all, and resets after closing the success screen
- confirm dialog controls never trigger background drag scrolling
- test long field names, values, and two-option labels in both entry and list layouts
- confirm required values are enforced after whitespace normalization
- reload user mode and confirm saved items remain
- reload debug mode and confirm created items disappear
- confirm a failed save retains the item draft

For item-browser presentation changes:

- choose a goods type and confirm it opens Items directly
- open Collection overview from the title-bar information action, confirm the
  goods type stays highlighted, then return through the arrow in the same position
- confirm cards are selected on first opening a collection and List remains selectable
- switch between list and cards with portrait and landscape fixtures; every thumbnail must remain fully visible in a square media region
- apply text search and several field filters; cards must prioritize matching fields without changing their fixed field limit
- filter, clear, sort, add, edit, and delete while scrolled; retained entries must move from their previous positions instead of being rebuilt
- confirm card filtering completes exits before grid movement and movement before entrances
- verify the item toolbar remains aligned in its full and compact title-bar states

For lifecycle and persistence changes:

- use `RECORD_SCOPES.active`, `RECORD_SCOPES.deleted`, or `RECORD_SCOPES.all`;
  do not introduce `includeDeleted` booleans
- keep editable item writes in `updateItemContent` and deletion/restoration in
  `updateItemLifecycle`
- confirm soft deletion and restoration do not rewrite or remove the image asset
- confirm permanent purge removes the item and owned image in one transaction
- exercise equivalent behavior through both `IndexedDbStorage` and `DebugStorage`

For future backup transfer changes:

- map storage records into a storage-neutral snapshot outside view modules
- export complete scopes, including soft-deleted records and retained assets
- validate the complete import and all relationships before opening a transaction
- keep the original database unchanged on parse, validation, or write failure
- test unsupported versions, duplicate IDs, broken references, and malformed assets

## Browser Storage

Settings are stored in browser `localStorage`, not in project files.

Current keys:

```text
wotagoods.language
wotagoods.theme
```

Expected values:

```text
en
ja
zh-Hant
light
dark
```

In DevTools Console:

```js
localStorage.getItem("wotagoods.language")
localStorage.removeItem("wotagoods.language")
localStorage.getItem("wotagoods.theme")
localStorage.removeItem("wotagoods.theme")
```

Collection data uses IndexedDB, not `localStorage`. User mode persists goods-type
creation in the browser database. Debug mode uses a separate writable in-memory
adapter and never opens or writes the user database.

Browser storage is origin-specific. These locations do not share settings or
IndexedDB data:

```text
http://localhost:4173/
https://uduru0522.github.io/wotagoods-manager/
```

Use versioned export/import to move a collection between origins, browsers, or
devices. Do not inspect or mutate IndexedDB directly from view modules.

## Adding A View

1. Add the definition in `src/views/view-definitions.js`.
2. Choose a `renderer` key.
3. If needed, add that renderer in `src/views/view-renderer.js`.
4. Add navigation metadata if it should appear in primary or utility navigation.

Keep route/view IDs stable. They are used by navigation state and router state.
Secondary routes that should keep a primary destination highlighted must declare
that destination as `navigationId`. Pass route IDs through view definitions and
renderer callbacks; do not parse route strings inside components.
Goods-type route IDs are constructed by
`src/views/goods-types/goods-type-view-ids.js`; use those helpers when opening a
collection after an app-level operation.

## Adding A Goods Type For Debug Mode

Edit the fixture definitions in `src/data/debug/debug-fixtures.js`. The default
catalog intentionally covers every supported custom field type, optional and
missing required values, configurable toggles, and both image orientations. Its
Tapestries collection contains at least 20 items with repeated and distinct
values specifically for filtering, sorting, list/card rendering, and keyed
membership-motion tests.

Use stable IDs and domain-facing property names:

```js
{
  id: "example_goods",
  displayName: "Example goods",
  description: "Short description."
}
```

Keep fixture IDs stable. The catalog derives item and asset records from one
entry so their identities cannot drift apart. Construct records through the
domain model factories so invalid fixture data fails during startup and in
automated tests. Extend the catalog-coverage test when adding a new test purpose.

This is only debug data. `DebugStorage` clones these records and never writes them
to the user database. Supplying custom goods types to `createDebugStorage()` also
disables the default item and asset catalog unless those records are supplied
explicitly.

## Theme Rules

Theme constants live in `src/app/config.js`.

Runtime theme changes are handled by `src/services/theme.js`.

First-paint theme is handled by `src/bootstrap/theme-bootstrap.js`. Keep that bootstrap file small and synchronous.

## Language Rules

Language constants live in `src/app/config.js`. Runtime persistence and document
metadata are owned by `src/services/language.js`; first-paint `lang` selection is
handled by `src/bootstrap/language-bootstrap.js`.

Interface copy must pass through `translate()` in browser-facing composition
modules. Do not translate user-defined collection, field, option, or item values.
English source copy is the fallback, and parameterized copy uses named
placeholders such as `{name}`. Keep both non-English catalogs synchronized and
add tests when introducing locale normalization or interpolation behavior.

After copy or layout changes, switch among English, Japanese, and Traditional
Chinese in Options and check navigation, Administration, dialogs, filter/sort
controls, long labels, and narrow mode. Reload once in each language to verify
that `wotagoods.language` applies before the app mounts.

## CSS Rules

Main CSS lives in `src/styles/app.css`.

Prefer editing existing tokens before adding new hardcoded values. Important token groups:

- theme colors
- focus and accent tint colors
- scrollbar sizing
- navigation spacing
- motion timing

Keep interface motion subtle and at or below `200ms`. Use the shared
`--motion-phase`, `--motion-fast`, `--motion-enter`, and `--motion-layout` tokens
instead of component-specific durations. The static verification script enforces
this ceiling. New animation must also remain usable with the existing
`prefers-reduced-motion` override.

Stateful workflows should use `src/shared/content-transition.js`. One `--motion-phase`
is used before replacement and one after it, so their combined duration must remain
within the same `200ms` ceiling.

Rendered views that allocate browser resources should return `destroy()` from
their renderer result. Cancel pending transitions and loads, disconnect
observers, close dialogs, and revoke object URLs during teardown.

JavaScript fallbacks for CSS timing belong in `src/shared/motion.js`. Text action
buttons should use `src/shared/action-button.js` so default type and class behavior
remain consistent.

Responsive behavior currently has one app-shell breakpoint at `1100px`, matching `APP_CONFIG.layout.narrowQuery`. Item rows also use a container query so their presentation follows the available workspace width rather than the viewport alone.

Collection loading and active item presentation belong in
`src/views/items/item-browser.js`. Keep list-only markup in `item-list.js` and
card collection reconciliation in `item-cards.js`. Keep one-card body rendering
in `item-card-content.js` and pure field prioritization in `item-card-context.js`;
place field/value interpretation in the shared item display helpers so
presentations do not duplicate it. Filtering and sorting produce one prepared
item set before the active renderer receives it.
Presentation switching replaces only the renderer and retains applied query state.

## Dependency Rules

- `src/shared/` may only import other shared modules.
- `src/data/` may only import data modules.
- `src/application/` may import application and data modules.
- Browser composition folders may combine these layers, but circular imports are
  rejected everywhere.

These constraints are enforced by `scripts/verify-static.js`.

Browser views receive operations from
`src/application/create-application-operations.js`. Register new application
capabilities there instead of importing feature operations individually in
`app-runtime.js` or calling storage adapters from views.

## Drag Scrolling

Shared pointer drag behavior lives in `src/shared/drag-scroll.js`.

Current users:

- main view panel vertical scrolling
- wide navigation vertical scrolling
- narrow navigation horizontal scrolling
- schema table horizontal scrolling

Use the shared helper for new draggable scroll areas instead of adding local pointer logic.

Narrow navigation also uses `src/navigation/scrollable-row.js` for wheel-to-horizontal scrolling and right-edge scroll hints.

## Service Worker Updates

When moving or adding app files that must work offline:

1. Add the path to `service-worker.js`.
2. Bump `CACHE_NAME`.
3. Verify the moved file is served by the local server.

Docs are not currently cached by the service worker.

The worker checks for updates without the browser HTTP cache. It activates new
assets without automatically reloading an open page, so use a hard refresh when
validating a freshly deployed version.

## Related Design Documents

- `docs/data-model.md`: domain records and invariants
- `docs/persistence.md`: adapters, physical schema, and transaction rules
- `docs/workflows.md`: implemented and planned mutation UX
- `docs/data-portability.md`: export, import, and cloud snapshots
- `docs/roadmap.md`: current and upcoming milestones
