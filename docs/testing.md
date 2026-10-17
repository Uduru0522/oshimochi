# Testing

Automated tests cover domain, application, repository, adapter, and pure view
behavior. Browser layout and full interaction flows are checked manually.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the full dependency-free `node:test` suite |
| `npm run test:coverage:data` | Enforce data-layer coverage thresholds |
| `npm run check` | Run static checks, test hygiene, and all tests |

The data coverage guard requires:

- 90% line coverage
- 85% branch coverage
- 85% function coverage

This result covers `src/data/`, not the whole browser app.

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

Node coverage is not end-to-end browser coverage. The project has no automated
browser suite, so responsive and pointer behavior still needs manual checks.

## Backup Coverage

Backup behavior is checked at four boundaries:

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

## Manual Verification

Use the grouped browser checklist in
[Development Notes](development.md#manual-browser-checks) after changing runtime
or UI behavior.
