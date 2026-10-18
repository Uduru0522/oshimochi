# GitHub Pages Deployment

GitHub Pages hosts the static app. The Node server is for local development only.

## Production URL

```text
https://uduru0522.github.io/oshimochi/
```

Runtime paths are relative so the app works under `/oshimochi/`.

## Repository Setup

In the GitHub repository:

1. Open **Settings**.
2. Open **Pages**.
3. Set **Build and deployment** to **GitHub Actions**.

`.github/workflows/deploy-pages.yml` runs the shared Chromium checks, then
`npm run check` on Node.js 24 before deploying each push to `main`. It also
supports manual runs from the **Actions** tab. Browser dependencies and reports
stay in a separate job and are not included in the Pages upload.

The workflow uses these Pages actions:

- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`

## Pull Request Verification

`.github/workflows/verify-pr.yml` runs `npm run check` and the shared Chromium
workflow on Node.js 24 for pull requests targeting `main`, including
documentation-only changes. Opening, reopening, or pushing commits to a pull
request starts verification.

The workflow has read-only repository access. New commits cancel an older run
for the same pull request. Results appear under **Verify pull requests** as
**Check app** and **Check browser workflows** in the pull request checks.

Both callers use `.github/workflows/browser-checks.yml`, which runs the complete
browser suite at the root and Pages paths. Download the `playwright-report`
artifact from the Actions run to inspect its HTML report and any failure traces.
Reports are retained for 14 days. See [Testing](testing.md#browser-regression-tests)
for local commands and covered workflows.

## Before Deployment

Follow the review and Git workflow in [AGENTS.md](../AGENTS.md). For app changes:

1. Run the [automated checks](testing.md#commands).
2. Test user and debug modes at both local paths described in
   [Development](development.md#run-the-app).
3. Complete the affected [browser checks](testing.md#manual-browser-checks),
   including startup and offline behavior.

Drive setup belongs to the user. Follow the [Google Drive guide](google-drive-backup.md)
for authorized origins and public configuration; deployment supplies no shared
cloud credentials.

## After Deployment

1. Confirm **Deploy to GitHub Pages** succeeds in **Actions**.
2. Hard-refresh the production URL.
3. Repeat the affected [browser checks](testing.md#manual-browser-checks) in
   user and debug mode, including startup and offline behavior.
4. For changes to authentication, transfer, or restore, complete the
   [Drive round trip](google-drive-backup.md#test-the-full-flow) with personal
   Google setup and a dedicated test folder.

The worker activates a new cache but does not reload an open page. This protects
unfinished drafts.

Create a milestone tag only after the deployed user and debug modes pass and
the owner approves the release. Keep the package version and tag aligned as
`X.Y.Z` and `vX.Y.Z`.
