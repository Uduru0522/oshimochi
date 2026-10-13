import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseAssetRecord } from "../models/asset.js";
import {
  assertItemContentUpdate,
  assertItemLifecycleUpdate,
  parseItemRecord
} from "../models/item.js";
import {
  filterRecordsByScope,
  requireRecordScope
} from "../models/record-lifecycle.js";
import { INDEXES, OBJECT_STORES } from "./database-schema.js";
import { requestToPromise, transactionToPromise } from "./requests.js";

function sortByUpdatedTime(records) {
  return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function createItemRepository(database) {
  async function create({ asset, item }) {
    let parsedItem;
    let parsedAsset;

    try {
      parsedItem = parseItemRecord(item);
      parsedAsset = asset === null ? null : parseAssetRecord(asset);

      if (parsedItem.imageAssetId !== (parsedAsset?.id ?? null)) {
        throw new TypeError("The item references a different image asset.");
      }
    } catch (error) {
      throw new StorageError("The item write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    try {
      const storeNames = parsedAsset
        ? [OBJECT_STORES.assets, OBJECT_STORES.items]
        : OBJECT_STORES.items;
      const transaction = database.transaction(storeNames, "readwrite");
      const requests = [
        ...(parsedAsset
          ? [requestToPromise(transaction.objectStore(OBJECT_STORES.assets).add(parsedAsset))]
          : []),
        requestToPromise(transaction.objectStore(OBJECT_STORES.items).add(parsedItem))
      ];

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("The item could not be saved to the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedItem);
  }

  async function getAsset(assetId) {
    let record;

    try {
      const transaction = database.transaction(OBJECT_STORES.assets, "readonly");
      const request = transaction.objectStore(OBJECT_STORES.assets).get(assetId);
      [record] = await Promise.all([
        requestToPromise(request),
        transactionToPromise(transaction)
      ]);
    } catch (error) {
      throw new StorageError("The image could not be read from the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (record === undefined) {
      return null;
    }

    try {
      return structuredClone(parseAssetRecord(record));
    } catch (error) {
      throw new StorageError("The local database contains an invalid image asset.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  async function updateContent({ asset = null, item, previousImageAssetId = null }) {
    let parsedAsset;
    let parsedItem;

    try {
      parsedItem = parseItemRecord(item);
      parsedAsset = asset === null ? null : parseAssetRecord(asset);

      if (parsedAsset && parsedItem.imageAssetId !== parsedAsset.id) {
        throw new TypeError("The updated item references a different replacement asset.");
      }
      if (parsedAsset && previousImageAssetId === parsedAsset.id) {
        throw new TypeError("A replacement image requires new asset identity.");
      }
      if (!parsedAsset && previousImageAssetId !== null) {
        throw new TypeError("An unchanged image cannot supersede an asset.");
      }
    } catch (error) {
      throw new StorageError("The item update contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    try {
      const storeNames = parsedAsset
        ? [OBJECT_STORES.assets, OBJECT_STORES.items]
        : OBJECT_STORES.items;
      const transaction = database.transaction(storeNames, "readwrite");
      const itemStore = transaction.objectStore(OBJECT_STORES.items);
      const existingItem = await requestToPromise(itemStore.get(parsedItem.id));

      assertItemContentUpdate(existingItem, parsedItem);

      if (parsedAsset && existingItem.imageAssetId !== previousImageAssetId) {
        throw new TypeError("The replacement image does not belong to the current item.");
      }

      const requests = [
        ...(parsedAsset
          ? [
              requestToPromise(transaction.objectStore(OBJECT_STORES.assets).add(parsedAsset)),
              ...(previousImageAssetId
                ? [requestToPromise(
                    transaction.objectStore(OBJECT_STORES.assets).delete(previousImageAssetId)
                  )]
                : [])
            ]
          : []),
        requestToPromise(itemStore.put(parsedItem))
      ];

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("The item changes could not be saved to the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedItem);
  }

  async function updateLifecycle(item) {
    let parsedItem;

    try {
      parsedItem = parseItemRecord(item);
    } catch (error) {
      throw new StorageError("The item lifecycle update contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    try {
      const transaction = database.transaction(OBJECT_STORES.items, "readwrite");
      const itemStore = transaction.objectStore(OBJECT_STORES.items);
      const existingItem = await requestToPromise(itemStore.get(parsedItem.id));

      assertItemLifecycleUpdate(existingItem, parsedItem);

      const request = itemStore.put(parsedItem);

      await Promise.all([
        requestToPromise(request),
        transactionToPromise(transaction)
      ]);
    } catch (error) {
      throw new StorageError("The item lifecycle could not be saved to the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedItem);
  }

  async function purge(itemId) {
    let purgedItem;

    try {
      const transaction = database.transaction(
        [OBJECT_STORES.assets, OBJECT_STORES.items],
        "readwrite"
      );
      const itemStore = transaction.objectStore(OBJECT_STORES.items);
      purgedItem = parseItemRecord(
        await requestToPromise(itemStore.get(itemId))
      );

      if (!purgedItem.isDeleted) {
        throw new TypeError("An item must already be deleted before permanent removal.");
      }

      const requests = [
        ...(purgedItem.imageAssetId
          ? [requestToPromise(
              transaction.objectStore(OBJECT_STORES.assets).delete(
                purgedItem.imageAssetId
              )
            )]
          : []),
        requestToPromise(itemStore.delete(purgedItem.id))
      ];

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError(
        "The item could not be permanently removed from the local database.",
        { cause: error, code: STORAGE_ERROR_CODES.operationFailed }
      );
    }

    return structuredClone(purgedItem);
  }

  async function list(goodsTypeId, { scope } = {}) {
    const requestedScope = requireRecordScope(scope);
    let records;

    try {
      const transaction = database.transaction(OBJECT_STORES.items, "readonly");
      const store = transaction.objectStore(OBJECT_STORES.items);
      const request = store.index(INDEXES.itemsByGoodsType).getAll(goodsTypeId);
      [records] = await Promise.all([
        requestToPromise(request),
        transactionToPromise(transaction)
      ]);
    } catch (error) {
      throw new StorageError("Items could not be read from the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    try {
      const visibleRecords = filterRecordsByScope(
        records.map(parseItemRecord),
        requestedScope
      );

      return structuredClone(sortByUpdatedTime(visibleRecords));
    } catch (error) {
      throw new StorageError("The local database contains an invalid item record.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  return { create, getAsset, list, purge, updateContent, updateLifecycle };
}
