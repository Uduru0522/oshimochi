# Testing Strategy

This document defines how automated tests are organized and how new behavior
should be developed. Passing tests are necessary evidence, not proof that every
browser workflow is correct.

## Commands

```powershell
npm test
npm run test:coverage:data
npm run check
```

`npm test` runs the dependency-free Node test suite. The scoped coverage command
guards the data layer at 90% lines, 85% branches, and 85% functions. It is scoped
because Node coverage omits browser modules that the test process never imports;
presenting that result as project-wide coverage would be misleading.

`npm run check` also rejects focused, skipped, todo, duplicate, or accidentally
discovered helper files before running tests.

## Ownership

Test paths mirror production ownership:

```text
test/app/                  Application runtime coordination
test/application/          Storage-neutral use cases and queries
test/data/contracts/       Adapter capability contracts
test/data/debug/           In-memory adapter integration
test/data/indexeddb/       Physical schema, connection, repositories, adapter
test/data/models/          Domain records and invariants
test/localization/         Locale normalization and catalog parity
test/shared/               Domain-neutral utilities
test/views/                Pure presentation logic and focused DOM contracts
test-support/              Reusable fakes; kept outside test discovery
```

A test belongs beside the module whose public behavior it exercises. Broad
adapter tests may cross repositories deliberately and are integration tests;
model validation does not belong in those files.

## Test Shape

Each test should have one reason to fail:

1. arrange the smallest meaningful state
2. perform one behavior
3. assert the complete observable result of that behavior

One behavior may require several assertions. For example, an atomic image
replacement test may assert its store set, write set, and deletion set. Combining
normalization, validation errors, and persistence into one test is not acceptable
because a failure would not identify which contract changed.

Prefer public outputs and committed writes over internal call order. Use fixed
IDs and timestamps. Avoid snapshots for domain records when explicit properties
make the invariant clearer. A regression test must fail before its production
fix and describe the user-visible or architectural behavior that failed.

## Test Levels

- **Model tests** cover record normalization and invariants with no storage.
- **Application tests** use minimal adapter stubs and cover one use case.
- **Repository tests** verify validation, store selection, and transaction atomicity.
- **Adapter integration tests** verify capability parity and lifecycle behavior.
- **View tests** cover pure selectors, display models, and focused DOM behavior.
- **Manual browser checks** currently cover responsive layout, motion, dialogs,
  service-worker updates, and actual IndexedDB persistence.

The final category is a known automation gap. A future browser test harness should
exercise the hosted-path build, real IndexedDB, service workers, keyboard input,
pointer input, and representative wide/narrow screenshots. Until then, do not
interpret Node coverage as end-to-end confidence.

## Deleted-Item Coverage

Recovery behavior is covered from the inside out:

1. model tests for valid restore transitions and immutable item content
2. repository tests for `deleted` scope, restoration, and atomic item/asset purge
3. shared adapter contract cases for DebugStorage and IndexedDB
4. application tests for deleted-scope reads, restore invariants, and purge boundaries
5. static interface checks for localization, module reachability, and offline caching
6. manual browser checks for empty and failure states, confirmation, retained
   filters, motion, and reload

Repository and adapter failure paths prove that the active item, deleted item,
and asset catalogs remain unchanged. Dialog state remains a manual browser-test
gap until a browser harness is introduced.

## Backup Export And Import Milestone

Start with pure transfer contracts before file UI:

1. deterministic snapshot serialization tests
2. export tests proving `all` scopes and retained assets are included
3. table-driven validation tests for versions, duplicate IDs, relationships,
   lifecycle state, and malformed image payloads
4. replacement repository tests proving one transaction and no partial writes
5. round-trip tests from valid domain records to snapshot and back
6. browser tests for file selection, review, cancellation, download, and failures

Invalid files must be tested as non-mutating inputs. Merge behavior must not be
tested or implemented until its conflict semantics are designed.
