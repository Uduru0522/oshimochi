import assert from "node:assert/strict";
import test from "node:test";

import {
  USER_DATA_STORES,
  createLocalDataRepository
} from "../../../src/data/indexeddb/local-data-repository.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import { OBJECT_STORES } from "../../../src/data/indexeddb/database-schema.js";
import {
  createCatalogDatabase,
  createClearDatabase
} from "../../../test-support/indexeddb-fakes.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";

test("local-data repository reads every user-data store in one transaction", async () => {
  const catalog = createDataCatalogFixture();
  const database = createCatalogDatabase(catalog);
  const repository = createLocalDataRepository(database);

  const result = await repository.readCatalog();

  assert.deepEqual(result, catalog);
  assert.deepEqual(database.transactions, [
    { mode: "readonly", storeNames: USER_DATA_STORES }
  ]);
});

test("local-data repository returns a catalog isolated from stored records", async () => {
  const catalog = createDataCatalogFixture();
  const database = createCatalogDatabase(catalog);
  const repository = createLocalDataRepository(database);

  const result = await repository.readCatalog();
  result.items[0].name = "Changed outside storage";

  assert.equal((await repository.readCatalog()).items[0].name, "Example");
});

test("local-data repository replaces every user-data store in one transaction", async () => {
  const original = createDataCatalogFixture();
  const replacement = createDataCatalogFixture();
  replacement.goodsTypes[0].displayName = "Replacement figures";
  const database = createCatalogDatabase(original);
  const repository = createLocalDataRepository(database);

  await repository.replaceCatalog(replacement);

  assert.deepEqual(database.readCatalog(), replacement);
  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: USER_DATA_STORES }
  ]);
});

test("local-data repository rejects invalid replacement before a transaction", async () => {
  const original = createDataCatalogFixture();
  const invalidReplacement = createDataCatalogFixture();
  invalidReplacement.assets = [];
  const database = createCatalogDatabase(original);
  const repository = createLocalDataRepository(database);

  await assert.rejects(
    repository.replaceCatalog(invalidReplacement),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
  assert.deepEqual(database.readCatalog(), original);
});

test("local-data repository keeps its catalog after replacement aborts", async () => {
  const original = createDataCatalogFixture();
  const replacement = createDataCatalogFixture();
  replacement.goodsTypes[0].displayName = "Replacement figures";
  const database = createCatalogDatabase(original, { failAt: 3 });
  const repository = createLocalDataRepository(database);

  await assert.rejects(
    repository.replaceCatalog(replacement),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.readCatalog(), original);
});

test("local-data repository clears every user-data store in one transaction", async () => {
  const database = createClearDatabase();
  const repository = createLocalDataRepository(database);

  await repository.reset();

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: USER_DATA_STORES }
  ]);
  assert.deepEqual(database.clearedStores, USER_DATA_STORES);
  assert.equal(database.clearedStores.includes(OBJECT_STORES.metadata), false);
});

test("local-data repository leaves no partial clear after an aborted transaction", async () => {
  const database = createClearDatabase({ failAt: 2 });
  const repository = createLocalDataRepository(database);

  await assert.rejects(
    repository.reset(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.clearedStores, []);
});
