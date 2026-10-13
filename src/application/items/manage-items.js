import { createAssetRecord } from "../../data/models/asset.js";
import { createItemRecord, parseItemRecord } from "../../data/models/item.js";
import {
  RECORD_SCOPES,
  createDeletionTransition
} from "../../data/models/record-lifecycle.js";
import { normalizeItemValues } from "./item-values.js";

function defaultIdGenerator() {
  return globalThis.crypto.randomUUID();
}

export function createItemManagementOperations({
  storage,
  generateId = defaultIdGenerator,
  now = () => new Date().toISOString()
}) {
  const requiredMethods = [
    "createItem",
    "getAsset",
    "listFieldDefinitions",
    "listGoodsTypes",
    "listItems",
    "purgeItem",
    "updateItemContent",
    "updateItemLifecycle"
  ];

  if (requiredMethods.some((methodName) => typeof storage?.[methodName] !== "function")) {
    throw new TypeError("Item management requires readable and writable item storage.");
  }

  async function assertActiveGoodsType(goodsTypeId) {
    const goodsTypes = await storage.listGoodsTypes();

    if (!goodsTypes.some(({ id }) => id === goodsTypeId)) {
      throw new TypeError("The selected goods type is not active.");
    }
  }

  async function getEntryFields(goodsTypeId) {
    await assertActiveGoodsType(goodsTypeId);
    return storage.listFieldDefinitions(goodsTypeId);
  }

  async function softDeleteItem(item) {
    const existingItem = parseItemRecord(item);
    if (existingItem.isDeleted) {
      throw new TypeError("This item is already deleted.");
    }

    await assertActiveGoodsType(existingItem.goodsTypeId);

    const deletedItem = parseItemRecord(
      createDeletionTransition(existingItem, true, { now })
    );

    await storage.updateItemLifecycle(deletedItem);
    return structuredClone(deletedItem);
  }

  async function restoreItem(item) {
    const existingItem = parseItemRecord(item);
    if (!existingItem.isDeleted) {
      throw new TypeError("This item is not deleted.");
    }

    await assertActiveGoodsType(existingItem.goodsTypeId);
    const restoredItem = parseItemRecord(
      createDeletionTransition(existingItem, false, { now })
    );

    await storage.updateItemLifecycle(restoredItem);
    return structuredClone(restoredItem);
  }

  async function purgeItem(item) {
    const existingItem = parseItemRecord(item);
    if (!existingItem.isDeleted) {
      throw new TypeError("An item must be deleted before it can be permanently removed.");
    }

    return structuredClone(await storage.purgeItem(existingItem.id));
  }

  async function createItem({ goodsTypeId, name, customValues = {}, image = null }) {
    const fields = await getEntryFields(goodsTypeId);

    if (!image) {
      throw new TypeError("Image is required.");
    }

    const timestamp = now();
    const asset = createAssetRecord(
      {
        ...image,
        id: generateId()
      },
      { now: () => timestamp }
    );
    const item = createItemRecord(
      {
        id: generateId(),
        goodsTypeId,
        name,
        imageAssetId: asset.id,
        customValues: normalizeItemValues(fields, customValues)
      },
      { now: () => timestamp }
    );

    await storage.createItem({ asset, item });
    return structuredClone({ asset, item });
  }

  async function updateItem({ item, name, customValues = {}, image = null }) {
    const existingItem = parseItemRecord(item);
    if (existingItem.isDeleted) {
      throw new TypeError("A deleted item cannot be edited.");
    }

    const fields = await getEntryFields(existingItem.goodsTypeId);
    const timestamp = now();
    const asset = image
      ? createAssetRecord({ ...image, id: generateId() }, { now: () => timestamp })
      : null;
    const updatedItem = parseItemRecord({
      ...existingItem,
      name: name.trim(),
      customValues: normalizeItemValues(fields, customValues),
      imageAssetId: asset?.id ?? existingItem.imageAssetId,
      updatedAt: timestamp
    });
    const change = {
      asset,
      item: updatedItem,
      previousImageAssetId: asset ? existingItem.imageAssetId : null
    };

    if (!updatedItem.imageAssetId) {
      throw new TypeError("Image is required.");
    }

    await storage.updateItemContent(change);
    return structuredClone(change);
  }

  return {
    createItem,
    getAsset: (assetId) => storage.getAsset(assetId),
    getEntryFields,
    listDeletedItems: (goodsTypeId) => storage.listItems(goodsTypeId, {
      scope: RECORD_SCOPES.deleted
    }),
    listItems: (goodsTypeId) => storage.listItems(goodsTypeId),
    purgeItem,
    restoreItem,
    softDeleteItem,
    updateItem
  };
}
