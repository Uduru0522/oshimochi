# GitHub Pages Deployment

GitHub Pages hosts the static app. The Node server is for local development only.

## Production URL

```text
https://uduru0522.github.io/wotagoods-manager/
```

Runtime paths are relative so the app works under
`/wotagoods-manager/`.

## Repository Setup

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Set **Build and deployment** to **GitHub Actions**.

`.github/workflows/deploy-pages.yml` deploys each push to `main`. It also
supports manual runs from the **Actions** tab.

The workflow uses Node 24 and these Pages actions:

- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`

Do not hide action runtime warnings with
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`.

## Before Push

### Automated Check

```powershell
npm run check
```

If PowerShell blocks `npm.ps1`, use `npm.cmd run check`.

### Root-Path Check

```powershell
npm start
```

Open:

```text
http://localhost:4173/
http://localhost:4173/?debug=1
```

### Project-Path Check

Stop the first server. Then run:

```powershell
npm run start:pages
```

Open:

```text
http://localhost:4173/wotagoods-manager/
http://localhost:4173/wotagoods-manager/?debug=1
```

Stop the server with `Ctrl+C` after each check.

## Browser Smoke Check

### Runtime

- No module, manifest, or service-worker errors
- All network requests stay under the project path
- Manifest loads
- Service worker is active
- App shell opens while DevTools offline mode is enabled

### Interface

- Theme and language survive reload
- A goods type opens Items directly
- The information action opens Overview
- The return arrow opens Items again

Localhost and GitHub Pages use different browser origins. Their settings and
IndexedDB data remain separate.

## After Push

1. Confirm **Deploy to GitHub Pages** succeeds in **Actions**.
2. Hard-refresh the production URL.
3. Repeat the smoke check in user and debug mode.

The worker activates a new cache but does not reload an open page. This protects
unfinished drafts.

Create a milestone tag only after the deployed user and debug modes pass. Keep
the package version and tag aligned, such as `0.4.0` and `v0.4.0`.
