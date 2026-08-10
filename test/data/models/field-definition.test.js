import assert from "node:assert/strict";
import test from "node:test";

import {
  createFieldDefinitionRecord,
  parseFieldDefinitionRecord
} from "../../../src/data/models/field-definition.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createField(overrides = {}) {
  return createFieldDefinitionRecord(
    {
      id: "field-id",
      goodsTypeId: "goods-type-id",
      key: "item_code",
      displayName: "Item code",
      dataType: "text",
      position: 3,
      ...overrides
    },
    { now: () => FIXED_TIME }
  );
}

test("field-definition creation normalizes editable identity and defaults", () => {
  const record = createField({
    id: " field-id ",
    goodsTypeId: " goods-type-id ",
    key: " item_code ",
    displayName: " Item code "
  });

  assert.equal(record.key, "item_code");
  assert.equal(record.displayName, "Item code");
  assert.equal(record.isBuiltIn, false);
  assert.equal(record.createdAt, FIXED_TIME);
});

test("field-definition creation preserves JSON-compatible default values", () => {
  const record = createField({ defaultValue: ["first", 2, true] });

  assert.deepEqual(record.defaultValue, ["first", 2, true]);
});

test("field-definition parsing requires lowercase snake-case keys", () => {
  const record = createField();

  assert.throws(
    () => parseFieldDefinitionRecord({ ...record, key: "Item Code" }),
    /lowercase snake_case/
  );
});

test("selection fields preserve stable option identities", () => {
  const selection = createField({
    id: "status",
    key: "status",
    displayName: "Status",
    dataType: "select",
    options: {
      choices: [
        { id: "owned", label: "Owned" },
        { id: "ordered", label: "Ordered" }
      ]
    }
  });

  assert.deepEqual(selection.options.choices, [
    { id: "owned", label: "Owned" },
    { id: "ordered", label: "Ordered" }
  ]);
});

test("selection fields reject duplicate option identity", () => {
  assert.throws(
    () => createField({
      id: "status",
      key: "status",
      dataType: "select",
      options: {
        choices: [
          { id: "duplicate", label: "Owned" },
          { id: "duplicate", label: "Ordered" }
        ]
      }
    }),
    /must be unique/
  );
});

test("selection fields require at least one option", () => {
  assert.throws(
    () => createField({ id: "status", key: "status", dataType: "select", options: null }),
    /require at least one option/
  );
});

test("two-option fields provide backward-compatible default labels", () => {
  const toggle = createField({
    id: "censored",
    key: "censored",
    dataType: "boolean"
  });

  assert.deepEqual(toggle.options, { falseLabel: "No", trueLabel: "Yes" });
});

test("two-option fields preserve configured labels", () => {
  const toggle = createField({
    id: "censored",
    key: "censored",
    dataType: "boolean",
    options: { falseLabel: "Uncensored", trueLabel: "Censored" }
  });

  assert.deepEqual(toggle.options, {
    falseLabel: "Uncensored",
    trueLabel: "Censored"
  });
});

test("two-option fields reject empty labels", () => {
  assert.throws(
    () => createField({
      id: "censored",
      key: "censored",
      dataType: "boolean",
      options: { falseLabel: "", trueLabel: "On" }
    }),
    /non-empty/
  );
});

test("two-option fields reject equivalent normalized labels", () => {
  assert.throws(
    () => createField({
      id: "censored",
      key: "censored",
      dataType: "boolean",
      options: { falseLabel: "Same label", trueLabel: "same  label" }
    }),
    /must be different/
  );
});
