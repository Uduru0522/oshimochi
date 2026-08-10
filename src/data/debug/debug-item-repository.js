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
import { filterRecordsByScope } from "../models/record-lifecycle.js";

export function createDebugItemRepository(catalog) {
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

    if (
      catalog.items.some(({ id }) => id === parsedItem.id) ||
      (parsedAsset && catalog.assets.some(({ id }) => id === parsedAsset.id)) ||
      !catalog.goodsTypes.some(
        ({ id, isDeleted }) => id === parsedItem.goodsTypeId && !isDeleted
      )
    ) {
      throw new StorageError("The item has invalid or duplicate identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (parsedAsset) {
      catalog.assets.push(parsedAsset);
    }
    catalog.items.push(parsedItem);
    return structuredClone(parsedItem);
  }

  async function getAsset(assetId) {
    const asset = catalog.assets.find(({ id }) => id === assetId);
    return asset ? structuredClone(asset) : null;
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

    const itemIndex = catalog.items.findIndex(({ id }) => id === parsedItem.id);
    const existingItem = catalog.items[itemIndex];

    try {
      assertItemContentUpdate(existingItem, parsedItem);
    } catch (error) {
      throw new StorageError("The item update conflicts with the debug catalog.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (
      (parsedAsset && existingItem.imageAssetId !== previousImageAssetId) ||
      (parsedAsset && catalog.assets.some(({ id }) => id === parsedAsset.id))
    ) {
      throw new StorageError("The item update conflicts with the debug catalog.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (parsedAsset && previousImageAssetId) {
      const assetIndex = catalog.assets.findIndex(({ id }) => id === previousImageAssetId);
      if (assetIndex < 0) {
        throw new StorageError("The replaced image is unavailable.", {
          code: STORAGE_ERROR_CODES.operationFailed
        });
      }
      catalog.assets.splice(assetIndex, 1, parsedAsset);
    } else if (parsedAsset) {
      catalog.assets.push(parsedAsset);
    }
    catalog.items.splice(itemIndex, 1, parsedItem);
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

    const itemIndex = catalog.items.findIndex(({ id }) => id === parsedItem.id);
    const existingItem = catalog.items[itemIndex];

    try {
      assertItemLifecycleUpdate(existingItem, parsedItem);
    } catch (error) {
      throw new StorageError("The item lifecycle update conflicts with the debug catalog.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    catalog.items.splice(itemIndex, 1, parsedItem);
    return structuredClone(parsedItem);
  }

  async function list(goodsTypeId, { scope } = {}) {
    const matchingItems = filterRecordsByScope(
      catalog.items.filter((item) => item.goodsTypeId === goodsTypeId),
      scope
    ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return structuredClone(matchingItems);
  }

  return { create, getAsset, list, updateContent, updateLifecycle };
}
