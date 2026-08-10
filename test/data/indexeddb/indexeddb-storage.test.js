import assert from "node:assert/strict";
import test from "node:test";

import { createIndexedDbStorage } from "../../../src/data/indexeddb/indexeddb-storage.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../../src/data/contracts/storage-contract.js";

test("IndexedDB adapter requires initialization before reads", async () => {
  const storage = createIndexedDbStorage({ indexedDBFactory: undefined });

  await assert.rejects(
    storage.listGoodsTypes(),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
});

test("IndexedDB adapter reports unavailable storage during initialization", async () => {
  const storage = createIndexedDbStorage({ indexedDBFactory: undefined });

  await assert.rejects(
    storage.initialize(),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.unavailable
  );
});

test("IndexedDB adapter shares concurrent initialization", async () => {
  let openCount = 0;
  const request = {};
  const database = createReadableDatabase();
  const storage = createIndexedDbStorage({
    indexedDBFactory: {
      open() {
        openCount += 1;
        return request;
      }
    }
  });
  const firstInitialization = storage.initialize();
  const secondInitialization = storage.initialize();

  request.result = database;
  request.onsuccess();
  await Promise.all([firstInitialization, secondInitialization]);

  assert.equal(openCount, 1);
  assert.deepEqual(await storage.listGoodsTypes(), []);
});

test("IndexedDB adapter closes and becomes unavailable on version change", async () => {
  const request = {};
  const database = createReadableDatabase();
  const storage = createIndexedDbStorage({ indexedDBFactory: { open: () => request } });
  const initialization = storage.initialize();

  request.result = database;
  request.onsuccess();
  await initialization;
  database.onversionchange();

  assert.equal(database.closeCount, 1);
  await assert.rejects(
    storage.listGoodsTypes(),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
});

function createReadableDatabase() {
  return {
    closeCount: 0,
    close() { this.closeCount += 1; },
    transaction() {
      const request = {};
      const transaction = {
        objectStore() {
          return {
            getAll() {
              queueMicrotask(() => {
                request.result = [];
                request.onsuccess();
                transaction.oncomplete();
              });
              return request;
            }
          };
        }
      };
      return transaction;
    }
  };
}
