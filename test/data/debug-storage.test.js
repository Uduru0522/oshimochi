import assert from "node:assert/strict";
import test from "node:test";

import {
  STORAGE_ERROR_CODES,
  StorageError,
  assertStorageAdapter
} from "../../src/data/contracts/storage-contract.js";
import { createDebugStorage } from "../../src/data/debug/debug-storage.js";
import {
  createGoodsTypeRecord,
  parseGoodsTypeRecord
} from "../../src/data/models/goods-type.js";
import { createFieldDefinitionRecord } from "../../src/data/models/field-definition.js";
import { createItemRecord } from "../../src/data/models/item.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

test("createGoodsTypeRecord creates a complete active record", () => {
  const record = createGoodsTypeRecord(
    {
      id: "  figures  ",
      displayName: "  Figures  ",
      description: "Scale figures"
    },
    { now: () => FIXED_TIME }
  );

  assert.deepEqual(record, {
    id: "figures",
    displayName: "Figures",
    description: "Scale figures",
    isDeleted: false,
    deletedAt: null,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME
  });
});

test("createGoodsTypeRecord rejects missing stable identity", () => {
  assert.throws(
    () => createGoodsTypeRecord({ id: "", displayName: "Figures" }),
    /id must be a non-empty string/
  );
});

test("parseGoodsTypeRecord rejects inconsistent deletion state", () => {
  assert.throws(
    () =>
      parseGoodsTypeRecord({
        id: "figures",
        displayName: "Figures",
        description: "",
        isDeleted: false,
        deletedAt: FIXED_TIME,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME
      }),
    /deletedAt must be null/
  );
});

test("parseGoodsTypeRecord rejects malformed timestamps", () => {
  assert.throws(
    () =>
      parseGoodsTypeRecord({
        id: "figures",
        displayName: "Figures",
        description: "",
        isDeleted: false,
        deletedAt: null,
        createdAt: "not-a-date",
        updatedAt: FIXED_TIME
      }),
    /createdAt must be an ISO 8601 UTC timestamp/
  );
});

test("parseGoodsTypeRecord does not normalize persisted text", () => {
  assert.throws(
    () =>
      parseGoodsTypeRecord({
        id: " figures ",
        displayName: "Figures",
        description: "",
        isDeleted: false,
        deletedAt: null,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME
      }),
    /id cannot have leading or trailing whitespace/
  );
});

test("assertStorageAdapter reports missing capabilities", () => {
  assert.throws(
    () => assertStorageAdapter({ initialize() {} }),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidAdapter
  );
});

test("DebugStorage requires initialization and returns isolated copies", async () => {
  const storage = assertStorageAdapter(createDebugStorage());

  await assert.rejects(
    storage.listGoodsTypes(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );

  await storage.initialize();

  const firstRead = await storage.listGoodsTypes();
  firstRead[0].displayName = "Changed outside storage";

  const secondRead = await storage.listGoodsTypes();

  assert.equal(secondRead.length, 3);
  assert.equal(secondRead[0].displayName, "Tapestries");

  storage.close();
  await assert.rejects(storage.listGoodsTypes(), StorageError);
});

test("DebugStorage hides soft-deleted goods types by default", async () => {
  const storage = createDebugStorage({
    goodsTypes: [
      createGoodsTypeRecord({ id: "active", displayName: "Active" }),
      createGoodsTypeRecord({
        id: "deleted",
        displayName: "Deleted",
        isDeleted: true
      })
    ]
  });

  await storage.initialize();

  assert.deepEqual(
    (await storage.listGoodsTypes()).map(({ id }) => id),
    ["active"]
  );
  assert.equal((await storage.listGoodsTypes({ includeDeleted: true })).length, 2);
});

test("DebugStorage creates goods types in memory without partial invalid writes", async () => {
  const storage = createDebugStorage({ goodsTypes: [] });
  const goodsType = createGoodsTypeRecord(
    { id: "figures", displayName: "Figures" },
    { now: () => FIXED_TIME }
  );
  const field = {
    id: "figures-name",
    goodsTypeId: "figures",
    key: "name",
    displayName: "Name",
    dataType: "text",
    isRequired: true,
    isBuiltIn: true,
    position: 0,
    defaultValue: null,
    options: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME
  };

  await storage.initialize();
  await storage.createGoodsType({ goodsType, fieldDefinitions: [field] });

  assert.deepEqual((await storage.listGoodsTypes()).map(({ id }) => id), ["figures"]);
  await assert.rejects(
    storage.createGoodsType({
      goodsType: { ...goodsType, id: "posters", displayName: "Posters" },
      fieldDefinitions: [{ ...field, id: "posters-name", goodsTypeId: "wrong" }]
    }),
    (error) => error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual((await storage.listGoodsTypes()).map(({ id }) => id), ["figures"]);

  await assert.rejects(
    storage.createGoodsType({ goodsType: { id: "invalid" }, fieldDefinitions: [] }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
});

test("DebugStorage lists fixture fields and applies isolated field changes", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  const fixtureFields = await storage.listFieldDefinitions("figures");

  assert.deepEqual(fixtureFields.map(({ key }) => key), [
    "id",
    "name",
    "image",
    "manufacturer",
    "scale",
    "edition"
  ]);

  const customField = createFieldDefinitionRecord(
    {
      id: "figures-test-scale",
      goodsTypeId: "figures",
      key: "test_scale",
      displayName: "Test scale",
      dataType: "text",
      position: 3
    },
    { now: () => FIXED_TIME }
  );
  await storage.saveFieldDefinitions({
    goodsTypeId: "figures",
    fieldDefinitions: [customField]
  });

  const firstRead = await storage.listFieldDefinitions("figures");
  firstRead.find(({ id }) => id === customField.id).displayName = "External change";
  assert.equal(
    (await storage.listFieldDefinitions("figures"))
      .find(({ id }) => id === customField.id)
      .displayName,
    "Test scale"
  );

  await assert.rejects(
    storage.saveFieldDefinitions({
      goodsTypeId: "figures",
      fieldDefinitions: [{ ...customField, id: "duplicate", key: "name" }]
    }),
    (error) => error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.equal((await storage.listFieldDefinitions("figures")).length, 7);
});

test("DebugStorage creates and lists isolated item records", async () => {
  const item = createItemRecord(
    {
      id: "figure-1",
      goodsTypeId: "figures",
      name: "Example figure",
      customValues: {}
    },
    { now: () => FIXED_TIME }
  );
  const storage = createDebugStorage();

  await storage.initialize();
  await storage.createItem({ asset: null, item });

  const firstRead = await storage.listItems("figures");
  firstRead[0].name = "External change";
  assert.equal((await storage.listItems("figures"))[0].name, "Example figure");
  await assert.rejects(storage.createItem({ asset: null, item }), /duplicate identity/);
  await assert.rejects(
    storage.createItem({
      asset: null,
      item: { ...item, id: "wrong-type", goodsTypeId: "missing" }
    }),
    /invalid or duplicate identity/
  );
});

test("DebugStorage fixtures demonstrate every supported custom field type", async () => {
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
  const asset = await storage.getAsset(tapestries[0].imageAssetId);

  assert.deepEqual(
    [...customTypes].sort(),
    ["boolean", "date", "long_text", "number", "select", "text", "url"]
  );
  assert.equal(tapestries.length, 3);
  assert.equal(Object.hasOwn(legacyItem.customValues, "tapestries-series"), false);
  assert.equal(Object.hasOwn(optionalItem.customValues, "tapestries-notes"), false);
  assert.equal(asset.mediaType, "image/svg+xml");
  assert.ok(asset.data.size > 0);
});

test("DebugStorage keeps image assets linked to their item", async () => {
  const data = new Blob(["image"], { type: "image/jpeg" });
  const asset = {
    id: "asset-1",
    data,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: data.size,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME
  };
  const item = createItemRecord(
    {
      id: "figure-with-image",
      goodsTypeId: "figures",
      imageAssetId: asset.id,
      name: "Figure with image"
    },
    { now: () => FIXED_TIME }
  );
  const storage = createDebugStorage();

  await storage.initialize();
  await storage.createItem({ asset, item });

  const storedAsset = await storage.getAsset(asset.id);
  assert.equal(storedAsset.data.size, data.size);
  assert.equal((await storage.listItems("figures"))[0].imageAssetId, asset.id);
});

test("DebugStorage replaces an edited item and image without retaining the old asset", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const replacementData = new Blob(["replacement"], { type: "image/jpeg" });
  const replacementAsset = {
    id: "replacement-asset",
    data: replacementData,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: replacementData.size,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z"
  };
  const updatedItem = {
    ...existingItem,
    name: "Updated debug item",
    imageAssetId: replacementAsset.id,
    updatedAt: "2026-07-21T00:00:00.000Z"
  };

  await storage.updateItem({
    asset: replacementAsset,
    item: updatedItem,
    previousImageAssetId: existingItem.imageAssetId
  });

  assert.equal((await storage.listItems("tapestries"))[0].name, "Updated debug item");
  assert.equal(await storage.getAsset(existingItem.imageAssetId), null);
  assert.equal((await storage.getAsset(replacementAsset.id)).data.size, replacementData.size);
});

test("DebugStorage hides soft-deleted items while retaining their image assets", async () => {
  const storage = createDebugStorage();
  await storage.initialize();
  const [existingItem] = await storage.listItems("tapestries");
  const deletedItem = {
    ...existingItem,
    isDeleted: true,
    deletedAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z"
  };

  await storage.updateItem({ item: deletedItem });

  assert.equal(
    (await storage.listItems("tapestries")).some(({ id }) => id === deletedItem.id),
    false
  );
  assert.deepEqual(
    (await storage.listItems("tapestries", { includeDeleted: true })).find(
      ({ id }) => id === deletedItem.id
    ),
    deletedItem
  );
  assert.notEqual(await storage.getAsset(deletedItem.imageAssetId), null);
});

test("DebugStorage reset clears all temporary domain records", async () => {
  const storage = createDebugStorage();

  await storage.initialize();
  assert.equal((await storage.listGoodsTypes()).length, 3);
  assert.equal((await storage.listFieldDefinitions("figures")).length, 6);

  await storage.createItem({
    asset: null,
    item: createItemRecord({ id: "figure-1", goodsTypeId: "figures", name: "Figure" })
  });

  await storage.resetData();

  assert.deepEqual(await storage.listGoodsTypes(), []);
  assert.deepEqual(await storage.listFieldDefinitions("figures"), []);
  assert.deepEqual(await storage.listItems("figures"), []);
});
