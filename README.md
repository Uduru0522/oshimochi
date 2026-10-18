# Oshimochi

A local-first web app for organizing collectible goods.

[Open Oshimochi](https://uduru0522.github.io/oshimochi/) or
[try debug mode](https://uduru0522.github.io/oshimochi/?debug=1) with temporary
sample data.

User data stays in IndexedDB in the current browser profile and origin. Debug
mode uses memory and never opens the user database.

## Features

- Collections with protected built-in fields and configurable custom fields
- Image cropping, item cards and lists, search, filtering, and sorting
- Item editing, soft deletion, recovery, and permanent purge
- Compressed local backup and full restore, plus optional user-owned Google
  Drive backup
- Responsive layouts, English, Japanese, Traditional Chinese, light and dark
  themes, seven accent colors, and offline app-shell caching

See [Workflows](docs/workflows.md) for available user actions and the
[Roadmap](docs/roadmap.md) for unfinished work.

## Run Locally

Use Node.js 24 or newer. There are no runtime packages to install.

```powershell
npm start
```

Open `http://localhost:4173/` or `http://localhost:4173/?debug=1`.

To reproduce the GitHub Pages path, run `npm run start:pages` and open
`http://localhost:4173/oshimochi/`. Local and hosted URLs do not share browser
data or settings.

See [Development](docs/development.md) for local setup and coding conventions.
If PowerShell blocks `npm.ps1`, use `npm.cmd` in place of `npm`.

## Verify Changes

```powershell
npm run check
```

This runs static verification, test hygiene checks, and all tests. See
[Testing](docs/testing.md) for coverage commands and manual browser checks.

## Documentation

Start with the [documentation index](docs/README.md). It links to the
architecture, data contracts, user guides, and roadmap.

Follow [AGENTS.md](AGENTS.md) for the Git workflow and local review rules.
