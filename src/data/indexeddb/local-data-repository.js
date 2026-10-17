import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseDataCatalog } from "../models/data-catalog.js";
import { OBJECT_STORES } from "./database-schema.js";
import { requestToPromise, transactionToPromise } from "./requests.js";

export const USER_DATA_STORES = Object.freeze([
  OBJECT_STORES.goodsTypes,
  OBJECT_STORES.fieldDefinitions,
  OBJECT_STORES.items,
  OBJECT_STORES.assets
]);

export function createLocalDataRepository(database) {
  async function readCatalog() {
    let records;

    try {
      const transaction = database.transaction(USER_DATA_STORES, "readonly");
      const requests = USER_DATA_STORES.map((storeName) =>
        requestToPromise(transaction.objectStore(storeName).getAll())
      );
      const transactionPromise = transactionToPromise(transaction);

      records = await Promise.all(requests);
      await transactionPromise;
    } catch (error) {
      throw new StorageError("Local application data could not be read.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    try {
      return structuredClone(parseDataCatalog({
        assets: records[USER_DATA_STORES.indexOf(OBJECT_STORES.assets)],
        fieldDefinitions: records[
          USER_DATA_STORES.indexOf(OBJECT_STORES.fieldDefinitions)
        ],
        goodsTypes: records[USER_DATA_STORES.indexOf(OBJECT_STORES.goodsTypes)],
        items: records[USER_DATA_STORES.indexOf(OBJECT_STORES.items)]
      }));
    } catch (error) {
      throw new StorageError("The local database contains invalid application data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  async function replaceCatalog(catalog) {
    let parsedCatalog;

    try {
      parsedCatalog = parseDataCatalog(catalog);
    } catch (error) {
      throw new StorageError("Replacement application data is invalid.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    const recordsByStore = new Map([
      [OBJECT_STORES.assets, parsedCatalog.assets],
      [OBJECT_STORES.fieldDefinitions, parsedCatalog.fieldDefinitions],
      [OBJECT_STORES.goodsTypes, parsedCatalog.goodsTypes],
      [OBJECT_STORES.items, parsedCatalog.items]
    ]);

    try {
      const transaction = database.transaction(USER_DATA_STORES, "readwrite");
      const requests = USER_DATA_STORES.flatMap((storeName) => {
        const store = transaction.objectStore(storeName);

        return [
          requestToPromise(store.clear()),
          ...recordsByStore.get(storeName).map((record) =>
            requestToPromise(store.add(record))
          )
        ];
      });

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("Local application data could not be replaced.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedCatalog);
  }

  async function reset() {
    try {
      const transaction = database.transaction(USER_DATA_STORES, "readwrite");
      const requests = USER_DATA_STORES.map((storeName) =>
        requestToPromise(transaction.objectStore(storeName).clear())
      );

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("Local application data could not be reset.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }
  }

  return { readCatalog, replaceCatalog, reset };
}
