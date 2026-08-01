# Wotagoods Manager

A local-first web application for organizing multiple types of collectible goods.

The application runs from GitHub Pages or a local static server. User collections
belong to the current browser profile and are stored in IndexedDB. Debug mode uses
temporary fixtures and never writes to the user database.

## Current Status

Implemented:

- responsive application shell and view navigation
- light and dark themes
- user and debug runtime modes
- versioned IndexedDB schema initialization
- isolated in-memory debug storage
- Administration workflow for creating goods types
- atomic goods-type and protected-field persistence
- staged custom-field management with atomic apply
- consolidated Overview and Items views for each goods type
- modal item-entry shell launched from the Items view
- typed reset of all browser-local collection data
- generated item-entry forms with image cropping, review, and atomic local persistence
- collection item listing with thumbnails and custom values
- typed item filtering with general search and field-specific rules
- typed item sorting across metadata, names, and supported custom values
- modal item editing with optional image replacement and atomic persistence
- confirmed item soft deletion with retained records and image assets
- keyed list updates for filtering, sorting, and newly registered items
- runtime navigation refresh after database changes
- offline app-shell caching
- automated static and unit checks
- GitHub Pages deployment

A card presentation is the next application feature now that list management is
complete. Restore and purge controls for soft-deleted items, followed by backup
transfer, remain planned rather than implemented.

## Run Locally

This project has no external runtime dependencies.

```powershell
npm start
```

Open:

```text
User mode:  http://localhost:4173/
Debug mode: http://localhost:4173/?debug=1
```

To reproduce the GitHub Pages repository path locally:

```powershell
npm run start:pages
```

Then open `http://localhost:4173/wotagoods-manager/`.

## Verify Changes

```powershell
npm run check
```

This checks JavaScript syntax, import boundaries and cycles, static asset
references, and offline coverage, then runs the dependency-free `node:test` suite.

## Hosted Application

- [User mode](https://uduru0522.github.io/wotagoods-manager/)
- [Debug mode](https://uduru0522.github.io/wotagoods-manager/?debug=1)

The hosted and local URLs are different browser origins and therefore have
separate settings and IndexedDB databases.

## Repository Map

```text
.github/workflows/     GitHub Pages deployment
docs/                  Architecture, development, and product design
icons/                 Installable-app icons
scripts/               Repository verification scripts
src/application/       Storage-neutral application operations
src/app/               Startup, shell behavior, routing, layout
src/bootstrap/         Scripts that run before first paint
src/data/              Domain records and storage adapters
src/navigation/        Primary and utility navigation
src/services/          Browser services
src/shared/            Domain-independent UI helpers
src/styles/            Design tokens, layout, and component styling
src/views/             View definitions and renderers
test/                  Dependency-free unit tests
index.html             Document shell
manifest.webmanifest   Installable-app metadata
server.js              Local static server
service-worker.js      Offline app-shell cache
```

## Documentation

Start with the [documentation index](docs/README.md). The most relevant documents
for implementation work are:

- [Architecture](docs/architecture.md)
- [Domain Model](docs/data-model.md)
- [Persistence](docs/persistence.md)
- [Workflows](docs/workflows.md)
- [Roadmap](docs/roadmap.md)

## Contribution Rules

- Keep user data local unless an explicit transfer operation is requested.
- Never let debug mode open or write the user database.
- Keep browser APIs behind services or storage adapters.
- Add or update tests for changed domain and persistence behavior.
- Update `service-worker.js` and bump its cache name when runtime files move.
- Prefer small commits that remain understandable and verifiable on their own.
