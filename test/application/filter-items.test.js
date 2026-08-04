import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM_FILTER_OPERATORS as OP,
  countActiveItemFilters,
  filterItems,
  getItemSearchMatchingFieldIds,
  getNumberFilterDomain,
  parseItemSearchQuery
} from "../../src/application/items/filter-items.js";

const fields = [
  { id: "field-id", key: "id", displayName: "ID", dataType: "text", isBuiltIn: true },
  { id: "field-name", key: "name", displayName: "Name", dataType: "text", isBuiltIn: true },
  { id: "field-image", key: "image", displayName: "Image", dataType: "image", isBuiltIn: true },
  { id: "notes", displayName: "Notes", dataType: "long_text", isBuiltIn: false },
  { id: "price", displayName: "Price", dataType: "number", isBuiltIn: false },
  { id: "released", displayName: "Released", dataType: "date", isBuiltIn: false },
  {
    id: "edition",
    displayName: "Edition",
    dataType: "boolean",
    isBuiltIn: false,
    options: { falseLabel: "Standard", trueLabel: "Limited" }
  },
  {
    id: "condition",
    displayName: "Condition",
    dataType: "select",
    isBuiltIn: false,
    options: {
      choices: [
        { id: "sealed", label: "Factory sealed" },
        { id: "opened", label: "Opened" }
      ]
    }
  },
  { id: "source", displayName: "Source", dataType: "url", isBuiltIn: false }
];

const items = [
  {
    id: "item-1",
    name: "Summer Festival Tapestry",
    imageAssetId: "asset-1",
    customValues: {
      notes: "Blue sky limited release",
      price: 1200,
      released: "2026-06-01",
      edition: true,
      condition: "sealed",
      source: "https://shop.example.com/summer"
    }
  },
  {
    id: "item-2",
    name: "Winter Cafe Tapestry",
    imageAssetId: "asset-2",
    customValues: {
      notes: "Warm interior",
      price: 800,
      released: "2025-12-10",
      edition: false,
      condition: "opened",
      source: "https://archive.example.org/winter"
    }
  },
  {
    id: "item-3",
    name: "Legacy Record",
    imageAssetId: null,
    customValues: { notes: "", price: 0 }
  }
];

function ids(filter) {
  return filterItems(items, fields, filter).map(({ id }) => id);
}

test("general search parses phrases, exclusions, and escaped quotes", () => {
  assert.deepEqual(
    parseItemSearchQuery('festival "limited release" -winter -"factory opened" "say \\"hi\\""'),
    [
      { exact: false, excluded: false, value: "festival" },
      { exact: true, excluded: false, value: "limited release" },
      { exact: false, excluded: true, value: "winter" },
      { exact: true, excluded: true, value: "factory opened" },
      { exact: true, excluded: false, value: 'say "hi"' }
    ]
  );
});

test("general search covers human-readable values and combines terms with AND", () => {
  assert.deepEqual(ids({ query: 'festival "factory sealed" -winter' }), ["item-1"]);
  assert.deepEqual(ids({ query: "limited example.com" }), ["item-1"]);
  assert.deepEqual(ids({ query: "item-1" }), []);
});

test("general search reports the fields that explain a positive match", () => {
  assert.deepEqual(
    getItemSearchMatchingFieldIds(items[0], fields, 'festival "limited release" example.com'),
    ["field-name", "notes", "source"]
  );
  assert.deepEqual(getItemSearchMatchingFieldIds(items[0], fields, "-winter"), []);
});

test("text filters support comparisons and optional missing-value inclusion", () => {
  assert.deepEqual(ids({ rules: [{ fieldId: "notes", operator: OP.STARTS_WITH, value: "blue" }] }), ["item-1"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "notes", operator: OP.NOT_CONTAINS, value: "interior" }] }), ["item-1"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "notes", includeMissing: true, operator: OP.CONTAINS, value: "blue" }] }), ["item-1", "item-3"]);
});

test("number ranges are inclusive and allow either bound to remain open", () => {
  assert.deepEqual(ids({ rules: [{ fieldId: "price", operator: OP.RANGE, min: 900 }] }), ["item-1"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "price", operator: OP.RANGE, max: 800 }] }), ["item-2", "item-3"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "price", operator: OP.RANGE, min: 0, max: 0 }] }), ["item-3"]);
});

test("date filters support exact, comparison, and bounded ranges", () => {
  assert.deepEqual(ids({ rules: [{ fieldId: "released", from: "", to: "2026-01-01" }] }), ["item-2"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "released", from: "2025-12-01", to: "2026-06-01" }] }), ["item-1", "item-2"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "released", from: "2026-06-01", to: "2026-06-01" }] }), ["item-1"]);
});

test("two-option, selection, URL, and image filters use typed values", () => {
  assert.deepEqual(ids({ rules: [{ fieldId: "edition", values: [false] }] }), ["item-2"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "edition", values: [] }] }), ["item-3"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "condition", values: ["sealed", "opened"] }] }), ["item-1", "item-2"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "condition", includeMissing: true, values: ["sealed"] }] }), ["item-1", "item-3"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "source", operator: OP.DOMAIN_EQUALS, value: "shop.example.com" }] }), ["item-1"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "field-image", values: [] }] }), ["item-3"]);
});

test("different field filters combine with AND and deleted field rules match nothing", () => {
  assert.deepEqual(ids({
    rules: [
      { fieldId: "price", operator: OP.RANGE, min: 1000 },
      { fieldId: "edition", values: [true] }
    ]
  }), ["item-1"]);
  assert.deepEqual(ids({ rules: [{ fieldId: "deleted-field", values: [true] }] }), []);
});

test("number filter domains use only finite values from the selected field", () => {
  const priceField = fields.find(({ id }) => id === "price");
  assert.deepEqual(getNumberFilterDomain(items, priceField), {
    max: 1200,
    min: 0,
    values: [0, 800, 1200]
  });
  assert.deepEqual(getNumberFilterDomain([
    { customValues: { price: 10 } },
    { customValues: { price: 20 } },
    { customValues: { price: 20 } },
    { customValues: { price: 1e150 } }
  ], priceField), {
    max: 1e150,
    min: 10,
    values: [10, 20, 1e150]
  });
  assert.equal(getNumberFilterDomain(items, { ...fields[3], id: "missing" }), null);
});

test("active filter count treats general search as one filter", () => {
  assert.equal(countActiveItemFilters({ query: "  ", rules: [] }), 0);
  assert.equal(countActiveItemFilters({ query: "summer", rules: [{ fieldId: "price" }] }), 2);
});
