import assert from "node:assert/strict";
import test from "node:test";

import {
  RECORD_SCOPES,
  createDeletionTransition,
  filterRecordsByScope,
  parseDeletionLifecycle,
  requireRecordScope
} from "../../../src/data/models/record-lifecycle.js";

const CREATED_AT = "2026-07-20T00:00:00.000Z";
const DELETED_AT = "2026-07-21T00:00:00.000Z";
const RESTORED_AT = "2026-07-22T00:00:00.000Z";

const ACTIVE_RECORD = Object.freeze({
  createdAt: CREATED_AT,
  deletedAt: null,
  id: "active",
  isDeleted: false,
  updatedAt: CREATED_AT
});
const DELETED_RECORD = Object.freeze({
  createdAt: CREATED_AT,
  deletedAt: DELETED_AT,
  id: "deleted",
  isDeleted: true,
  updatedAt: DELETED_AT
});

test("active record scope is the default", () => {
  assert.deepEqual(filterRecordsByScope([ACTIVE_RECORD, DELETED_RECORD]), [ACTIVE_RECORD]);
});

test("deleted record scope selects deleted records only", () => {
  assert.deepEqual(
    filterRecordsByScope([ACTIVE_RECORD, DELETED_RECORD], RECORD_SCOPES.deleted),
    [DELETED_RECORD]
  );
});

test("all record scope preserves the complete catalog reference", () => {
  const records = [ACTIVE_RECORD, DELETED_RECORD];

  assert.equal(filterRecordsByScope(records, RECORD_SCOPES.all), records);
});

test("record scopes reject unsupported values", () => {
  assert.throws(() => requireRecordScope("visible"), /Unsupported record scope/);
});

test("deletion transitions preserve record content", () => {
  const deleted = createDeletionTransition(ACTIVE_RECORD, true, { now: () => DELETED_AT });

  assert.equal(deleted.id, ACTIVE_RECORD.id);
  assert.deepEqual(parseDeletionLifecycle(deleted, "Item"), {
    createdAt: CREATED_AT,
    deletedAt: DELETED_AT,
    isDeleted: true,
    updatedAt: DELETED_AT
  });
});

test("restoration transitions clear deletion metadata", () => {
  const restored = createDeletionTransition(DELETED_RECORD, false, { now: () => RESTORED_AT });

  assert.equal(restored.id, DELETED_RECORD.id);
  assert.equal(restored.isDeleted, false);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.updatedAt, RESTORED_AT);
});

test("lifecycle parsing rejects deleted records without deletion time", () => {
  assert.throws(
    () => parseDeletionLifecycle({ ...DELETED_RECORD, deletedAt: null }, "Item"),
    /deletedAt is required/
  );
});

test("lifecycle parsing rejects deletion outside the record lifetime", () => {
  assert.throws(
    () => parseDeletionLifecycle({
      ...DELETED_RECORD,
      deletedAt: "2026-07-19T00:00:00.000Z"
    }, "Item"),
    /between createdAt and updatedAt/
  );
});
