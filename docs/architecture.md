# Architecture

Wotagoods Manager is intentionally dependency-free for now. The code is organized
so the app shell and IndexedDB boundary can stay stable while item-management
workflows and alternate item presentations are added.

## Runtime Flow

1. `index.html` loads `src/bootstrap/theme-bootstrap.js` before CSS. This applies the saved theme before first paint and prevents a light-mode flash.
2. `index.html` loads `src/styles/app.css`.
3. `src/main.js` imports `src/app/app-shell.js`.
4. `createApp()` creates the runtime mode, shell services, mutation controller,
   and startup coordinator.
5. `start()` initializes theme and shell behavior, selects the storage adapter,
   awaits storage initialization and goods-type loading, then creates views,
   navigation, and the router.
6. Startup storage failures render a retryable state instead of being interpreted
   as an empty collection.
7. Successful mutations ask the startup coordinator to reload goods types from
   the active adapter and rebuild data-dependent navigation without reopening the
   database.

## Module Boundaries

### `src/app/`

Owns application assembly and app-level behavior.

- `app-shell.js`: composition root and browser lifecycle owner.
- `app-runtime.js`: builds data-dependent views, navigation, renderer, and router,
  and returns the runtime teardown function.
- `app-elements.js`: required DOM lookup for shell elements.
- `app-mode.js`: user/debug mode detection.
- `config.js`: shared constants for selectors, theme, layout, and defaults.
- `layout-transition.js`: wide/narrow breakpoint transition state.
- `mutation-controller.js`: one global database-mutation lock and busy state.
- `startup-state.js`: storage loading and recoverable startup-error rendering.
- `startup-coordinator.js`: storage lifecycle, retries, and race-safe mounting.
- `view-router.js`: active view switching, title updates, transition timing, and
  teardown of resources owned by the previous rendered view.
- `view-scroll-state.js`: compact title-bar state based on view scroll position.

### `src/application/`

Owns storage-neutral use cases that coordinate domain records and adapter calls.

- `goods-types/create-goods-type.js`: constructs one goods type and its protected
  field definitions, then requests one atomic storage write.
- `fields/manage-fields.js`: validates staged field changes and converts them into
  field-definition records for one atomic adapter write.
- `data/reset-local-data.js`: requests one atomic clear of all user-data stores
  while leaving application metadata and external backups intact.
- `items/item-values.js`: normalizes and validates generated item-form values.
- `items/filter-items.js`: parses general-search syntax and applies field-type-aware
  filters to plain item records without depending on a presentation or storage adapter.
- `items/item-field-value.js`: reads built-in and custom values through one shared
  record-access contract used by item queries.
- `items/sort-items.js`: performs stable, typed item ordering and keeps missing values last.
- `items/manage-items.js`: loads active field definitions, constructs validated
  item and image records, and requests atomic persistence.

Application operations may depend on domain models and storage contracts. They
must not depend on DOM elements, IndexedDB object-store names, or view modules.

### `src/bootstrap/`

Contains scripts that must run before normal app startup. Keep this folder small.

- `theme-bootstrap.js`: reads `localStorage` directly and sets `data-theme` before CSS loads.

This duplicates a small part of `src/services/theme.js` on purpose. The service cannot run early enough to prevent first-paint theme flash.

### `src/data/`

Owns domain records, storage contracts, and persistence adapters. It is the
boundary between application operations and physical browser storage.

- `contracts/`: adapter capabilities and storage error definitions.
- `create-storage.js`: mode-aware adapter selection.
- `debug/`: in-memory debug fixtures and adapter.
- `indexeddb/`: physical schema, database lifecycle, and persistent adapter.
- `models/`: domain record construction and validation.

User mode opens the versioned IndexedDB database and persists created goods types.
Debug mode starts from hardcoded records, accepts the same creation operation in
memory, and never opens IndexedDB; its changes disappear on reload.

### `src/navigation/`

Owns navigation rendering and navigation-specific scroll behavior.

- `navigation.js`: combines primary and utility navigation.
- `primary-navigation.js`: dashboard, goods types, goods child views, administration.
- `utility-navigation.js`: Options gear in the app chrome.
- `nav-items.js`: nav button/separator builders.
- `scrollable-row.js`: horizontal scroll behavior for narrow navigation.

Navigation is data-driven through each view's `nav` metadata.
Vertical drag scrolling is shared through `src/shared/drag-scroll.js`. Drag
starts originating from dialogs, form controls, buttons, and links are excluded
so nested interactions cannot move their parent scroll surface.

### `src/services/`

Owns browser/platform services.

- `storage.js`: namespaced localStorage wrapper with safe fallbacks.
- `theme.js`: app theme controller and persisted theme changes.
- `service-worker-registration.js`: service worker registration.

### `src/shared/`

Generic helpers that should not know about Wotagoods-specific features.

- `dom.js`: small DOM creation helper.
- `action-button.js`: consistent construction of text action buttons.
- `content-transition.js`: reusable two-phase transitions for stateful workflow content.
- `drag-scroll.js`: reusable pointer drag scrolling.
- `icons.js`: icon creation.
- `motion.js`: CSS timing parsing and reduced-motion helpers.
- `select-menu.js`: app-styled listbox behavior with pointer and keyboard support.
- `ui-components.js`: reusable view components and neutral required markers.

### `src/styles/`

Contains app-wide CSS. `app.css` currently holds design tokens, layout, view styling, responsive rules, scrollbar styling, and animations.

Important tokens:

- `--motion-phase`: one half of an exit/enter content transition.
- `--motion-fast`: fast UI state changes.
- `--motion-enter`: lightweight feedback when workflow content is replaced.
- `--motion-layout`: wide/narrow layout settle animation.
- `--item-membership-duration`: item entrance and exit feedback.
- `--item-layout-*`: distance-aware item reordering bounds and scaling.
- `--scrollbar-*`: app scrollbar styling.
- `--focus-ring`: keyboard focus outline color.
- `--accent-tint`: low-emphasis icon background.
- `--nav-child-indent`: wide sidebar child-view indent.

### `src/views/`

Owns view definitions and view rendering.

- `view-definitions.js`: source of truth for view IDs, titles, sections, nav metadata, and renderer keys.
- `view-metadata.js`: shared constants for view IDs, nav groups, nav kinds, and renderer keys.
- `view-renderer.js`: renderer registry for dashboard, goods overview, items,
  administration, and options views.
- `administration/`: Administration rendering and the goods-type creation flow.
  Its field manager separates staging state, list rendering, editing, review, and
  orchestration into focused modules. Field editors expand within their owning
  list rows, while stable field and selection-option IDs remain application-layer
  concerns. Destructive local-data reset is isolated in its own typed-confirmation
  component.
- `items/`: collection browsing, staged filtering and sorting, keyed item editing
  and deletion, responsive completeness warnings, fixed-stage image cropping,
  and modal item workflows. `items-view.js` composes the page actions, browser,
  and dialogs. `item-browser.js` owns asynchronous
  loading, applied query state, and the active presentation. List/card mode lives
  at this same boundary, while `item-list.js` and `item-cards.js` independently
  reconcile keyed records from one filtered and sorted item set. Their shared
  keyed-layout helper measures stable entries before DOM ordering changes, then
  animates those entries from their previous positions without moving new entries
  away from their final insertion points. Filter and sort dialogs remain separate
  from their pure application evaluators. Display-model, typed-value, thumbnail, and warning
  helpers are presentation-neutral. Add and edit dialogs own separate draft
  lifecycles while sharing the entry form, crop editor, and review rendering. The
  delete dialog owns explicit confirmation and delegates the actual soft-delete
  operation to the application layer; it never mutates list state before storage
  succeeds. Generated form-field controls, save-error translation, and dialog
  orchestration remain separate so editing can reuse them without depending on
  list markup. Dialog screens and routed views both expose explicit teardown for
  observers, pending asynchronous work, and temporary image resources.

## View Model

Each view definition has an `id`, title metadata, a renderer key, and optional navigation metadata.

Primary navigation uses:

```js
nav: { group: "primary" }
```

Goods-type parent views use:

```js
nav: { group: "primary", kind: "goods-type" }
```

The Items child view uses:

```js
nav: { group: "primary", kind: "goods-child", parentId: `goods:${goodsType.id}` }
```

Options uses:

```js
nav: { group: "utility" }
```

## Data Persistence

User mode uses IndexedDB through an application-owned storage contract.
Physical object stores remain stable; goods types, field definitions, and custom
values are records rather than generated database tables.

Current storage adapters:

- `IndexedDbStorage`: persistent browser-local user data.
- `DebugStorage`: in-memory fixtures that never write user data.

Views, navigation, and renderers must not import IndexedDB APIs or object-store
names. They consume plain domain records and call application operations. This
also keeps versioned file import/export and a future Google Drive snapshot adapter
independent from UI components.

See `docs/data-model.md` for domain records, `docs/persistence.md` for object
stores and transaction rules, and `docs/workflows.md` for mutation behavior.

### Persistence Integration Constraints

IndexedDB is asynchronous. The composition root selects the adapter from app
mode, awaits adapter initialization, and then loads goods types before constructing
data-dependent views and navigation. Startup renders an explicit loading state
and a recoverable storage-error state rather than silently treating a failed
database as an empty collection.

Mutation coordination belongs at application level. Individual views request an
application operation; they do not open transactions or independently manage
global busy state. `mutation-controller.js` prevents overlapping writes while
storage adapters provide transaction atomicity and return plain records or
domain errors.

Rendered views may return an optional `destroy()` function alongside `content`
and `topbarAction`. The router calls it before replacing that view, and runtime
remounting destroys the previous router. Components that own observers, object
URLs, timers, pending transitions, dialogs, or drafts must release them there.

## Service Worker

`service-worker.js` caches app shell assets for local-first behavior. When paths
change or cached app assets change, bump `CACHE_NAME` and update the asset lists.
Registration bypasses the HTTP cache when checking for worker updates. A newly
installed worker activates promptly, but the app does not force-reload an open
page because doing so could discard an in-progress draft.

The service worker intentionally lists module paths explicitly. That makes moved files visible during review and avoids hidden build steps.
