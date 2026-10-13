import {
  INDEXES,
  OBJECT_STORES
} from "../src/data/indexeddb/database-schema.js";
import { USER_DATA_STORES } from "../src/data/indexeddb/local-data-repository.js";

export function createSchemaDatabase() {
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

export function createReadDatabase(records, { transactionError } = {}) {
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

export function createWriteDatabase({ existingItems = [], failAt = -1 } = {}) {
  const deletes = [];
  const writes = [];
  const transactions = [];

  return {
    transaction(storeNames, mode) {
      const requests = [];
      const transaction = {
        error: null,
        objectStore(storeName) {
          function scheduleRequests() {
            if (requests.length !== 1) {
              return;
            }

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

              requests.forEach((queued) => {
                if (queued.operation === "delete") {
                  deletes.push({ id: queued.record, storeName: queued.storeName });
                } else {
                  writes.push({ record: queued.record, storeName: queued.storeName });
                }
                queued.request.result = queued.record?.id;
                queued.request.onsuccess();
              });
              transaction.oncomplete();
            }, 0);
          }

          function queueWrite(record) {
            const request = {};
            requests.push({ operation: "write", record, request, storeName });
            scheduleRequests();

            return request;
          }

          return {
            add: queueWrite,
            delete(id) {
              const request = {};
              requests.push({ operation: "delete", record: id, request, storeName });
              scheduleRequests();
              return request;
            },
            get(id) {
              const request = {};
              queueMicrotask(() => {
                request.result = storeName === OBJECT_STORES.items
                  ? existingItems.find((item) => item.id === id)
                  : undefined;
                request.onsuccess();
              });
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

export function createClearDatabase({ failAt = -1 } = {}) {
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

export function createIndexReadDatabase(records, { transactionError } = {}) {
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

export function createGoodsTypeBundle() {
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

export function createItemFixture(overrides = {}) {
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
    updatedAt: timestamp,
    ...overrides
  };
}

export const EXPECTED_FIELD_QUERY = Object.freeze({
  goodsTypeId: "figures",
  indexName: INDEXES.fieldDefinitionsByGoodsType,
  mode: "readonly",
  storeName: OBJECT_STORES.fieldDefinitions
});

export const EXPECTED_ITEM_QUERY = Object.freeze({
  goodsTypeId: "figures",
  indexName: INDEXES.itemsByGoodsType,
  mode: "readonly",
  storeName: OBJECT_STORES.items
});
