import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseAssetRecord } from "../models/asset.js";
import { parseItemRecord } from "../models/item.js";
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

  async function update({ asset = null, item, previousImageAssetId = null }) {
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
        requestToPromise(transaction.objectStore(OBJECT_STORES.items).put(parsedItem))
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

  async function list(goodsTypeId, { includeDeleted = false } = {}) {
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
      const parsedRecords = records.map(parseItemRecord);
      const visibleRecords = includeDeleted
        ? parsedRecords
        : parsedRecords.filter((record) => !record.isDeleted);

      return structuredClone(sortByUpdatedTime(visibleRecords));
    } catch (error) {
      throw new StorageError("The local database contains an invalid item record.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  return { create, getAsset, list, update };
}
