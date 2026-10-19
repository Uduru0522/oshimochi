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

The root and `/oshimochi/` paths on the same host and port share browser data
and settings. A path change does not create a separate test catalog; see
[browser settings](persistence.md#browser-settings).

The server serves updated files but does not reload an open page automatically.
Refresh the preview after edits.

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
assets. `debug-dashboard-fixtures.js` creates the default cards from those
collections and fields.

The default catalog covers:

- every custom field type
- optional and missing required values
- custom two-option labels
- portrait and landscape images
- at least 20 Tapestries items for query and layout checks
- purchase prices across all three collections, including zero and missing prices
- purchases in the current and earlier years, with dates relative to startup
- mixed-collection Recent items, with an older item edited today to check ordering

Debug mode opens with Recent items and six editable summary cards: Total spent,
Collection mix, Spent this year, Tapestry condition, Average figure price, and
Tapestries on display. They cover collection and category rings, date and
two-option filters, number-only cards, and fractional averages. All sample
purchase prices use yen; the figure collection deliberately calls its price
field Paid price to exercise selecting different fields across collections.

Refreshing debug mode restores the sample cards and items. When constructing a
focused test catalog, explicit data overrides suppress unrelated default cards;
pass `dashboardCards: []` for an empty dashboard. A `now` option can anchor the
relative fixture dates in tests.

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

### Change The Branding

The visible wordmark is `オシもち。` in every interface language, with no
subtitle. `icons/oshimochi-wordmark.svg` contains vector paths derived from
M PLUS 1p Black (900), with fuller strokes, softened corners, and flat ends.
The app loads this small local SVG, not a font. The heading provides the same
Japanese text for assistive technology; the SVG itself is decorative.

Wordmark source and adjustments:

- [M PLUS 1p](https://fonts.google.com/specimen/M+PLUS+1p), copyright
  2016 The M+ Project Authors, licensed under the
  [SIL Open Font License 1.1](../icons/wordmark-OFL.txt).
- Source: [MPLUS1p-Black.ttf](https://raw.githubusercontent.com/google/fonts/main/ofl/mplus1p/MPLUS1p-Black.ttf)
  from Google Fonts.
- Source SHA-256:
  `815821a62ce085e453af318ca004768e336329d5a7d6f7bed272e97e7862d43e`.
- Native glyphs scaled uniformly by `0.21`, centered in 200-unit character
  cells at baseline `178`. Outlines expand by 5 design units, then corners
  soften at radius 7. Each character remains a separate named SVG group.
- For optical balance, `シ`'s long stroke moves 8 units left and 4 units up;
  `ち`'s upper bar shortens by 15 units at its right end. Its left end stays
  in place.
- The custom `。` follows the selected app accent in both themes and keeps a
  full 200-unit character cell with 3 extra units of spacing. The sidebar
  displays the SVG at up to 180 pixels wide, 3 pixels from the mascot.
- The SVG metadata records the chosen adjustment settings, including blue as
  the standalone preview color. App accent preferences override that fallback.

Authoring used FontTools 4.67.0 and Shapely 2.2.0; neither is an application
dependency. Edit the SVG as artwork. The [OFL FAQ](https://openfontlicense.org/ofl-faq/)
permits logos made from font outlines without imposing the font license on
the resulting artwork or app. The source credit and license are retained for
provenance. Normal UI fonts and technical application names remain independent
of the wordmark.

See [Design Philosophy](design.md) for how My collection and the shared shell
carry the wordmark's weight, soft corners, and accent into the interface.
Keep the mochi and tapestry white in both themes.

`icons/oshimochi-themeable.svg` is the shared mochi-and-tapestry geometry for
the sidebar, favicon, and installed app. The sidebar references its
`oshimochi-mark` root with an inline SVG `use`. The `.brand-mark` rule in
`src/styles/foundation.css` supplies colors through CSS custom properties so
the mark follows the selected accent. It is decorative because the adjacent
heading already names the app.

The favicon and manifest reference the SVG directly and use its fixed blue
palette. The manifest declares a scalable ordinary icon, not a maskable or
theme-changing launcher icon.

Both branding SVGs belong to the service-worker asset list. Follow
[offline asset updates](#update-offline-assets) and the
[brand icon checklist](testing.md#brand-icon) when changing them.

### Change Styles Or Motion

Follow [Design Philosophy](design.md) when adapting another view to the
collection-desk style.

1. Find the owning stylesheet and shared timing token in
   [Architecture](architecture.md#styles). Preserve the import order in
   `src/styles/app.css`.
2. Reuse semantic tokens and existing motion helpers. New runtime stylesheets
   must be included in the [offline asset list](#update-offline-assets).
3. Check the affected view in both themes, all languages, narrow layouts, and
   reduced motion using [Testing](testing.md#manual-browser-checks).

For dashboard changes, preserve the measurement and cleanup boundaries in
[My collection architecture](architecture.md#my-collection). Verify long values
with different system fonts, stable unit placement, and scrolled layouts during
window resizing and focus changes.

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

Wide navigation reserves a stable native scrollbar gutter so height changes
do not resize its category tabs when the list starts overflowing. Narrow
navigation removes that gutter for its horizontal layout.

The page and card editor use `overlay-scrollbar.js`. Native scrolling handles
wheel, touch, and content focus; a draggable scrollbar overlays the right edge
without reserving content width. It appears while scrolling, approaching the
edge, or using its keyboard controls, and otherwise hides. The helper owns its
wrapper, observers, and cleanup.

### Update Offline Assets

Whenever a cached runtime file changes:

1. update the asset list in `service-worker.js` if files were added, moved,
   or removed
2. bump `CACHE_NAME`
3. run `npm run check`
4. load the changed path through the local server

The worker activates new assets without reloading an open page. Use a hard
refresh when checking a new deployment.
