import assert from "node:assert/strict";
import test from "node:test";

import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createItemRecord } from "../../../src/data/models/item.js";
import {
  RECORD_SCOPES,
  createDeletionTransition
} from "../../../src/data/models/record-lifecycle.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createFigureItem(overrides = {}) {
  return createItemRecord(
    {
      id: "figure-1",
      goodsTypeId: "figures",
      name: "Example figure",
      customValues: {},
      ...overrides
    },
    { now: () => FIXED_TIME }
  );
}

function createAsset(id, contents = "image", timestamp = FIXED_TIME) {
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

test("DebugStorage creates isolated item records", async () => {
  const storage = createDebugStorage();
  const item = createFigureItem();

  await storage.initialize();
  await storage.createItem({ asset: null, item });

  const firstRead = await storage.listItems("figures");
  firstRead[0].name = "External change";
  assert.equal((await storage.listItems("figures"))[0].name, "Example figure");
});

test("DebugStorage rejects duplicate item identity", async () => {
  const storage = createDebugStorage();
  const item = createFigureItem();

  await storage.initialize();
  await storage.createItem({ asset: null, item });

  await assert.rejects(storage.createItem({ asset: null, item }), /duplicate identity/);
});

test("DebugStorage rejects items for missing goods types", async () => {
  const storage = createDebugStorage();
  const item = createFigureItem({ id: "wrong-type", goodsTypeId: "missing" });

  await storage.initialize();

  await assert.rejects(
    storage.createItem({ asset: null, item }),
    /invalid or duplicate identity/
  );
});

test("DebugStorage keeps image assets linked to their item", async () => {
  const storage = createDebugStorage();
  const asset = createAsset("asset-1");
  const item = createFigureItem({ id: "figure-with-image", imageAssetId: asset.id });

  await storage.initialize();
  await storage.createItem({ asset, item });

  assert.equal((await storage.getAsset(asset.id)).data.size, asset.data.size);
  assert.equal((await storage.listItems("figures"))[0].imageAssetId, asset.id);
});

test("DebugStorage rejects a new item linked to a different image asset", async () => {
  const storage = createDebugStorage();
  const asset = createAsset("unlinked-asset");
  const item = createFigureItem({
    id: "figure-with-wrong-image",
    imageAssetId: "different-asset"
  });

  await storage.initialize();
  const before = await storage.listItems("figures", { scope: RECORD_SCOPES.all });

  await assert.rejects(storage.createItem({ asset, item }), /invalid data/);

  assert.deepEqual(
    await storage.listItems("figures", { scope: RECORD_SCOPES.all }),
    before
  );
  assert.equal(await storage.getAsset(asset.id), null);
});

test("DebugStorage replaces an edited item and image atomically", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const replacementTime = "2026-07-21T00:00:00.000Z";
  const replacementAsset = createAsset("replacement-asset", "replacement", replacementTime);
  const updatedItem = {
    ...existingItem,
    name: "Updated debug item",
    imageAssetId: replacementAsset.id,
    updatedAt: replacementTime
  };

  await storage.updateItemContent({
    asset: replacementAsset,
    item: updatedItem,
    previousImageAssetId: existingItem.imageAssetId
  });

  assert.equal((await storage.listItems("tapestries"))[0].name, "Updated debug item");
  assert.equal(await storage.getAsset(existingItem.imageAssetId), null);
  assert.equal(
    (await storage.getAsset(replacementAsset.id)).data.size,
    replacementAsset.data.size
  );
});

test("DebugStorage rejects content updates for missing items", async () => {
  const storage = createDebugStorage();
  const missingItem = createFigureItem({ id: "missing-item", name: "Updated name" });

  await storage.initialize();
  const before = await storage.listItems("figures", { scope: RECORD_SCOPES.all });

  await assert.rejects(
    storage.updateItemContent({
      asset: null,
      item: missingItem,
      previousImageAssetId: null
    }),
    /conflicts with the debug catalog/
  );

  assert.deepEqual(
    await storage.listItems("figures", { scope: RECORD_SCOPES.all }),
    before
  );
});

test("DebugStorage rejects replacement images with mismatched identity", async () => {
  const storage = createDebugStorage();
  const replacementTime = "2026-07-21T00:00:00.000Z";
  const replacementAsset = createAsset(
    "mismatched-replacement",
    "replacement",
    replacementTime
  );

  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const before = await storage.listItems("tapestries", { scope: RECORD_SCOPES.all });

  await assert.rejects(
    storage.updateItemContent({
      asset: replacementAsset,
      item: {
        ...existingItem,
        imageAssetId: "different-replacement",
        updatedAt: replacementTime
      },
      previousImageAssetId: existingItem.imageAssetId
    }),
    /invalid data/
  );

  assert.deepEqual(
    await storage.listItems("tapestries", { scope: RECORD_SCOPES.all }),
    before
  );
  assert.equal(await storage.getAsset(replacementAsset.id), null);
});

test("DebugStorage rejects duplicate replacement asset identity atomically", async () => {
  const storage = createDebugStorage();
  const replacementTime = "2026-07-21T00:00:00.000Z";

  await storage.initialize();
  const [existingItem, itemOwningReplacementAsset] =
    await storage.listItems("tapestries");
  const replacementAsset = createAsset(
    itemOwningReplacementAsset.imageAssetId,
    "replacement",
    replacementTime
  );
  const before = await storage.listItems("tapestries", { scope: RECORD_SCOPES.all });

  await assert.rejects(
    storage.updateItemContent({
      asset: replacementAsset,
      item: {
        ...existingItem,
        imageAssetId: replacementAsset.id,
        updatedAt: replacementTime
      },
      previousImageAssetId: existingItem.imageAssetId
    }),
    /conflicts with the debug catalog/
  );

  assert.deepEqual(
    await storage.listItems("tapestries", { scope: RECORD_SCOPES.all }),
    before
  );
  assert.notEqual(await storage.getAsset(existingItem.imageAssetId), null);
  assert.notEqual(await storage.getAsset(replacementAsset.id), null);
});

test("DebugStorage soft deletion retains item data and its image", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const deletedItem = createDeletionTransition(existingItem, true, {
    now: () => "2026-07-21T00:00:00.000Z"
  });

  await storage.updateItemLifecycle(deletedItem);

  assert.equal(
    (await storage.listItems("tapestries")).some(({ id }) => id === deletedItem.id),
    false
  );
  assert.deepEqual(
    (await storage.listItems("tapestries", { scope: RECORD_SCOPES.all })).find(
      ({ id }) => id === deletedItem.id
    ),
    deletedItem
  );
  assert.notEqual(await storage.getAsset(deletedItem.imageAssetId), null);
});

test("DebugStorage restores an item without changing its retained image", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const deletedItem = createDeletionTransition(existingItem, true, {
    now: () => "2026-07-21T00:00:00.000Z"
  });
  const restoredItem = createDeletionTransition(deletedItem, false, {
    now: () => "2026-07-22T00:00:00.000Z"
  });

  await storage.updateItemLifecycle(deletedItem);
  await storage.updateItemLifecycle(restoredItem);

  assert.deepEqual(
    (await storage.listItems("tapestries")).find(({ id }) => id === restoredItem.id),
    restoredItem
  );
  assert.notEqual(await storage.getAsset(restoredItem.imageAssetId), null);
});

test("DebugStorage permanently deletes a soft-deleted item and its image", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const deletedItem = createDeletionTransition(existingItem, true, {
    now: () => "2026-07-21T00:00:00.000Z"
  });
  await storage.updateItemLifecycle(deletedItem);

  const result = await storage.purgeItem(deletedItem.id);

  assert.deepEqual(result, deletedItem);
  assert.equal(
    (await storage.listItems("tapestries", { scope: RECORD_SCOPES.all }))
      .some(({ id }) => id === deletedItem.id),
    false
  );
  assert.equal(await storage.getAsset(deletedItem.imageAssetId), null);
});

test("DebugStorage rejects permanent deletion of active items without changing data", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const before = await storage.listItems("tapestries", { scope: RECORD_SCOPES.all });

  await assert.rejects(storage.purgeItem(before[0].id), /must already be deleted/);

  assert.deepEqual(
    await storage.listItems("tapestries", { scope: RECORD_SCOPES.all }),
    before
  );
  assert.notEqual(await storage.getAsset(before[0].imageAssetId), null);
});
