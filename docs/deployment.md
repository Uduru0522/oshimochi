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

## Pull Request Verification

`.github/workflows/verify-pr.yml` runs `npm run check` on Node.js 24 for pull
requests targeting `main`, including documentation-only changes. Opening,
reopening, or pushing commits to a pull request starts verification.

The workflow has read-only repository access. New commits cancel an older run
for the same pull request. Results appear as **Verify pull requests / Check app**
in the pull request checks.

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
- All local app-asset requests stay under the project path
- Manifest loads
- Service worker is active
- App shell opens while DevTools offline mode is enabled

Google Identity Services is remote and is needed only for Drive connection.
Local data and file backup continue to work when it is unavailable.

### Interface

- Theme, accent color, and language survive reload
- A goods type opens Items directly
- The information action opens Overview
- The return arrow opens Items again

Localhost and GitHub Pages use different browser origins. Their settings and
IndexedDB data remain separate.

## Drive Backup Boundary

The deployment contains no developer-owned cloud credentials. Each user enters
a Web OAuth client ID, restricted browser API key, and Cloud project number from
a project they control or are allowed to use.

Those public values and the selected folder metadata stay in that browser's
local storage. The Drive and Picker API quota belongs to the user's Google Cloud
project, and backup bytes belong to the signed-in Drive account.

The deployed origin is `https://uduru0522.github.io`. OAuth authorized origins
do not include `/wotagoods-manager/`.

See [Google Drive Backup Setup](google-drive-backup.md) for the user setup and
manual smoke test. See [Data Portability](data-portability.md) for the provider,
snapshot, retention, and security boundaries.

## After Push

1. Confirm **Deploy to GitHub Pages** succeeds in **Actions**.
2. Hard-refresh the production URL.
3. Repeat the smoke check in user and debug mode.
4. With personal Google credentials, test Drive connect, folder selection,
   upload, restore, and disconnect.

The worker activates a new cache but does not reload an open page. This protects
unfinished drafts.

Create a milestone tag only after the deployed user and debug modes pass. Keep
the package version and tag aligned as `X.Y.Z` and `vX.Y.Z`.
