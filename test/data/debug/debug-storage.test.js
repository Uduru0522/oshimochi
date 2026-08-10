import assert from "node:assert/strict";
import test from "node:test";

import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createItemRecord } from "../../../src/data/models/item.js";

test("DebugStorage rejects reads before initialization", async () => {
  const storage = createDebugStorage();

  await assert.rejects(
    storage.listGoodsTypes(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
});

test("DebugStorage rejects reads after it is closed", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  storage.close();

  await assert.rejects(
    storage.listGoodsTypes(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
});

test("DebugStorage returns copies isolated from its catalog", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  const firstRead = await storage.listGoodsTypes();
  firstRead[0].displayName = "Changed outside storage";

  const secondRead = await storage.listGoodsTypes();
  assert.equal(secondRead.length, 3);
  assert.equal(secondRead[0].displayName, "Tapestries");
});

test("DebugStorage fixtures cover item-management test dimensions", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  const goodsTypes = await storage.listGoodsTypes();
  const allFields = (await Promise.all(
    goodsTypes.map(({ id }) => storage.listFieldDefinitions(id))
  )).flat();
  const customTypes = new Set(
    allFields.filter(({ isBuiltIn }) => !isBuiltIn).map(({ dataType }) => dataType)
  );
  const tapestries = await storage.listItems("tapestries");
  const legacyItem = tapestries.find(({ id }) => id === "tapestry-legacy-record");
  const optionalItem = tapestries.find(({ id }) => id === "tapestry-winter-cafe");
  const tapestryAssets = await Promise.all(
    tapestries.map(({ imageAssetId }) => storage.getAsset(imageAssetId))
  );
  const seriesValues = tapestries
    .map(({ customValues }) => customValues["tapestries-series"])
    .filter(Boolean);
  const widths = tapestries
    .map(({ customValues }) => customValues["tapestries-width_cm"])
    .filter(Number.isFinite);
  const conditions = new Set(
    tapestries
      .map(({ customValues }) => customValues["tapestries-condition"])
      .filter(Boolean)
  );
  const displayStates = new Set(
    tapestries.map(({ customValues }) => customValues["tapestries-display_status"])
  );
  const imageOrientations = new Set(
    tapestryAssets.map(({ width, height }) => width < height ? "portrait" : "landscape")
  );

  assert.deepEqual(
    [...customTypes].sort(),
    ["boolean", "date", "long_text", "number", "select", "text", "url"]
  );
  assert.ok(tapestries.length >= 20);
  assert.ok(new Set(seriesValues).size >= 6);
  assert.ok(seriesValues.length > new Set(seriesValues).size);
  assert.ok(new Set(widths).size >= 8);
  assert.deepEqual([...conditions].sort(), ["displayed", "opened", "sealed"]);
  assert.deepEqual([...displayStates].sort(), [false, true]);
  assert.deepEqual([...imageOrientations].sort(), ["landscape", "portrait"]);
  assert.equal(Object.hasOwn(legacyItem.customValues, "tapestries-series"), false);
  assert.equal(Object.hasOwn(optionalItem.customValues, "tapestries-notes"), false);
  assert.equal(tapestryAssets.every(({ mediaType }) => mediaType === "image/svg+xml"), true);
  assert.equal(tapestryAssets.every(({ data }) => data.size > 0), true);
});

test("DebugStorage reset clears all temporary domain records", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  await storage.createItem({
    asset: null,
    item: createItemRecord({ id: "figure-1", goodsTypeId: "figures", name: "Figure" })
  });

  await storage.resetData();

  assert.deepEqual(await storage.listGoodsTypes(), []);
  assert.deepEqual(await storage.listFieldDefinitions("figures"), []);
  assert.deepEqual(await storage.listItems("figures"), []);
});
