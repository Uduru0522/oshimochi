import assert from "node:assert/strict";
import test from "node:test";

import { STORAGE_ERROR_CODES } from "../../../src/data/contracts/storage-contract.js";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createGoodsTypeRecord } from "../../../src/data/models/goods-type.js";
import { RECORD_SCOPES } from "../../../src/data/models/record-lifecycle.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createNameField(goodsTypeId = "figures") {
  return {
    id: `${goodsTypeId}-name`,
    goodsTypeId,
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
}

test("DebugStorage hides soft-deleted goods types by default", async () => {
  const storage = createDebugStorage({
    goodsTypes: [
      createGoodsTypeRecord({ id: "active", displayName: "Active" }),
      createGoodsTypeRecord({ id: "deleted", displayName: "Deleted", isDeleted: true })
    ]
  });

  await storage.initialize();

  assert.deepEqual((await storage.listGoodsTypes()).map(({ id }) => id), ["active"]);
  assert.equal((await storage.listGoodsTypes({ scope: RECORD_SCOPES.all })).length, 2);
});

test("DebugStorage creates a goods type and its fields together", async () => {
  const storage = createDebugStorage({ goodsTypes: [] });
  const goodsType = createGoodsTypeRecord(
    { id: "figures", displayName: "Figures" },
    { now: () => FIXED_TIME }
  );

  await storage.initialize();
  await storage.createGoodsType({ goodsType, fieldDefinitions: [createNameField()] });

  assert.deepEqual((await storage.listGoodsTypes()).map(({ id }) => id), ["figures"]);
  assert.deepEqual(
    (await storage.listFieldDefinitions("figures")).map(({ id }) => id),
    ["figures-name"]
  );
});

test("DebugStorage rejects mismatched goods-type fields without a partial write", async () => {
  const storage = createDebugStorage({ goodsTypes: [] });
  const goodsType = createGoodsTypeRecord(
    { id: "posters", displayName: "Posters" },
    { now: () => FIXED_TIME }
  );

  await storage.initialize();

  await assert.rejects(
    storage.createGoodsType({
      goodsType,
      fieldDefinitions: [{ ...createNameField("posters"), goodsTypeId: "wrong" }]
    }),
    (error) => error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(await storage.listGoodsTypes(), []);
});

test("DebugStorage rejects malformed goods types", async () => {
  const storage = createDebugStorage({ goodsTypes: [] });

  await storage.initialize();

  await assert.rejects(
    storage.createGoodsType({ goodsType: { id: "invalid" }, fieldDefinitions: [] }),
    (error) => error.code === STORAGE_ERROR_CODES.invalidData
  );
});
