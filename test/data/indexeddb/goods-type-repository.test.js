import assert from "node:assert/strict";
import test from "node:test";

import { createGoodsTypeRepository } from "../../../src/data/indexeddb/goods-type-repository.js";
import { OBJECT_STORES } from "../../../src/data/indexeddb/database-schema.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import {
  createGoodsTypeBundle,
  createReadDatabase,
  createWriteDatabase
} from "../../../test-support/indexeddb-fakes.js";

test("goods-type repository validates records before returning them", async () => {
  const repository = createGoodsTypeRepository(createReadDatabase([
    createGoodsTypeBundle().goodsType
  ]));

  assert.equal((await repository.list())[0].displayName, "Figures");
});

test("goods-type repository identifies invalid persisted data", async () => {
  const repository = createGoodsTypeRepository(createReadDatabase([{ id: "broken" }]));

  await assert.rejects(
    repository.list(),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
});

test("goods-type repository translates read transaction failures", async () => {
  const repository = createGoodsTypeRepository(
    createReadDatabase([], { transactionError: new Error("transaction failed") })
  );

  await assert.rejects(
    repository.list(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
});

test("goods-type repository writes the type and fields in one transaction", async () => {
  const database = createWriteDatabase();
  const repository = createGoodsTypeRepository(database);

  await repository.create(createGoodsTypeBundle());

  assert.deepEqual(database.transactions, [{
    mode: "readwrite",
    storeNames: [OBJECT_STORES.goodsTypes, OBJECT_STORES.fieldDefinitions]
  }]);
  assert.deepEqual(
    database.writes.map(({ storeName }) => storeName),
    [OBJECT_STORES.goodsTypes, OBJECT_STORES.fieldDefinitions]
  );
});

test("goods-type repository leaves no writes after an aborted transaction", async () => {
  const database = createWriteDatabase({ failAt: 1 });
  const repository = createGoodsTypeRepository(database);

  await assert.rejects(
    repository.create(createGoodsTypeBundle()),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.writes, []);
});

test("goods-type repository rejects mismatched fields before a transaction", async () => {
  const database = createWriteDatabase();
  const repository = createGoodsTypeRepository(database);
  const bundle = createGoodsTypeBundle();
  bundle.fieldDefinitions[0].goodsTypeId = "another-type";

  await assert.rejects(
    repository.create(bundle),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
});
