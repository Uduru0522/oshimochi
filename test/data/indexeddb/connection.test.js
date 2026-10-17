import assert from "node:assert/strict";
import test from "node:test";

import { openDatabase } from "../../../src/data/indexeddb/connection.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";
import { createFieldMigrationTransaction } from "../../../test-support/indexeddb-fakes.js";

test("database connection reports unavailable IndexedDB", async () => {
  await assert.rejects(
    openDatabase({ indexedDBFactory: undefined }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.unavailable
  );
});

test("database connection translates synchronous factory failures", async () => {
  const failure = new Error("open failed");

  await assert.rejects(
    openDatabase({ indexedDBFactory: { open() { throw failure; } } }),
    (error) =>
      error instanceof StorageError &&
      error.code === STORAGE_ERROR_CODES.initializationFailed &&
      error.cause === failure
  );
});

test("database connection closes a late result after a blocked upgrade", async () => {
  let closeCount = 0;
  const request = {};
  const opening = openDatabase({ indexedDBFactory: { open: () => request } });

  request.onblocked();
  await assert.rejects(
    opening,
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.upgradeBlocked
  );

  request.result = { close() { closeCount += 1; } };
  request.onsuccess();

  assert.equal(closeCount, 1);
});

test("database connection aborts a failed schema upgrade", async () => {
  let abortCount = 0;
  const request = {
    result: { createObjectStore() { throw new Error("schema failed"); } },
    transaction: { abort() { abortCount += 1; } }
  };
  const opening = openDatabase({ indexedDBFactory: { open: () => request } });

  request.onupgradeneeded({ oldVersion: 0 });

  await assert.rejects(
    opening,
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.initializationFailed
  );
  assert.equal(abortCount, 1);
});

test("database connection supplies its transaction to data migrations", { timeout: 1000 }, async () => {
  const migration = createFieldMigrationTransaction([
    {
      id: "figures-image",
      key: "image",
      isBuiltIn: true,
      isRequired: false
    }
  ]);
  const database = {};
  const request = {
    result: database,
    transaction: migration.transaction
  };
  const opening = openDatabase({
    indexedDBFactory: { open: () => request }
  });

  request.onupgradeneeded({ oldVersion: 1 });
  await migration.done;
  request.onsuccess();

  assert.equal(await opening, database);
  assert.equal(migration.records[0].isRequired, true);
});
