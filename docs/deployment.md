# GitHub Pages Deployment

The production app is a static site. GitHub Pages hosts the HTML, CSS, JavaScript, manifest, icons, and service worker. The local Node server remains a development tool only.

## Production URL

For this repository, the expected project-site URL is:

```text
https://uduru0522.github.io/wotagoods-manager/
```

All runtime asset paths are relative so the app works under the `/wotagoods-manager/` project subpath.

## One-Time Repository Setup

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.

The workflow in `.github/workflows/deploy-pages.yml` deploys the static site whenever `main` is pushed. It can also be run manually from the repository's **Actions** tab.

The workflow uses Node 24 and the Node 24-based Pages action majors:
`actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and
`actions/deploy-pages@v5`. Do not suppress runtime deprecation warnings with
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`; upgrade an affected action to a release
that declares the current runtime instead.

## Pre-Push Verification

Run the static checks:

```powershell
npm run check
```

If PowerShell blocks `npm.ps1` because of its execution policy, use `npm.cmd` in
the commands on this page, for example `npm.cmd run check`.

Test the normal local root:

```powershell
npm start
```

Open:

```text
http://localhost:4173/
http://localhost:4173/?debug=1
```

Stop the server with `Ctrl+C`. Then test the same project subpath used by GitHub
Pages:

```powershell
npm run start:pages
```

Open:

```text
http://localhost:4173/wotagoods-manager/
http://localhost:4173/wotagoods-manager/?debug=1
```

Stop this server with `Ctrl+C` when testing is complete.

In browser DevTools, verify:

- Console has no module, manifest, or service-worker errors.
- Network requests remain under `/wotagoods-manager/`.
- Application > Manifest loads successfully.
- Application > Service Workers shows an active worker.
- Reloading after enabling offline mode still opens the app shell.
- Dark mode survives a reload.
- Choosing a goods type opens Items directly, while the title-bar information
  action opens its secondary Overview route.

Localhost and GitHub Pages are different browser origins. Their settings and
IndexedDB databases are separate.

## After Push

Open the repository's **Actions** tab and confirm the `Deploy to GitHub Pages` workflow succeeds. Then repeat the browser checks at the production URL.

The service worker checks for a new deployment when the page loads, but it does
not force a reload that could discard draft input. Use a hard refresh before
testing a newly deployed build.

For a milestone release, create the version tag only after `main` is deployed and
the hosted user and debug modes pass their smoke checks. Keep the package version
and release tag aligned, for example package version `0.2.0` and tag `v0.2.0`.
