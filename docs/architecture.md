# Architecture

Wotagoods Manager is a dependency-free browser app. Its main boundaries are the
app shell, storage-neutral operations, domain and storage code, and browser
views.

## Runtime Flow

1. `index.html` runs the language and appearance bootstrap scripts before CSS.
2. `src/styles/app.css` imports the style layers in cascade order.
3. `src/main.js` creates the app shell.
4. The shell selects user or debug mode and creates shared services.
5. The startup coordinator initializes storage and loads goods types.
6. The runtime creates views, navigation, and the router.
7. A storage failure shows a retryable error instead of an empty collection.

After a successful data change, the startup coordinator reloads goods types and
rebuilds data-based navigation. It does not reopen the database.

## Code Ownership

### Shell And Browser Services

| Area | Responsibility |
| --- | --- |
| `src/bootstrap/` | Apply saved language, theme, and accent before first paint |
| `src/app/` | Compose the app, start storage, route views, and manage global UI state |
| `src/services/` | Wrap browser language, theme, localStorage, and service-worker APIs |
| `src/main.js` | Start the composition root |

Important app modules are grouped by task:

- **Startup:** `app-shell.js`, `startup-coordinator.js`, and
  `startup-state.js`
- **Runtime assembly:** `app-runtime.js`, `app-elements.js`, and
  `create-application-operations.js`
- **Navigation state:** `view-router.js` and `layout-transition.js`
- **Shared state:** `mutation-controller.js`, `app-mode.js`, and `config.js`

The bootstrap scripts repeat a small part of the runtime language and theme
services. They must run synchronously, so normal modules cannot replace them.

### Domain And Storage

| Area | Responsibility |
| --- | --- |
| `src/application/` | Coordinate use cases without browser storage or DOM details |
| `src/data/models/` | Build and validate domain records |
| `src/data/contracts/` | Define adapter capabilities and stable storage errors |
| `src/data/indexeddb/` | Own the physical database, repositories, and transactions |
| `src/data/debug/` | Provide validated in-memory fixtures and repositories |
| `src/data/create-storage.js` | Select the adapter for the active mode |

Application operations are grouped by feature:

- **Goods types:** create one type and its protected fields atomically.
- **Fields:** validate and apply one staged field change set.
- **Items:** validate values, filter, sort, save content, and change lifecycle.
- **Local data:** reset all user collection stores atomically.

Application code may use domain models and storage contracts. It must not use
DOM elements, IndexedDB requests, or object-store names.

User mode uses `IndexedDbStorage`. Debug mode uses `DebugStorage`, starts from
sample records, and loses changes on reload. It never opens IndexedDB.

### Interface

| Area | Responsibility |
| --- | --- |
| `src/views/` | Define routes and render feature UI |
| `src/navigation/` | Render primary and utility navigation |
| `src/localization/` | Normalize locales and translate interface copy |
| `src/shared/` | Provide product-neutral DOM and interaction helpers |

The view layer is split by product area:

- **Administration:** goods-type creation, field management, and local-data
  reset
- **Goods types:** collection overview and the matching view toolbar action
- **Items:** browsing, filtering, sorting, registration, editing, deletion, and
  recovery
- **Options:** theme, accent color, and interface language preferences

The item area has smaller ownership groups:

| Group | Main modules |
| --- | --- |
| Loading and query state | `item-browser.js`, application filter and sort operations |
| Presentations | `item-list.js`, `item-cards.js`, `item-card-content.js` |
| Layout motion | `keyed-layout-motion.js`, `item-card-motion.js` |
| Entry and editing | Entry/edit dialogs, form fields, review, crop editor |
| Lifecycle | Delete and recovery dialogs |
| Display helpers | Values, thumbnails, warnings, and card field selection |

List and card presentations receive the same prepared item set. They reconcile
entries by item ID instead of replacing the full collection.

Dialogs share `dialog-close-controller.js` for close timing and cancellation.
Stateful content uses `content-transition.js`. Scroll surfaces use
`drag-scroll.js`.

Interface text passes through `translate()`. User-entered names and values are
data and are never translated.

### Styles

`src/styles/app.css` is an import-only entrypoint. Its import order defines the
cascade.

| File | Ownership |
| --- | --- |
| `foundation.css` | Tokens, themes, shell, navigation, and shared controls |
| `items.css` | Item browser, dialogs, filtering, sorting, and recovery |
| `administration.css` | Administration and Options |
| `responsive.css` | Narrow layout and reduced-motion overrides |

Common timing tokens keep interaction motion below 200 ms:

- `--motion-phase` for workflow content replacement
- `--motion-fast` for small state changes
- `--motion-enter` for entry feedback
- `--motion-layout` for shell layout changes
- `--item-card-*-duration` for ordered card membership changes
- `--item-layout-*` for item reordering

The UI uses local Noto Sans and platform CJK font stacks. No font is fetched from
a third-party host.

## Dependency Direction

`scripts/verify-static.js` builds the browser module graph. It rejects cycles,
unreachable modules, and imports that break this matrix:

| Source layer | Allowed direct dependencies |
| --- | --- |
| Root `src/main.js` | `app` |
| `bootstrap` | `bootstrap` |
| `shared` | `shared` |
| `data` | `data` |
| `application` | `application`, `data` |
| `localization` | `localization` |
| `views` | `views`, `application`, `localization`, `shared` |
| `navigation` | `navigation`, `views`, `localization`, `shared` |
| `services` | `services`, `app`, `localization` |
| `app` | All runtime layers except `bootstrap` |

Bootstrap scripts load before the module graph and stay isolated from it.

## Views And Routes

Each view definition contains an ID, title metadata, renderer key, and optional
navigation metadata.

Primary destinations use:

```js
nav: { group: "primary" }
```

A collection's Items route also declares its kind:

```js
nav: { group: "primary", kind: "goods-type" }
```

The secondary Overview route has no navigation entry. It points back to Items
for highlighting and return navigation:

```js
{
  id: `goods:${goodsType.id}:overview`,
  navigationId: `goods:${goodsType.id}`,
  itemsViewId: `goods:${goodsType.id}`
}
```

The Items definition carries the matching `overviewViewId`. Renderers receive
these route IDs and do not parse route strings.

Administration and Options use:

```js
nav: { group: "utility" }
```

Wide layouts show the utility routes and GitHub link at the bottom of the
sidebar. Narrow layouts expose those same controls from the More disclosure.
The disclosure changes presentation only; it is not a route.

## Persistence Boundary

Views call application operations and receive plain domain records. They do not
import IndexedDB APIs or physical store names.

Both storage adapters expose `active`, `deleted`, and `all` record scopes.
Item content writes are separate from lifecycle writes. This keeps deletion and
restoration from changing values or image ownership.

Image replacement writes the item and asset together. Permanent purge removes a
deleted item and its retained asset together.

The global mutation controller blocks overlapping writes. Storage transactions
protect committed data.

See [Domain Model](data-model.md) for records and
[Persistence](persistence.md) for physical storage rules.

## Resource Cleanup

A rendered view may return `destroy()` with its content and optional
`toolbarAction`. The router hides the view toolbar when no action is present and
calls `destroy()` before replacing the view.

Components must release resources they own. This includes observers, object
URLs, timers, dialogs, pending transitions, and asynchronous work.

## Service Worker

`service-worker.js` caches the complete app shell. Its asset list is explicit.

Static verification follows JavaScript imports and CSS imports from
`index.html`. Every reachable runtime asset must appear in the cache.

When a cached runtime file changes or moves:

1. update the service-worker asset list
2. bump `CACHE_NAME`
3. run `npm run check`

The worker checks for updates without the HTTP cache. It does not reload an open
page because that could discard a draft.
