import assert from "node:assert/strict";
import test from "node:test";

import { createItemRepository } from "../../../src/data/indexeddb/item-repository.js";
import { OBJECT_STORES } from "../../../src/data/indexeddb/database-schema.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import {
  EXPECTED_ITEM_QUERY,
  createIndexReadDatabase,
  createItemFixture,
  createWriteDatabase
} from "../../../test-support/indexeddb-fakes.js";

test("item repository lists active items only", async () => {
  const item = createItemFixture();
  const repository = createItemRepository(createIndexReadDatabase([
    item,
    { ...item, id: "deleted", isDeleted: true, deletedAt: item.updatedAt }
  ]));

  assert.deepEqual((await repository.list("figures")).map(({ id }) => id), ["figure-1"]);
});

test("item repository can list deleted items for recovery", async () => {
  const item = createItemFixture();
  const repository = createItemRepository(createIndexReadDatabase([
    item,
    { ...item, id: "deleted", isDeleted: true, deletedAt: item.updatedAt }
  ]));

  assert.deepEqual(
    (await repository.list("figures", { scope: "deleted" })).map(({ id }) => id),
    ["deleted"]
  );
});

test("item repository can list the complete item catalog for export", async () => {
  const item = createItemFixture();
  const repository = createItemRepository(createIndexReadDatabase([
    item,
    { ...item, id: "deleted", isDeleted: true, deletedAt: item.updatedAt }
  ]));

  assert.deepEqual(
    (await repository.list("figures", { scope: "all" })).map(({ id }) => id),
    ["figure-1", "deleted"]
  );
});

test("item repository reads through the goods-type index", async () => {
  const database = createIndexReadDatabase([]);
  const repository = createItemRepository(database);

  await repository.list("figures");

  assert.deepEqual(database.queries, [EXPECTED_ITEM_QUERY]);
});

test("item repository rejects an invalid record scope before reading storage", async () => {
  const database = createIndexReadDatabase([]);
  const repository = createItemRepository(database);

  await assert.rejects(repository.list("figures", { scope: "visible" }), /Unsupported record scope/);
  assert.deepEqual(database.queries, []);
});

test("item repository writes an item in one transaction", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = createItemFixture();

  await repository.create({ asset: null, item });

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.writes, [
    { record: item, storeName: OBJECT_STORES.items }
  ]);
});

test("item repository writes an image and item atomically", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = createItemFixture({ imageAssetId: "asset-1" });
  const asset = createAsset("asset-1", item.createdAt, "image");

  await repository.create({ asset, item });

  assert.deepEqual(database.transactions, [{
    mode: "readwrite",
    storeNames: [OBJECT_STORES.assets, OBJECT_STORES.items]
  }]);
  assert.deepEqual(
    database.writes.map(({ storeName }) => storeName),
    [OBJECT_STORES.assets, OBJECT_STORES.items]
  );
});

test("item repository updates content without rewriting an unchanged image", async () => {
  const existingItem = createItemFixture();
  const database = createWriteDatabase({ existingItems: [existingItem] });
  const repository = createItemRepository(database);
  const item = { ...existingItem, name: "Updated" };

  await repository.updateContent({ item });

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.writes, [
    { record: item, storeName: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.deletes, []);
});

test("item repository replaces an image and item atomically", async () => {
  const existingItem = createItemFixture({ imageAssetId: "asset-1" });
  const database = createWriteDatabase({ existingItems: [existingItem] });
  const repository = createItemRepository(database);
  const item = { ...existingItem, imageAssetId: "asset-2" };
  const asset = createAsset("asset-2", item.createdAt, "replacement");

  await repository.updateContent({ asset, item, previousImageAssetId: "asset-1" });

  assert.deepEqual(database.transactions, [{
    mode: "readwrite",
    storeNames: [OBJECT_STORES.assets, OBJECT_STORES.items]
  }]);
  assert.deepEqual(database.deletes, [
    { id: "asset-1", storeName: OBJECT_STORES.assets }
  ]);
});

test("item repository updates lifecycle without opening the asset store", async () => {
  const existingItem = createItemFixture();
  const database = createWriteDatabase({ existingItems: [existingItem] });
  const item = {
    ...existingItem,
    deletedAt: "2026-07-21T00:00:00.000Z",
    isDeleted: true,
    updatedAt: "2026-07-21T00:00:00.000Z"
  };
  const repository = createItemRepository(database);

  await repository.updateLifecycle(item);

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.writes, [
    { record: item, storeName: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.deletes, []);
});

test("item repository rejects lifecycle writes that change item content", async () => {
  const existingItem = createItemFixture();
  const database = createWriteDatabase({ existingItems: [existingItem] });
  const repository = createItemRepository(database);

  await assert.rejects(
    repository.updateLifecycle({
      ...existingItem,
      name: "Changed during deletion",
      deletedAt: "2026-07-21T00:00:00.000Z",
      isDeleted: true,
      updatedAt: "2026-07-21T00:00:00.000Z"
    }),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.writes, []);
});

test("item repository rejects invalid records before opening a transaction", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);

  await assert.rejects(
    repository.create({ id: "invalid" }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
});

function createAsset(id, timestamp, contents) {
  const data = new Blob([contents], { type: "image/jpeg" });

  return {
    id,
    data,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: data.size,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
