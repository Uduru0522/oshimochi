import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeHttpsUrl,
  normalizeItemValues
} from "../../src/application/items/item-values.js";
import { createFieldDefinitionRecord } from "../../src/data/models/field-definition.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createField(input) {
  return createFieldDefinitionRecord(
    { goodsTypeId: "figures", position: 3, ...input },
    { now: () => FIXED_TIME }
  );
}

function createTypedFields() {
  return [
    createField({ id: "release", key: "release", displayName: "Release", dataType: "date" }),
    createField({ id: "price", key: "price", displayName: "Price", dataType: "number" }),
    createField({
      id: "status",
      key: "status",
      displayName: "Status",
      dataType: "select",
      options: { choices: [{ id: "owned", label: "Owned" }] }
    })
  ];
}

test("item values normalize supported field types", () => {
  assert.deepEqual(
    normalizeItemValues(createTypedFields(), {
      release: "2026-07-20",
      price: 1200,
      status: "owned"
    }),
    { release: "2026-07-20", price: 1200, status: "owned" }
  );
});

test("item values reject impossible calendar dates", () => {
  assert.throws(
    () => normalizeItemValues(createTypedFields(), { release: "2026-02-30" }),
    /valid date/
  );
});

test("item values reject years outside the supported date range", () => {
  assert.throws(
    () => normalizeItemValues(createTypedFields(), { release: "45235-12-31" }),
    /Release must be a valid date/
  );
});

test("item values reject unknown selection identity", () => {
  assert.throws(
    () => normalizeItemValues(createTypedFields(), { status: "unknown" }),
    /invalid selection/
  );
});

test("item values reject values for unknown fields", () => {
  assert.throws(
    () => normalizeItemValues(createTypedFields(), { removed: "value" }),
    /Unknown/
  );
});

test("required text is checked after whitespace normalization", () => {
  const field = createField({
    id: "maker",
    key: "maker",
    displayName: "Maker",
    dataType: "text",
    isRequired: true
  });

  assert.throws(() => normalizeItemValues([field], { maker: "   " }), /Maker is required/);
});

test("web addresses default scheme-less values to HTTPS", () => {
  assert.equal(normalizeHttpsUrl("www.google.com"), "https://www.google.com/");
});

test("web addresses preserve explicit HTTPS values", () => {
  assert.equal(normalizeHttpsUrl("https://example.com/path"), "https://example.com/path");
});

test("web addresses reject explicit insecure HTTP", () => {
  assert.throws(() => normalizeHttpsUrl("http://example.com"), /must use https/);
});
