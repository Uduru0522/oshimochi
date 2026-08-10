# Roadmap

This document is the source of truth for implementation status and milestone
order. It describes direction, not a release-date commitment.

## Completed Foundations

- responsive application shell
- primary and utility navigation
- user and debug runtime modes
- theme persistence without first-paint flash
- offline app-shell service worker
- GitHub Pages deployment under a repository subpath
- domain goods-type records and storage errors
- isolated `DebugStorage`
- IndexedDB version-1 stores and indexes
- asynchronous storage initialization and retryable failures
- static checks and dependency-free unit tests

## Completed Stabilization Milestone

- restructured contributor documentation by ownership
- separated IndexedDB connection, request, repository, and adapter responsibilities
- separated startup coordination from runtime view assembly
- added strict validation before persisted records reach views
- added browser import-graph and offline-cache verification
- broadened startup, lifecycle, corruption, and transaction-failure tests

## Completed Goods-Type Creation Milestone

- create goods types from Administration
- create protected built-in field definitions atomically
- validate user input and normalized duplicate names
- refresh navigation after commit
- retain debug-mode isolation
- add mutation progress and recoverable failure UI

## Completed Manage Custom Fields Milestone

- list active field definitions for a selected goods type
- add text, number, date, boolean, URL, and select fields
- stage edits in memory and review them before applying
- preserve built-in field protections
- apply each reviewed change set atomically
- retain staged input after recoverable failures

## Completed Collection Workflow Shell

- open each goods type directly in its Items view
- keep Overview available as a secondary title-bar action
- launch item registration as a modal workflow from Items
- reserve Overview for future per-collection summaries
- reset all loaded collection data through typed confirmation

## Completed Item Registration

- generate forms from active field definitions
- validate built-in and custom values
- keep form drafts in memory until confirmation
- review the complete item before saving
- write validated item records to user or debug storage
- retain input after recoverable failures
- choose and crop one image to a supported paper ratio
- process a low-resolution browser-local image
- require an image and write the item and image asset atomically
- list newly registered items with thumbnails and custom values

## Completed Item List Management

- [x] use cards as the default item view while retaining the compact list
- [x] filter items by built-in and custom field values
- [x] sort items by name, creation time, update time, and supported custom values
- [x] edit items through the existing modal workflow
- [x] soft-delete items with explicit confirmation
- [x] add a cards view that shares the list query pipeline

List and card presentations consume the same loaded, filtered, and sorted item
set. Both reconcile keyed items without reloading storage or replacing the whole
collection.

## Current Product Milestone: Deleted Item Management

- [ ] provide a dedicated view of soft-deleted items
- [ ] restore selected items to their active collection
- [ ] permanently purge selected items and retained images with explicit confirmation

The underlying adapters already distinguish active, deleted, and complete
catalogs and separate content writes from lifecycle transitions. This is
refactoring readiness, not a user-facing recovery feature.

## Next Product Milestone: Backup Export And Import

- [ ] export one versioned local snapshot containing all records and assets
- [ ] include soft-deleted records so a backup represents the complete collection
- [ ] validate the complete snapshot before any import mutation
- [ ] review and explicitly confirm replacement of browser-local data
- [ ] replace all user-data stores atomically and preserve existing data on failure

The first import strategy is full replacement. Merge behavior remains deferred
until identity and conflict rules are designed.

## Later Milestones

1. Optional Google Drive upload and download of the same snapshot format.
2. Backup reminders and bounded snapshot retention.
3. Evaluate live synchronization only after conflict semantics exist.

## Deliberate Non-Goals

- server-hosted user database
- multi-user accounts or permissions
- live Google Drive database access
- one physical IndexedDB store per goods type
- destructive field-type conversion in the initial field editor
