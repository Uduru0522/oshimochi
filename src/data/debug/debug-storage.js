import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import {
  createDebugAssets,
  createDebugFieldDefinitions,
  createDebugGoodsTypes,
  createDebugItems
} from "./debug-fixtures.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import { parseGoodsTypeRecord } from "../models/goods-type.js";
import { parseItemRecord } from "../models/item.js";
import { parseAssetRecord } from "../models/asset.js";

export function createDebugStorage(options = {}) {
  const usesDefaultCatalog = options.goodsTypes === undefined;
  const goodsTypes = options.goodsTypes ?? createDebugGoodsTypes();
  const fieldDefinitions = options.fieldDefinitions ?? createDebugFieldDefinitions(goodsTypes);
  const items = options.items ?? (usesDefaultCatalog ? createDebugItems() : []);
  const assets = options.assets ?? (usesDefaultCatalog ? createDebugAssets() : []);
  const records = goodsTypes.map(parseGoodsTypeRecord);
  const fieldRecords = fieldDefinitions.map(parseFieldDefinitionRecord);
  const itemRecords = items.map(parseItemRecord);
  const assetRecords = assets.map(parseAssetRecord);
  let isInitialized = false;

  function assertInitialized() {
    if (!isInitialized) {
      throw new StorageError("Debug storage has not been initialized.", {
        code: STORAGE_ERROR_CODES.notInitialized
      });
    }
  }

  async function initialize() {
    isInitialized = true;
  }

  async function listGoodsTypes({ includeDeleted = false } = {}) {
    assertInitialized();

    const visibleRecords = includeDeleted
      ? records
      : records.filter((record) => !record.isDeleted);

    return structuredClone(visibleRecords);
  }

  async function createGoodsType({ goodsType, fieldDefinitions: newFields }) {
    assertInitialized();

    let parsedGoodsType;
    let parsedFields;

    try {
      parsedGoodsType = parseGoodsTypeRecord(goodsType);
      parsedFields = newFields.map(parseFieldDefinitionRecord);
    } catch (error) {
      throw new StorageError("The goods type write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    const existingIds = new Set([
      ...records.map(({ id }) => id),
      ...fieldRecords.map(({ id }) => id)
    ]);
    const newIds = [parsedGoodsType.id, ...parsedFields.map(({ id }) => id)];
    const fieldKeys = parsedFields.map(({ key }) => key);

    if (parsedFields.some(({ goodsTypeId }) => goodsTypeId !== parsedGoodsType.id)) {
      throw new StorageError("A field definition belongs to a different goods type.", {
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    if (
      new Set(newIds).size !== newIds.length ||
      newIds.some((id) => existingIds.has(id)) ||
      new Set(fieldKeys).size !== fieldKeys.length
    ) {
      throw new StorageError("The goods type contains duplicate record identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    records.push(parsedGoodsType);
    fieldRecords.push(...parsedFields);

    return structuredClone(parsedGoodsType);
  }

  async function listFieldDefinitions(goodsTypeId, { includeDeleted = false } = {}) {
    assertInitialized();

    const matchingFields = fieldRecords
      .filter((field) => field.goodsTypeId === goodsTypeId)
      .filter((field) => includeDeleted || !field.isDeleted)
      .sort(
        (left, right) =>
          left.position - right.position || left.createdAt.localeCompare(right.createdAt)
      );

    return structuredClone(matchingFields);
  }

  async function saveFieldDefinitions({ goodsTypeId, fieldDefinitions: changedFields }) {
    assertInitialized();

    let parsedFields;

    try {
      parsedFields = changedFields.map(parseFieldDefinitionRecord);

      if (parsedFields.some((field) => field.goodsTypeId !== goodsTypeId)) {
        throw new TypeError("A field definition belongs to a different goods type.");
      }
    } catch (error) {
      throw new StorageError("The field-definition write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    const changedIds = new Set(parsedFields.map(({ id }) => id));
    const resultingFields = [
      ...fieldRecords.filter(({ id }) => !changedIds.has(id)),
      ...parsedFields
    ];
    const activeKeys = resultingFields
      .filter((field) => field.goodsTypeId === goodsTypeId)
      .map(({ key }) => key);

    if (
      changedIds.size !== parsedFields.length ||
      new Set(activeKeys).size !== activeKeys.length
    ) {
      throw new StorageError("Field changes contain duplicate identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    fieldRecords.splice(0, fieldRecords.length, ...resultingFields);
    return structuredClone(parsedFields);
  }

  async function createItem({ asset, item }) {
    assertInitialized();

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
      itemRecords.some(({ id }) => id === parsedItem.id) ||
      (parsedAsset && assetRecords.some(({ id }) => id === parsedAsset.id)) ||
      !records.some(({ id, isDeleted }) => id === parsedItem.goodsTypeId && !isDeleted)
    ) {
      throw new StorageError("The item has invalid or duplicate identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (parsedAsset) {
      assetRecords.push(parsedAsset);
    }
    itemRecords.push(parsedItem);
    return structuredClone(parsedItem);
  }

  async function getAsset(assetId) {
    assertInitialized();
    const asset = assetRecords.find(({ id }) => id === assetId);
    return asset ? structuredClone(asset) : null;
  }

  async function updateItem({ asset = null, item, previousImageAssetId = null }) {
    assertInitialized();

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

    const itemIndex = itemRecords.findIndex(({ id }) => id === parsedItem.id);
    const existingItem = itemRecords[itemIndex];
    if (
      !existingItem ||
      existingItem.goodsTypeId !== parsedItem.goodsTypeId ||
      existingItem.isDeleted ||
      (parsedAsset && existingItem.imageAssetId !== previousImageAssetId) ||
      (parsedAsset && assetRecords.some(({ id }) => id === parsedAsset.id))
    ) {
      throw new StorageError("The item update conflicts with the debug catalog.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    if (parsedAsset && previousImageAssetId) {
      const assetIndex = assetRecords.findIndex(({ id }) => id === previousImageAssetId);
      if (assetIndex < 0) {
        throw new StorageError("The replaced image is unavailable.", {
          code: STORAGE_ERROR_CODES.operationFailed
        });
      }
      assetRecords.splice(assetIndex, 1, parsedAsset);
    } else if (parsedAsset) {
      assetRecords.push(parsedAsset);
    }
    itemRecords.splice(itemIndex, 1, parsedItem);
    return structuredClone(parsedItem);
  }

  async function listItems(goodsTypeId, { includeDeleted = false } = {}) {
    assertInitialized();

    const matchingItems = itemRecords
      .filter((item) => item.goodsTypeId === goodsTypeId)
      .filter((item) => includeDeleted || !item.isDeleted)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return structuredClone(matchingItems);
  }

  async function resetData() {
    assertInitialized();
    records.splice(0, records.length);
    fieldRecords.splice(0, fieldRecords.length);
    itemRecords.splice(0, itemRecords.length);
    assetRecords.splice(0, assetRecords.length);
  }

  function close() {
    isInitialized = false;
  }

  return {
    close,
    createGoodsType,
    createItem,
    getAsset,
    initialize,
    listFieldDefinitions,
    listGoodsTypes,
    listItems,
    resetData,
    saveFieldDefinitions,
    updateItem
  };
}
