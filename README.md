# Wotagoods Manager

A local-first web app for organizing collectible goods.

The app runs on GitHub Pages or a local static server. User data stays in the
current browser profile and is stored in IndexedDB. Debug mode uses temporary
sample data and never writes to the user database.

## What Works

### Interface

- Responsive wide and narrow layouts
- Light and dark themes
- English, Japanese, and Traditional Chinese
- Direct navigation to each collection's item browser
- Separate collection overview and application settings

### Collection Setup

- Goods-type creation with protected built-in fields
- Custom text, long-text, number, date, toggle, URL, and selection fields
- Staged field changes with review and one atomic save
- Local-data reset with typed confirmation

### Item Management

- Required image selection, cropping, review, and local storage
- Card and list presentations over the same item set
- General search and field-aware filters
- Field-aware sorting
- Item editing and soft deletion
- Per-collection restore and permanent purge

### Runtime And Quality

- Persistent IndexedDB user storage
- Isolated in-memory debug storage
- Offline app-shell caching
- Static architecture checks and unit tests
- GitHub Pages deployment

See the [roadmap](docs/roadmap.md) for work that is not part of the current app.

## Run Locally

Development requires Node.js 24 or newer. The app has no external runtime
dependencies.

```powershell
npm start
```

Open:

```text
User mode:  http://localhost:4173/
Debug mode: http://localhost:4173/?debug=1
```

To reproduce the GitHub Pages path locally:

```powershell
npm run start:pages
```

Then open `http://localhost:4173/wotagoods-manager/`.

## Verify Changes

```powershell
npm run check
```

This command checks syntax, module boundaries, import cycles, asset graphs,
offline coverage, test hygiene, and the full `node:test` suite.

Run the data-layer coverage guard separately:

```powershell
npm run test:coverage:data
```

## Hosted Application

- [User mode](https://uduru0522.github.io/wotagoods-manager/)
- [Debug mode](https://uduru0522.github.io/wotagoods-manager/?debug=1)

Local and hosted URLs are different browser origins. They do not share settings
or IndexedDB data.

## Repository Map

| Path | Responsibility |
| --- | --- |
| `.github/workflows/` | GitHub Pages deployment |
| `docs/` | Current technical docs and product plans |
| `icons/` | Installable-app icons |
| `scripts/` | Repository verification |
| `src/app/` | Startup, routing, and shell behavior |
| `src/application/` | Storage-neutral operations and queries |
| `src/data/` | Domain records and storage adapters |
| `src/views/` | View definitions and feature UI |
| `src/styles/` | Tokens, layout, and feature styles |
| `src/shared/` | Product-neutral UI helpers |
| `test/` | Automated tests |
| `index.html` | Document shell |
| `server.js` | Local static server |
| `service-worker.js` | Offline app-shell cache |

## Documentation

Start with the [documentation index](docs/README.md). It separates descriptions
of the current app from planning documents.

## Contribution Rules

- Keep user data in browser-local storage.
- Never let debug mode open or write the user database.
- Keep browser storage APIs behind adapters and services.
- Add or update tests for changed domain and persistence behavior.
- Update the service-worker asset list and cache name when runtime files move.
- Keep commits small, focused, and verifiable.
