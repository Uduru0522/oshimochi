import assert from "node:assert/strict";
import test from "node:test";

import {
  assertItemContentUpdate,
  assertItemLifecycleUpdate,
  createItemRecord,
  parseItemRecord
} from "../../../src/data/models/item.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";
const NEXT_TIME = "2026-07-21T00:00:00.000Z";

function createCurrentItem(overrides = {}) {
  return createItemRecord(
    {
      id: "item-1",
      goodsTypeId: "figures",
      name: "First figure",
      customValues: { first: 1, second: 2 },
      ...overrides
    },
    { now: () => FIXED_TIME }
  );
}

function deleteItem(item, overrides = {}) {
  return {
    ...item,
    deletedAt: NEXT_TIME,
    isDeleted: true,
    updatedAt: NEXT_TIME,
    ...overrides
  };
}

test("item creation normalizes editable text and supplies defaults", () => {
  const item = createItemRecord(
    {
      id: " item-1 ",
      goodsTypeId: " figures ",
      name: " First figure ",
      customValues: { scale: "1/7" }
    },
    { now: () => FIXED_TIME }
  );

  assert.equal(item.name, "First figure");
  assert.equal(item.imageAssetId, null);
  assert.deepEqual(item.customValues, { scale: "1/7" });
});

test("item parsing rejects non-JSON custom values", () => {
  const item = createCurrentItem();

  assert.throws(
    () => parseItemRecord({ ...item, customValues: { bad: Infinity } }),
    /JSON-compatible/
  );
});

test("item content updates allow edits to the same active item", () => {
  const currentItem = createCurrentItem();
  const editedItem = { ...currentItem, name: "Edited figure", updatedAt: NEXT_TIME };

  assert.doesNotThrow(() => assertItemContentUpdate(currentItem, editedItem));
});

test("item content updates reject lifecycle changes", () => {
  const currentItem = createCurrentItem();

  assert.throws(
    () => assertItemContentUpdate(currentItem, deleteItem(currentItem)),
    /active item identity/
  );
});

test("item lifecycle updates allow deletion without content changes", () => {
  const currentItem = createCurrentItem();

  assert.doesNotThrow(() => assertItemLifecycleUpdate(currentItem, deleteItem(currentItem)));
});

test("item lifecycle equality ignores custom-value key order", () => {
  const currentItem = createCurrentItem();

  assert.doesNotThrow(() => assertItemLifecycleUpdate(currentItem, deleteItem(currentItem, {
    customValues: { second: 2, first: 1 }
  })));
});

test("item lifecycle updates reject content changes", () => {
  const currentItem = createCurrentItem();

  assert.throws(
    () => assertItemLifecycleUpdate(currentItem, deleteItem(currentItem, { name: "Changed" })),
    /only change deletion state/
  );
});

test("item updates reject timestamps moving backwards", () => {
  const currentItem = createCurrentItem({
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: NEXT_TIME
  });

  assert.throws(
    () => assertItemContentUpdate(currentItem, {
      ...currentItem,
      name: "Changed",
      updatedAt: FIXED_TIME
    }),
    /cannot move updatedAt backwards/
  );
});
