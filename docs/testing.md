# Testing

Automated tests cover domain, application, repository, adapter, and pure view
behavior. Playwright checks startup, collection creation, and item entry in a
real browser. Layout and workflows outside that coverage still need manual
verification.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the full dependency-free `node:test` suite |
| `npm run test:coverage:data` | Enforce data-layer coverage thresholds |
| `npm run check` | Run static checks, Node test hygiene, and all Node tests |
| `npm run test:browser` | Run the Chromium browser regression suite |

GitHub Actions runs the full check for pull requests targeting `main` and during
Pages deployment. See [Deployment](deployment.md#pull-request-verification) for
the pull-request workflow.

The data coverage guard requires:

- 90% line coverage
- 85% branch coverage
- 85% function coverage

This result covers `src/data/`, not the whole browser app.

## Browser Regression Tests

Install development dependencies and Chromium once:

```powershell
npm ci
npx playwright install chromium
```

If PowerShell blocks script shims, use `npm.cmd` and `npx.cmd`.

Run `npm run test:browser`. Playwright starts and stops its own root-path and
Pages-path servers at `127.0.0.1:4187` and `127.0.0.1:4188`. Both must be free;
an existing server is never reused. No running manual preview is needed.

Each test uses a fresh browser context with disposable IndexedDB and settings.
Every scenario runs under both URL paths. Browser errors fail the test. The
suite does not connect to a normal browser profile or Google Drive.

| Area | Browser checks |
| --- | --- |
| Startup | Empty user catalog, rendered debug items, no user database creation in debug mode |
| Collections | Confirmed metadata survives reload; cancelled reviews write nothing; debug collection edits reset and preserve an existing user catalog |
| Item entry | Required name and image, unsaved review drafts, portrait and landscape crop output, saved image dimensions and pixel content after reload |

Tests drive normal UI controls and the real browser database. Image inputs use
small generated PNGs and run through the app's crop and JPEG processing. Item
editing, lifecycle, queries, backup and restore, and CI integration remain in the
[Roadmap](roadmap.md#1-expand-browser-regression-coverage).

Tests live in `e2e/*.spec.js`, outside Node's test discovery. Playwright is a
development dependency; running the app and `npm run check` still need no
installed packages. Browser tests run separately from `npm run check`.

Use `npm run test:browser -- --headed` to watch the browser, or add `--ui` for
interactive debugging. Reports are written to `playwright-report/`; failed
tests retain traces and screenshots in `test-results/`. Open the report with
`npx playwright show-report`. Generated reports and dependencies are ignored.

## Static Checks

`npm run check` verifies four groups:

### Source Graph

- JavaScript syntax
- reachable browser modules
- allowed layer imports
- import cycles

### Runtime Assets

- CSS import graph
- HTML asset references
- service-worker cache coverage

### Test Hygiene

- no focused, skipped, or todo tests
- no duplicate test names
- no helper files discovered as tests

### Unit And Integration Tests

- all `node:test` files under `test/`

## Test Ownership

Test paths mirror production ownership:

| Path | Scope |
| --- | --- |
| `test/app/` | Startup and runtime coordination |
| `test/application/` | Storage-neutral use cases and queries |
| `test/data/contracts/` | Shared adapter behavior |
| `test/data/debug/` | In-memory adapter integration |
| `test/data/indexeddb/` | Schema, connection, repositories, and adapter |
| `test/data/models/` | Domain records and invariants |
| `test/localization/` | Locale normalization and catalog parity |
| `test/scripts/` | Executable architecture-policy regressions |
| `test/services/` | Browser preference controllers with injected fakes |
| `test/shared/` | Product-neutral utilities |
| `test/views/` | Pure presentation logic and focused DOM contracts |
| `test-support/` | Reusable fakes outside test discovery |
| `e2e/` | Real-browser regression tests and Playwright fixtures |

A test belongs to the module whose public behavior it checks. Adapter contract
tests may cross repositories because they verify an integrated boundary.

## Test Design

Each test should have one reason to fail:

1. arrange the smallest useful state
2. perform one behavior
3. assert the full observable result

One behavior may need several assertions. An atomic image replacement test can
check written stores, new records, and removed records because they form one
commit.

Do not combine unrelated normalization, validation, and persistence cases. Use
table-driven subtests when one rule has several inputs.

Prefer public outputs and committed writes over internal call order. Use stable
IDs and timestamps. Use explicit record assertions instead of broad snapshots.

A regression test must fail before its fix and name the broken behavior.

## Test Levels

| Level | Main evidence |
| --- | --- |
| Model | Record normalization and invariants |
| Application | One use case with a small adapter stub |
| Repository | Validation, store choice, and transaction atomicity |
| Adapter | Contract parity and lifecycle behavior |
| View | Pure selectors, display models, and focused DOM behavior |
| Manual browser | Layout, motion, dialogs, service worker, and real IndexedDB |

Node coverage is separate from browser regression coverage. Responsive layout,
pointer interactions, offline updates, and real Google flows still need manual
checks.

## Backup Coverage

Backup behavior is checked at five boundaries:

| Boundary | Covered behavior |
| --- | --- |
| Model | Complete catalog links, protected fields, and image ownership |
| Codec | Versions, canonical JSON, base64 images, and round trips |
| Repository | Coherent reads and atomic full replacement |
| Application | Read-only export, validation before write, and retry behavior |
| Services | Gzip archives, provider state, Google loading, folder selection, Drive transfer, and retention |

Browser download, file selection, review layout, post-restore navigation, and a
real Google consent, Picker selection, and Drive round trip still require manual
checks.

## Lifecycle Coverage

Deleted-item behavior is checked at several boundaries:

| Boundary | Covered behavior |
| --- | --- |
| Model | Valid lifecycle transitions and immutable content |
| Repository | Deleted reads, restore, and atomic item/asset purge |
| Adapter | Matching DebugStorage and IndexedDB behavior |
| Application | Scope selection, restore rules, and purge calls |
| Shared UI | Dialog timing, cancellation, blocking, and reduced motion |
| Manual browser | Empty states, failures, confirmation, motion, and reload |

Repository failure tests assert that active items, deleted items, and assets stay
unchanged after an aborted operation.

## Manual Browser Checks

Choose the groups affected by the change. For a release, run the full checklist
in user and debug mode. Use a disposable catalog or export a backup before
restore, purge, or reset checks. Debug-mode Drive uploads are real files; use
a dedicated test folder as described in the [Drive guide](google-drive-backup.md#debug-mode).

### Startup, Storage, And Offline Behavior

- Reload user mode and confirm saved data remains.
- Reload debug mode and confirm it returns to fixtures.
- Confirm storage failures show a retry action, not an empty collection.
- Confirm localhost and the hosted app keep separate data.
- Check root and project paths from [Development](development.md#run-the-app).
- Confirm there are no module, manifest, or service-worker errors and local
  app-asset requests stay under the chosen base path.
- Confirm the manifest loads and the service worker becomes active.
- Enable DevTools offline mode and confirm the cached app shell opens. Local
  data and file backup must remain usable without Google Identity Services.

### Shell And Navigation

- In wide mode, confirm Administration, Options, and GitHub stay at the bottom.
- In narrow mode, confirm More reveals those same controls and closes on Escape
  or an outside press.
- Change theme, accent color, and language, then reload to confirm each persists.
- Check narrow and wide layouts, long translated labels, keyboard navigation,
  and reduced-motion behavior.

### Goods Types And Fields

- Create a goods type and confirm Items opens after save.
- Stage add, edit, remove, and order changes before applying.
- Confirm protected fields have no edit or remove action.
- Leave the view and confirm unapplied field changes are discarded.
- Reload and confirm only user-mode changes persist.

### Item Forms

- Enter every supported field type and review the values.
- Confirm image selection is required.
- Move and resize both crop orientations and check the saved image.
- Confirm scheme-less URLs become HTTPS and HTTP URLs are rejected.
- Confirm long labels and values do not create horizontal overflow.
- Close, reopen, clear, save, and retry a failed draft.

### Item Browser

- Confirm a collection opens Items, the information action opens Overview,
  and the return arrow opens Items again.
- Switch between card and list views with both image orientations.
- Apply and clear several filters and sort orders.
- Confirm retained entries move from their old positions.
- Confirm card exits finish before movement, then entrances begin.
- Confirm the action toolbar stays fixed in size and aligned while scrolling.

### Item Lifecycle

- Soft-delete an item and confirm its image stays available.
- Restore it and confirm values, identity, and image are unchanged.
- Purge a deleted item and confirm both item and image are removed.
- Confirm active filters and sorting remain after each change.
- Check empty, failure, cancel, and confirmation states.

### Backup And Restore

- Export user data and confirm one `.json.gz` file downloads.
- Restore that file and confirm collections, deleted items, and images return.
- Select an invalid file and confirm existing data does not change.
- Complete the [Drive round trip](google-drive-backup.md#test-the-full-flow)
  with personal Google setup and a dedicated test folder.
- Confirm cancelling consent leaves local data unchanged, and disconnecting
  hides cloud actions while leaving local file actions available.
- Change the destination and confirm new backups use the new folder.
- Remove Drive setup and confirm all Google setup and folder data is cleared.
- Cancel from the review state and confirm no write occurs.
- Check the workflow in narrow and wide layouts and all interface languages.

### Brand Icon

- Check the shared SVG geometry at 24, 44, 48, 192, and 512 pixels.
- Check the sidebar under all seven accents in light and dark mode and in
  the narrow layout.
- Confirm the favicon and manifest icon use the fixed blue palette.
