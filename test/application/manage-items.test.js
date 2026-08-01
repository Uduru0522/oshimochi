import assert from "node:assert/strict";
import test from "node:test";

import {
  createItemManagementOperations
} from "../../src/application/items/manage-items.js";
import {
  normalizeHttpsUrl,
  normalizeItemValues
} from "../../src/application/items/item-values.js";
import { createFieldDefinitionRecord } from "../../src/data/models/field-definition.js";
import { createItemRecord, parseItemRecord } from "../../src/data/models/item.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";
const TEST_IMAGE = Object.freeze({
  data: new Blob(["image"], { type: "image/jpeg" }),
  height: 792,
  mediaType: "image/jpeg",
  width: 560
});

function createField(input) {
  return createFieldDefinitionRecord(
    {
      goodsTypeId: "figures",
      position: 3,
      ...input
    },
    { now: () => FIXED_TIME }
  );
}

test("item records normalize creation input and reject invalid persisted values", () => {
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
  assert.throws(() => parseItemRecord({ ...item, customValues: { bad: Infinity } }), /JSON/);
});

test("item values validate supported field types and stable selection IDs", () => {
  const fields = [
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

  assert.deepEqual(
    normalizeItemValues(fields, {
      release: "2026-07-20",
      price: 1200,
      status: "owned"
    }),
    { release: "2026-07-20", price: 1200, status: "owned" }
  );
  assert.throws(
    () => normalizeItemValues(fields, { release: "2026-02-30" }),
    /valid date/
  );
  assert.throws(
    () => normalizeItemValues(fields, { release: "45235-12-31" }),
    /Release must be a valid date/
  );
  assert.throws(
    () => normalizeItemValues(fields, { status: "unknown" }),
    /invalid selection/
  );
  assert.throws(() => normalizeItemValues(fields, { removed: "value" }), /Unknown/);
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

test("web addresses default to https and reject explicit insecure URLs", () => {
  assert.equal(normalizeHttpsUrl("www.google.com"), "https://www.google.com/");
  assert.equal(normalizeHttpsUrl("https://example.com/path"), "https://example.com/path");
  assert.throws(() => normalizeHttpsUrl("http://example.com"), /must use https/);
});

test("item creation reloads active fields and writes one validated record", async () => {
  const writes = [];
  const generatedIds = ["asset-1", "item-1"];
  const nameField = createField({
    id: "field-name",
    key: "name",
    displayName: "Name",
    dataType: "text",
    isBuiltIn: true,
    isRequired: true,
    position: 1
  });
  const notesField = createField({
    id: "notes",
    key: "notes",
    displayName: "Notes",
    dataType: "long_text"
  });
  const operations = createItemManagementOperations({
    storage: {
      async createItem(item) { writes.push(item); },
      async getAsset() { return null; },
      async listFieldDefinitions() { return [nameField, notesField]; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return []; },
      async updateItem() {}
    },
    generateId: () => generatedIds.shift(),
    now: () => FIXED_TIME
  });

  const result = await operations.createItem({
    goodsTypeId: "figures",
    image: TEST_IMAGE,
    name: " Example ",
    customValues: { notes: "Boxed" }
  });

  assert.equal(writes.length, 1);
  assert.deepEqual(result, writes[0]);
  assert.equal(result.item.name, "Example");
  assert.deepEqual(result.item.customValues, { notes: "Boxed" });
  assert.equal(result.asset.id, "asset-1");
});

test("item creation requires an image", async () => {
  const operations = createItemManagementOperations({
    storage: {
      async createItem() { throw new Error("should not write"); },
      async getAsset() { return null; },
      async listFieldDefinitions() { return []; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return []; },
      async updateItem() {}
    }
  });

  await assert.rejects(
    operations.createItem({ goodsTypeId: "figures", name: "Example" }),
    /Image is required/
  );
});

test("item creation builds an image asset and item reference for one storage write", async () => {
  const writes = [];
  const generatedIds = ["asset-1", "item-1"];
  const operations = createItemManagementOperations({
    storage: {
      async createItem(bundle) { writes.push(bundle); },
      async getAsset() { return null; },
      async listFieldDefinitions() { return []; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return []; },
      async updateItem() {}
    },
    generateId: () => generatedIds.shift(),
    now: () => FIXED_TIME
  });

  const result = await operations.createItem({
    goodsTypeId: "figures",
    image: TEST_IMAGE,
    name: "Example"
  });

  assert.equal(result.asset.id, "asset-1");
  assert.equal(result.item.id, "item-1");
  assert.equal(result.item.imageAssetId, "asset-1");
  assert.deepEqual(writes, [result]);
});

test("item updates preserve identity and the existing image when it is unchanged", async () => {
  const writes = [];
  const notesField = createField({
    id: "notes",
    key: "notes",
    displayName: "Notes",
    dataType: "long_text"
  });
  const existingItem = createItemRecord({
    id: "item-1",
    goodsTypeId: "figures",
    name: "Original",
    imageAssetId: "asset-1",
    customValues: { notes: "Old" },
    createdAt: "2026-07-19T00:00:00.000Z"
  }, { now: () => FIXED_TIME });
  const operations = createItemManagementOperations({
    storage: {
      async createItem() {},
      async getAsset() { return null; },
      async listFieldDefinitions() { return [notesField]; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return [existingItem]; },
      async updateItem(change) { writes.push(change); }
    },
    now: () => "2026-07-21T00:00:00.000Z"
  });

  const result = await operations.updateItem({
    item: existingItem,
    name: " Updated ",
    customValues: { notes: "New" }
  });

  assert.equal(result.asset, null);
  assert.equal(result.previousImageAssetId, null);
  assert.equal(result.item.id, existingItem.id);
  assert.equal(result.item.createdAt, existingItem.createdAt);
  assert.equal(result.item.updatedAt, "2026-07-21T00:00:00.000Z");
  assert.equal(result.item.imageAssetId, "asset-1");
  assert.equal(result.item.name, "Updated");
  assert.deepEqual(writes, [result]);
});

test("item updates replace images through one storage request", async () => {
  const writes = [];
  const existingItem = createItemRecord({
    id: "item-1",
    goodsTypeId: "figures",
    name: "Original",
    imageAssetId: "asset-1"
  }, { now: () => FIXED_TIME });
  const operations = createItemManagementOperations({
    storage: {
      async createItem() {},
      async getAsset() { return null; },
      async listFieldDefinitions() { return []; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return [existingItem]; },
      async updateItem(change) { writes.push(change); }
    },
    generateId: () => "asset-2",
    now: () => "2026-07-21T00:00:00.000Z"
  });

  const result = await operations.updateItem({
    item: existingItem,
    image: TEST_IMAGE,
    name: "Original"
  });

  assert.equal(result.asset.id, "asset-2");
  assert.equal(result.item.imageAssetId, "asset-2");
  assert.equal(result.previousImageAssetId, "asset-1");
  assert.deepEqual(writes, [result]);
});

test("item soft deletion retains data and marks deletion timestamps atomically", async () => {
  const writes = [];
  const existingItem = createItemRecord({
    id: "item-1",
    goodsTypeId: "figures",
    name: "Original",
    imageAssetId: "asset-1",
    customValues: { notes: "Keep this" }
  }, { now: () => FIXED_TIME });
  const operations = createItemManagementOperations({
    storage: {
      async createItem() {},
      async getAsset() { return null; },
      async listFieldDefinitions() { return []; },
      async listGoodsTypes() { return [{ id: "figures" }]; },
      async listItems() { return [existingItem]; },
      async updateItem(change) { writes.push(change); }
    },
    now: () => "2026-07-21T00:00:00.000Z"
  });

  const deletedItem = await operations.softDeleteItem(existingItem);

  assert.equal(deletedItem.isDeleted, true);
  assert.equal(deletedItem.deletedAt, "2026-07-21T00:00:00.000Z");
  assert.equal(deletedItem.updatedAt, "2026-07-21T00:00:00.000Z");
  assert.equal(deletedItem.imageAssetId, existingItem.imageAssetId);
  assert.deepEqual(deletedItem.customValues, existingItem.customValues);
  assert.deepEqual(writes, [{
    asset: null,
    item: deletedItem,
    previousImageAssetId: null
  }]);
});
