# Development Notes

## Run The App

Use Node.js 24 or newer.

```powershell
npm start
```

Open:

```text
User mode:  http://localhost:4173/
Debug mode: http://localhost:4173/?debug=1
```

Use the local server instead of opening `index.html` directly. The manifest,
service worker, and browser storage depend on an HTTP origin.

To test the GitHub Pages path:

```powershell
npm run start:pages
```

Open:

```text
http://localhost:4173/wotagoods-manager/
http://localhost:4173/wotagoods-manager/?debug=1
```

## Automated Verification

Run the full check:

```powershell
npm run check
```

It checks source syntax, import rules, cycles, runtime assets, offline coverage,
test hygiene, and the complete `node:test` suite.

Run the data-layer coverage guard separately:

```powershell
npm run test:coverage:data
```

See [Testing](testing.md) for test ownership and design rules.

## Manual Browser Checks

Choose the groups affected by the change. Test user and debug mode when storage
or mutation behavior changes.

### Startup And Storage

- Reload user mode and confirm saved data remains.
- Reload debug mode and confirm it returns to fixtures.
- Confirm storage failures show a retry action, not an empty collection.
- Confirm localhost and the hosted app keep separate data.

### Shell And Navigation

- In wide mode, confirm Administration, Options, and GitHub stay at the bottom.
- In narrow mode, confirm More reveals those same controls and closes on Escape
  or an outside press.
- Change theme, accent color, and language, then reload to confirm each persists.

### Goods Types And Fields

- Create a goods type and confirm Items opens after save.
- Stage add, edit, remove, and order changes before applying.
- Confirm protected fields have no edit or remove action.
- Leave the view and confirm unapplied field changes are discarded.
- Reload and confirm only user-mode changes persist.

### Item Forms

- Enter every supported field type and review the values.
- Confirm image selection is required.
- Move and resize both crop orientations and check the saved image.
- Confirm scheme-less URLs become HTTPS and HTTP URLs are rejected.
- Confirm long labels and values do not create horizontal overflow.
- Close, reopen, clear, save, and retry a failed draft.

### Item Browser

- Confirm a collection opens Items and the information action opens Overview.
- Switch between card and list views with both image orientations.
- Apply and clear several filters and sort orders.
- Confirm retained entries move from their old positions.
- Confirm card exits finish before movement, then entrances begin.
- Confirm the action toolbar stays fixed in size and aligned while scrolling.

### Item Lifecycle

- Soft-delete an item and confirm its image stays available.
- Restore it and confirm values, identity, and image are unchanged.
- Purge a deleted item and confirm both item and image are removed.
- Confirm active filters and sorting remain after each change.
- Check empty, failure, cancel, and confirmation states.

### Backup And Restore

- Export user data and confirm one `.json.gz` file downloads.
- Restore that file and confirm collections, deleted items, and images return.
- Select an invalid file and confirm existing data does not change.
- Enter a personal OAuth client ID, API key, and project number. Confirm they
  survive reload.
- Connect Drive and select a destination folder through Google Picker.
- Upload and restore a snapshot from the selected folder.
- Confirm cancelling Google consent leaves local data unchanged.
- Confirm disconnect hides cloud actions but keeps local file actions available.
- Change the destination and confirm new backups use the new folder.
- Remove Drive setup and confirm all Google setup and folder data is cleared.
- Cancel from the review state and confirm no write occurs.
- Check the workflow in narrow and wide layouts and all interface languages.

## Browser Storage

Interface settings use `localStorage`:

| Key | Values |
| --- | --- |
| `wotagoods.language` | `en`, `ja`, `zh-Hant` |
| `wotagoods.theme` | `light`, `dark` |
| `wotagoods.accent` | `red`, `orange`, `yellow`, `blue`, `green`, `pink`, `purple` |
| `wotagoods.google-drive-client-id` | Personal Web OAuth client ID |
| `wotagoods.google-drive-api-key` | Restricted browser API key |
| `wotagoods.google-drive-project-number` | Google Cloud project number |
| `wotagoods.google-drive-destination` | Selected folder ID and name |

Useful console commands:

```js
localStorage.getItem("wotagoods.language")
localStorage.removeItem("wotagoods.language")
localStorage.getItem("wotagoods.theme")
localStorage.removeItem("wotagoods.theme")
localStorage.getItem("wotagoods.accent")
localStorage.removeItem("wotagoods.accent")
localStorage.getItem("wotagoods.google-drive-client-id")
localStorage.removeItem("wotagoods.google-drive-client-id")
localStorage.getItem("wotagoods.google-drive-api-key")
localStorage.removeItem("wotagoods.google-drive-api-key")
localStorage.getItem("wotagoods.google-drive-project-number")
localStorage.removeItem("wotagoods.google-drive-project-number")
localStorage.getItem("wotagoods.google-drive-destination")
localStorage.removeItem("wotagoods.google-drive-destination")
```

Collection data uses IndexedDB. Debug mode uses a separate in-memory adapter and
does not open the user database.

Browser storage is origin-specific. Localhost and GitHub Pages do not share
settings or collection data.

## Common Changes

### Add A View

1. Add its definition to `src/views/view-definitions.js`.
2. Choose a renderer key.
3. Register the renderer in `src/views/view-renderer.js`.
4. Add navigation metadata only when the route belongs in navigation.

Keep route IDs stable. A secondary route uses `navigationId` to keep its
primary route highlighted.

Use `src/views/goods-types/goods-type-view-ids.js` for collection route IDs.
Do not parse route strings inside components.

### Edit Debug Fixtures

Edit sample records in `src/data/debug/debug-fixture-data.js`.
`debug-fixtures.js` turns those definitions into validated records and image
assets.

The default catalog covers:

- every custom field type
- optional and missing required values
- custom two-option labels
- portrait and landscape images
- at least 20 Tapestries items for query and layout checks

Keep fixture IDs stable. Build records through domain factories so invalid
fixtures fail during startup and tests.

`DebugStorage` clones fixture records. Changes never reach the user database.

### Change Theme Or Language

Theme ownership:

| Concern | Owner |
| --- | --- |
| Constants | `src/app/config.js` |
| Runtime changes | `src/services/theme.js` |
| First paint | `src/bootstrap/theme-bootstrap.js` |
| Controls | `src/views/options/options-view.js` |
| Palette tokens | `src/styles/foundation.css` |

Language ownership:

| Concern | Owner |
| --- | --- |
| Constants | `src/app/config.js` |
| Runtime and document metadata | `src/services/language.js` |
| First paint | `src/bootstrap/language-bootstrap.js` |
| Catalogs and fallback | `src/localization/` |

Translate interface copy with `translate()`. Never translate user data.

Keep the Japanese and Traditional Chinese catalogs in sync. After copy changes,
check all three languages in wide and narrow layouts.

### Change Styles Or Motion

`src/styles/app.css` only imports owned style files:

| File | Use |
| --- | --- |
| `foundation.css` | Tokens, shell, navigation, and shared UI |
| `items.css` | Item browsing and item dialogs |
| `administration.css` | Administration and Options |
| `responsive.css` | Narrow layout and reduced motion |

Preserve this import order. Add every new runtime stylesheet to
`service-worker.js`.

Prefer tokens over hardcoded values. Keep motion at or below 200 ms and use the
shared timing tokens.

Use `content-transition.js` for stateful workflow replacement. Use
`motion.js` when JavaScript needs a CSS timing value.

The shell breakpoint is `1100px`. Item rows also use a container query so they
follow workspace width.

### Change Item Presentations

`item-browser.js` owns loading, query state, and presentation choice.

| Concern | Owner |
| --- | --- |
| List markup | `item-list.js` |
| Card collection | `item-cards.js` |
| One card body | `item-card-content.js` |
| Card field choice | `item-card-context.js` |
| Shared value display | Item display and formatting helpers |
| Reordering | Keyed layout motion helpers |

Filtering and sorting prepare one item set before rendering. Switching
presentation must keep query state.

### Change Dependencies

The allowed import matrix is documented in
[Architecture](architecture.md#dependency-direction) and enforced by
`scripts/verify-static.js`.

Views call application operations. They do not import storage adapters.
Shared helpers do not import product features.

Register browser-facing operations in
`src/application/create-application-operations.js`.

### Add Drag Scrolling

Use `src/shared/drag-scroll.js` for pointer dragging.

Current scroll areas are:

- wide and narrow navigation
- schema table

Narrow navigation also uses `scrollable-row.js` for wheel scrolling and the
right-edge hint.

### Update Offline Assets

When a runtime file moves or is added:

1. update `service-worker.js`
2. bump `CACHE_NAME`
3. run `npm run check`
4. load the changed path through the local server

The worker activates new assets without reloading an open page. Use a hard
refresh when checking a new deployment.

## Related Documents

### Current Implementation

- [Architecture](architecture.md)
- [Domain Model](data-model.md)
- [Persistence](persistence.md)
- [Workflows](workflows.md)
- [Testing](testing.md)

### Planning

- [Roadmap](roadmap.md)
- [Data Portability](data-portability.md)
