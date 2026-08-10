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
import { createClearDatabase } from "../../../test-support/indexeddb-fakes.js";

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
