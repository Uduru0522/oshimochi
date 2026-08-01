import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ITEM_SORT,
  ITEM_SORT_DIRECTIONS as DIRECTION,
  sortItems
} from "../../src/application/items/sort-items.js";

const fields = [
  { id: "name", key: "name", dataType: "text", isBuiltIn: true },
  { id: "price", dataType: "number", isBuiltIn: false },
  { id: "release", dataType: "date", isBuiltIn: false },
  {
    id: "limited",
    dataType: "boolean",
    isBuiltIn: false,
    options: { falseLabel: "Standard", trueLabel: "Exclusive" }
  },
  {
    id: "condition",
    dataType: "select",
    isBuiltIn: false,
    options: {
      choices: [
        { id: "z-internal", label: "Archived" },
        { id: "a-internal", label: "New" }
      ]
    }
  }
];

const items = [
  {
    id: "item-1",
    name: "Item 10",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
    customValues: {
      price: 10,
      release: "2026-03-01",
      limited: true,
      condition: "z-internal"
    }
  },
  {
    id: "item-2",
    name: "item 2",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
    customValues: {
      price: 2,
      release: "2026-01-01",
      limited: false,
      condition: "a-internal"
    }
  },
  {
    id: "item-3",
    name: "Alpha",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    customValues: {}
  }
];

function ids(sort) {
  return sortItems(items, fields, sort).map(({ id }) => id);
}

test("default sorting preserves the current recently-updated order", () => {
  assert.deepEqual(ids(DEFAULT_ITEM_SORT), ["item-1", "item-2", "item-3"]);
});

test("metadata sorting supports both directions", () => {
  assert.deepEqual(ids({
    type: "metadata",
    key: "createdAt",
    direction: DIRECTION.ASCENDING
  }), ["item-1", "item-3", "item-2"]);
  assert.deepEqual(ids({
    type: "metadata",
    key: "createdAt",
    direction: DIRECTION.DESCENDING
  }), ["item-2", "item-3", "item-1"]);
});

test("text sorting is case-insensitive and uses natural numeric order", () => {
  assert.deepEqual(ids({
    type: "field",
    fieldId: "name",
    direction: DIRECTION.ASCENDING
  }), ["item-3", "item-2", "item-1"]);
});

test("typed custom values sort correctly and missing values remain last", () => {
  assert.deepEqual(ids({
    type: "field",
    fieldId: "price",
    direction: DIRECTION.DESCENDING
  }), ["item-1", "item-2", "item-3"]);
  assert.deepEqual(ids({
    type: "field",
    fieldId: "release",
    direction: DIRECTION.ASCENDING
  }), ["item-2", "item-1", "item-3"]);
  assert.deepEqual(ids({
    type: "field",
    fieldId: "limited",
    direction: DIRECTION.ASCENDING
  }), ["item-1", "item-2", "item-3"]);
  assert.deepEqual(ids({
    type: "field",
    fieldId: "condition",
    direction: DIRECTION.ASCENDING
  }), ["item-1", "item-2", "item-3"]);
});

test("equal values retain their source order", () => {
  const tiedItems = items.map((item) => ({
    ...item,
    customValues: { ...item.customValues, price: 5 }
  }));
  assert.deepEqual(
    sortItems(tiedItems, fields, {
      type: "field",
      fieldId: "price",
      direction: DIRECTION.ASCENDING
    }).map(({ id }) => id),
    ["item-1", "item-2", "item-3"]
  );
});
