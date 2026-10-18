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

Stop the root-path server with `Ctrl+C` before starting the GitHub Pages path:

```powershell
npm run start:pages
```

Open:

```text
http://localhost:4173/oshimochi/
http://localhost:4173/oshimochi/?debug=1
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`.

## Verification And Review

Use [Testing](testing.md) for automated commands and manual browser checklists.
Follow [AGENTS.md](../AGENTS.md#local-review-before-commits) for local review
before committing app changes. Storage keys and origin behavior are documented
in [Persistence](persistence.md#browser-settings).

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

### Change The Brand Icon

`icons/oshimochi-themeable.svg` is the shared mochi-and-tapestry geometry for
the sidebar, favicon, and installed app. The sidebar references its
`oshimochi-mark` root with an inline SVG `use`. The `.brand-mark` rule in
`src/styles/foundation.css` supplies colors through CSS custom properties so
the mark follows the selected accent. It is decorative because the adjacent
heading already names the app.

The favicon and manifest reference the SVG directly and use its fixed blue
palette. The manifest declares a scalable ordinary icon, not a maskable or
theme-changing launcher icon.

The SVG belongs to the service-worker asset list. Follow
[offline asset updates](#update-offline-assets) and the
[brand icon checklist](testing.md#brand-icon) when changing it.

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
