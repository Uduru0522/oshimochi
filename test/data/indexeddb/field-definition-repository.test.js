import assert from "node:assert/strict";
import test from "node:test";

import {
  createFieldDefinitionRepository
} from "../../../src/data/indexeddb/field-definition-repository.js";
import { OBJECT_STORES } from "../../../src/data/indexeddb/database-schema.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import {
  EXPECTED_FIELD_QUERY,
  createGoodsTypeBundle,
  createIndexReadDatabase,
  createWriteDatabase
} from "../../../test-support/indexeddb-fakes.js";

test("field-definition repository reads active fields in position order", async () => {
  const field = createGoodsTypeBundle().fieldDefinitions[0];
  const database = createIndexReadDatabase([
    { ...field, id: "second", key: "second", displayName: "Second", position: 2 },
    { ...field, id: "first", key: "first", displayName: "First", position: 1 },
    {
      ...field,
      id: "deleted",
      key: "deleted",
      displayName: "Deleted",
      isDeleted: true,
      deletedAt: field.updatedAt
    }
  ]);
  const repository = createFieldDefinitionRepository(database);

  assert.deepEqual((await repository.list("figures")).map(({ id }) => id), [
    "first",
    "second"
  ]);
});

test("field-definition repository uses the goods-type index", async () => {
  const database = createIndexReadDatabase([]);
  const repository = createFieldDefinitionRepository(database);

  await repository.list("figures");

  assert.deepEqual(database.queries, [EXPECTED_FIELD_QUERY]);
});

test("field-definition repository saves a change set in one transaction", async () => {
  const database = createWriteDatabase();
  const repository = createFieldDefinitionRepository(database);
  const field = createGoodsTypeBundle().fieldDefinitions[0];

  await repository.save({ goodsTypeId: "figures", fieldDefinitions: [field] });

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.fieldDefinitions }
  ]);
  assert.deepEqual(database.writes, [
    { record: field, storeName: OBJECT_STORES.fieldDefinitions }
  ]);
});

test("field-definition repository rejects mismatched writes before a transaction", async () => {
  const database = createWriteDatabase();
  const repository = createFieldDefinitionRepository(database);
  const field = createGoodsTypeBundle().fieldDefinitions[0];

  await assert.rejects(
    repository.save({ goodsTypeId: "other", fieldDefinitions: [field] }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
});
