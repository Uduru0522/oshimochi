import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_MODEL_VERSION,
  INDEXES,
  OBJECT_STORES,
  upgradeDatabase
} from "../../src/data/indexeddb/database-schema.js";
import {
  createIndexedDbStorage
} from "../../src/data/indexeddb/indexeddb-storage.js";
import { openDatabase } from "../../src/data/indexeddb/connection.js";
import { requestToPromise } from "../../src/data/indexeddb/requests.js";
import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../../src/data/contracts/storage-contract.js";
import { createGoodsTypeRepository } from "../../src/data/indexeddb/goods-type-repository.js";
import { createFieldDefinitionRepository } from "../../src/data/indexeddb/field-definition-repository.js";
import { createItemRepository } from "../../src/data/indexeddb/item-repository.js";
import {
  USER_DATA_STORES,
  createLocalDataRepository
} from "../../src/data/indexeddb/local-data-repository.js";

function createFakeDatabase() {
  const stores = new Map();

  return {
    createObjectStore(name, options) {
      const indexes = new Map();
      const records = [];
      const store = {
        createIndex(indexName, keyPath, indexOptions = {}) {
          indexes.set(indexName, { keyPath, options: indexOptions });
        },
        indexes,
        options,
        put(record) {
          records.push(record);
        },
        records
      };

      stores.set(name, store);
      return store;
    },
    stores
  };
}

function createReadDatabase(records, { transactionError } = {}) {
  return {
    transaction() {
      const request = {};
      const transaction = {
        error: transactionError,
        objectStore() {
          return {
            getAll() {
              queueMicrotask(() => {
                if (transactionError) {
                  transaction.onerror();
                  return;
                }

                request.result = records;
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

function createWriteDatabase({ failAt = -1 } = {}) {
  const deletes = [];
  const writes = [];
  const transactions = [];

  return {
    transaction(storeNames, mode) {
      const requests = [];
      const transaction = {
        error: null,
        objectStore(storeName) {
          function queueWrite(record) {
            const request = {};
            requests.push({ operation: "write", record, request, storeName });

            if (requests.length === 1) {
              setTimeout(() => {
                const failedRequest = requests[failAt];

                if (failedRequest) {
                  const failure = new Error("write failed");
                  transaction.error = failure;
                  failedRequest.request.error = failure;
                  failedRequest.request.onerror();
                  transaction.onabort();
                  return;
                }

                requests.forEach(({ operation, record: queuedRecord, request: queuedRequest, storeName: queuedStore }) => {
                  if (operation === "delete") {
                    deletes.push({ id: queuedRecord, storeName: queuedStore });
                  } else {
                    writes.push({ record: queuedRecord, storeName: queuedStore });
                  }
                  queuedRequest.result = queuedRecord?.id;
                  queuedRequest.onsuccess();
                });
                transaction.oncomplete();
              }, 0);
            }

            return request;
          }

          return {
            add: queueWrite,
            delete(id) {
              const request = {};
              requests.push({ operation: "delete", record: id, request, storeName });
              return request;
            },
            put: queueWrite
          };
        }
      };

      transactions.push({ mode, storeNames });
      return transaction;
    },
    deletes,
    transactions,
    writes
  };
}

function createClearDatabase({ failAt = -1 } = {}) {
  const clearedStores = [];
  const transactions = [];

  return {
    clearedStores,
    transaction(storeNames, mode) {
      const requests = [];
      const transaction = {
        error: null,
        objectStore(storeName) {
          return {
            clear() {
              const request = {};
              requests.push({ request, storeName });

              if (requests.length === USER_DATA_STORES.length) {
                queueMicrotask(() => {
                  const failedRequest = requests[failAt];

                  if (failedRequest) {
                    const failure = new Error("clear failed");
                    transaction.error = failure;
                    failedRequest.request.error = failure;
                    failedRequest.request.onerror();
                    transaction.onabort();
                    return;
                  }

                  requests.forEach(({ request: queuedRequest, storeName: queuedStore }) => {
                    clearedStores.push(queuedStore);
                    queuedRequest.onsuccess();
                  });
                  transaction.oncomplete();
                });
              }

              return request;
            }
          };
        }
      };

      transactions.push({ mode, storeNames });
      return transaction;
    },
    transactions
  };
}

function createFieldReadDatabase(records, { transactionError } = {}) {
  const queries = [];

  return {
    queries,
    transaction(storeName, mode) {
      const request = {};
      const transaction = {
        error: transactionError,
        objectStore() {
          return {
            index(indexName) {
              return {
                getAll(goodsTypeId) {
                  queries.push({ goodsTypeId, indexName, mode, storeName });
                  queueMicrotask(() => {
                    if (transactionError) {
                      transaction.onerror();
                      return;
                    }

                    request.result = records;
                    request.onsuccess();
                    transaction.oncomplete();
                  });
                  return request;
                }
              };
            }
          };
        }
      };

      return transaction;
    }
  };
}

function createGoodsTypeBundle() {
  const timestamp = "2026-07-20T00:00:00.000Z";

  return {
    goodsType: {
      id: "figures",
      displayName: "Figures",
      description: "",
      isDeleted: false,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    fieldDefinitions: [
      {
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
        createdAt: timestamp,
        updatedAt: timestamp
      }
    ]
  };
}

function createItemRecord() {
  const timestamp = "2026-07-20T00:00:00.000Z";

  return {
    id: "figure-1",
    goodsTypeId: "figures",
    name: "Example figure",
    imageAssetId: null,
    customValues: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

test("version 1 schema creates stable stores, indexes, and metadata", () => {
  const database = createFakeDatabase();

  upgradeDatabase(database, 0);

  assert.deepEqual([...database.stores.keys()].sort(), [...Object.values(OBJECT_STORES)].sort());
  assert.deepEqual(
    database.stores.get(OBJECT_STORES.fieldDefinitions).indexes.get(
      INDEXES.fieldDefinitionsByGoodsTypeAndKey
    ),
    {
      keyPath: ["goodsTypeId", "key"],
      options: { unique: true }
    }
  );
  assert.deepEqual(database.stores.get(OBJECT_STORES.metadata).records, [
    { key: "domainModelVersion", value: DOMAIN_MODEL_VERSION }
  ]);
});

test("schema upgrade does nothing when version 1 already exists", () => {
  const database = createFakeDatabase();

  upgradeDatabase(database, 1);

  assert.equal(database.stores.size, 0);
});

test("openDatabase reports unavailable IndexedDB", async () => {
  await assert.rejects(
    openDatabase({ indexedDBFactory: undefined }),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.unavailable
  );
});

test("openDatabase translates synchronous factory failures", async () => {
  const failure = new Error("open failed");

  await assert.rejects(
    openDatabase({
      indexedDBFactory: {
        open() {
          throw failure;
        }
      }
    }),
    (error) =>
      error instanceof StorageError &&
      error.code === STORAGE_ERROR_CODES.initializationFailed &&
      error.cause === failure
  );
});

test("openDatabase closes a late connection after a blocked upgrade", async () => {
  let closeCount = 0;
  const request = {};
  const opening = openDatabase({
    indexedDBFactory: { open: () => request }
  });

  request.onblocked();

  await assert.rejects(
    opening,
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.upgradeBlocked
  );

  request.result = {
    close() {
      closeCount += 1;
    }
  };
  request.onsuccess();

  assert.equal(closeCount, 1);
});

test("openDatabase aborts a failed schema upgrade", async () => {
  let abortCount = 0;
  const request = {
    result: {
      createObjectStore() {
        throw new Error("schema failed");
      }
    },
    transaction: {
      abort() {
        abortCount += 1;
      }
    }
  };
  const opening = openDatabase({
    indexedDBFactory: { open: () => request }
  });

  request.onupgradeneeded({ oldVersion: 0 });

  await assert.rejects(
    opening,
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.initializationFailed
  );
  assert.equal(abortCount, 1);
});

test("IndexedDbStorage requires initialization before reads", async () => {
  const storage = createIndexedDbStorage({ indexedDBFactory: undefined });

  await assert.rejects(
    storage.listGoodsTypes(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
  await assert.rejects(
    storage.initialize(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.unavailable
  );
});

test("IndexedDbStorage shares concurrent initialization and closes on version change", async () => {
  let closeCount = 0;
  let openCount = 0;
  const request = {};
  const database = {
    close() {
      closeCount += 1;
    },
    transaction() {
      const readRequest = {};
      const transaction = {
        objectStore() {
          return {
            getAll() {
              queueMicrotask(() => {
                readRequest.result = [];
                readRequest.onsuccess();
                transaction.oncomplete();
              });
              return readRequest;
            }
          };
        }
      };
      return transaction;
    }
  };
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

  database.onversionchange();

  assert.equal(closeCount, 1);
  await assert.rejects(
    storage.listGoodsTypes(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.notInitialized
  );
});

test("requestToPromise resolves and rejects IDB-style requests", async () => {
  const successfulRequest = {};
  const successPromise = requestToPromise(successfulRequest);
  successfulRequest.result = { id: "result" };
  successfulRequest.onsuccess();

  assert.deepEqual(await successPromise, { id: "result" });

  const failedRequest = {};
  const failurePromise = requestToPromise(failedRequest);
  failedRequest.error = new Error("request failed");
  failedRequest.onerror();

  await assert.rejects(failurePromise, /request failed/);
});

test("goods type repository validates records before returning them", async () => {
  const repository = createGoodsTypeRepository(
    createReadDatabase([
      {
        id: "figures",
        displayName: "Figures",
        description: "",
        isDeleted: false,
        deletedAt: null,
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z"
      }
    ])
  );

  assert.equal((await repository.list())[0].displayName, "Figures");
});

test("goods type repository identifies invalid persisted data", async () => {
  const repository = createGoodsTypeRepository(
    createReadDatabase([{ id: "broken" }])
  );

  await assert.rejects(
    repository.list(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
});

test("goods type repository translates transaction failures", async () => {
  const repository = createGoodsTypeRepository(
    createReadDatabase([], { transactionError: new Error("transaction failed") })
  );

  await assert.rejects(
    repository.list(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
});

test("goods type repository writes the type and fields in one transaction", async () => {
  const database = createWriteDatabase();
  const repository = createGoodsTypeRepository(database);

  await repository.create(createGoodsTypeBundle());

  assert.deepEqual(database.transactions, [
    {
      mode: "readwrite",
      storeNames: [OBJECT_STORES.goodsTypes, OBJECT_STORES.fieldDefinitions]
    }
  ]);
  assert.deepEqual(
    database.writes.map(({ storeName }) => storeName),
    [OBJECT_STORES.goodsTypes, OBJECT_STORES.fieldDefinitions]
  );
});

test("goods type repository reports a failed atomic write", async () => {
  const database = createWriteDatabase({ failAt: 1 });
  const repository = createGoodsTypeRepository(database);

  await assert.rejects(
    repository.create(createGoodsTypeBundle()),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.writes, []);
});

test("goods type repository rejects mismatched fields before opening a transaction", async () => {
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

test("field definition repository reads the goods-type index and sorts active fields", async () => {
  const bundle = createGoodsTypeBundle();
  const field = bundle.fieldDefinitions[0];
  const database = createFieldReadDatabase([
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
  assert.deepEqual(database.queries, [
    {
      goodsTypeId: "figures",
      indexName: INDEXES.fieldDefinitionsByGoodsType,
      mode: "readonly",
      storeName: OBJECT_STORES.fieldDefinitions
    }
  ]);
});

test("field definition repository saves a change set in one transaction", async () => {
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

test("field definition repository rejects mismatched writes before a transaction", async () => {
  const database = createWriteDatabase();
  const repository = createFieldDefinitionRepository(database);
  const field = createGoodsTypeBundle().fieldDefinitions[0];

  await assert.rejects(
    repository.save({ goodsTypeId: "other", fieldDefinitions: [field] }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
});

test("item repository reads the goods-type index and hides deleted items", async () => {
  const item = createItemRecord();
  const database = createFieldReadDatabase([
    item,
    { ...item, id: "deleted", isDeleted: true, deletedAt: item.updatedAt }
  ]);
  const repository = createItemRepository(database);

  assert.deepEqual((await repository.list("figures")).map(({ id }) => id), ["figure-1"]);
  assert.deepEqual(database.queries, [
    {
      goodsTypeId: "figures",
      indexName: INDEXES.itemsByGoodsType,
      mode: "readonly",
      storeName: OBJECT_STORES.items
    }
  ]);
});

test("item repository validates and writes one item transaction", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = createItemRecord();

  await repository.create({ asset: null, item });

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.writes, [
    { record: item, storeName: OBJECT_STORES.items }
  ]);
});

test("item repository writes an image and item atomically", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = { ...createItemRecord(), imageAssetId: "asset-1" };
  const data = new Blob(["image"], { type: "image/jpeg" });
  const asset = {
    id: "asset-1",
    data,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: data.size,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };

  await repository.create({ asset, item });

  assert.deepEqual(database.transactions, [{
    mode: "readwrite",
    storeNames: [OBJECT_STORES.assets, OBJECT_STORES.items]
  }]);
  assert.deepEqual(
    database.writes.map(({ storeName }) => storeName),
    [OBJECT_STORES.assets, OBJECT_STORES.items]
  );
});

test("item repository updates an item without rewriting its unchanged image", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = { ...createItemRecord(), name: "Updated" };

  await repository.update({ item });

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.writes, [
    { record: item, storeName: OBJECT_STORES.items }
  ]);
  assert.deepEqual(database.deletes, []);
});

test("item repository replaces an image and item atomically", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);
  const item = { ...createItemRecord(), imageAssetId: "asset-2" };
  const data = new Blob(["replacement"], { type: "image/jpeg" });
  const asset = {
    id: "asset-2",
    data,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: data.size,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };

  await repository.update({ asset, item, previousImageAssetId: "asset-1" });

  assert.deepEqual(database.transactions, [{
    mode: "readwrite",
    storeNames: [OBJECT_STORES.assets, OBJECT_STORES.items]
  }]);
  assert.deepEqual(
    database.writes.map(({ storeName }) => storeName),
    [OBJECT_STORES.assets, OBJECT_STORES.items]
  );
  assert.deepEqual(database.deletes, [
    { id: "asset-1", storeName: OBJECT_STORES.assets }
  ]);
});

test("item repository rejects invalid records before opening a transaction", async () => {
  const database = createWriteDatabase();
  const repository = createItemRepository(database);

  await assert.rejects(
    repository.create({ id: "invalid" }),
    (error) => error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidData
  );
  assert.deepEqual(database.transactions, []);
});

test("local data repository clears every user-data store in one transaction", async () => {
  const database = createClearDatabase();
  const repository = createLocalDataRepository(database);

  await repository.reset();

  assert.deepEqual(database.transactions, [
    { mode: "readwrite", storeNames: USER_DATA_STORES }
  ]);
  assert.deepEqual(database.clearedStores, USER_DATA_STORES);
  assert.equal(database.clearedStores.includes(OBJECT_STORES.metadata), false);
});

test("local data repository reports an aborted reset without a partial clear", async () => {
  const database = createClearDatabase({ failAt: 2 });
  const repository = createLocalDataRepository(database);

  await assert.rejects(
    repository.reset(),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.operationFailed
  );
  assert.deepEqual(database.clearedStores, []);
});
