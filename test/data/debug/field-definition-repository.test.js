import assert from "node:assert/strict";
import test from "node:test";

import { STORAGE_ERROR_CODES } from "../../../src/data/contracts/storage-contract.js";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createFieldDefinitionRecord } from "../../../src/data/models/field-definition.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createCustomField() {
  return createFieldDefinitionRecord(
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
}

test("DebugStorage lists fixture fields in position order", async () => {
  const storage = createDebugStorage();

  await storage.initialize();

  assert.deepEqual(
    (await storage.listFieldDefinitions("figures")).map(({ key }) => key),
    ["id", "name", "image", "manufacturer", "scale", "edition"]
  );
});

test("DebugStorage saves field definitions as isolated records", async () => {
  const storage = createDebugStorage();
  const customField = createCustomField();

  await storage.initialize();
  await storage.saveFieldDefinitions({
    goodsTypeId: "figures",
    fieldDefinitions: [customField]
  });

  const firstRead = await storage.listFieldDefinitions("figures");
  firstRead.find(({ id }) => id === customField.id).displayName = "External change";
  const storedField = (await storage.listFieldDefinitions("figures"))
    .find(({ id }) => id === customField.id);
  assert.equal(storedField.displayName, "Test scale");
});

test("DebugStorage rejects duplicate field keys without a partial write", async () => {
  const storage = createDebugStorage();
  const customField = createCustomField();

  await storage.initialize();
  await storage.saveFieldDefinitions({
    goodsTypeId: "figures",
    fieldDefinitions: [customField]
  });

  await assert.rejects(
    storage.saveFieldDefinitions({
      goodsTypeId: "figures",
      fieldDefinitions: [{ ...customField, id: "duplicate", key: "name" }]
    }),
    (error) => error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.equal((await storage.listFieldDefinitions("figures")).length, 7);
});
