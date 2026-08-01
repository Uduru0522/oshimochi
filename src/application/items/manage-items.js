import { createAssetRecord } from "../../data/models/asset.js";
import { createItemRecord, parseItemRecord } from "../../data/models/item.js";
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
    "updateItem"
  ];

  if (requiredMethods.some((methodName) => typeof storage?.[methodName] !== "function")) {
    throw new TypeError("Item management requires readable and writable item storage.");
  }

  async function getEntryFields(goodsTypeId) {
    const goodsTypes = await storage.listGoodsTypes();

    if (!goodsTypes.some(({ id }) => id === goodsTypeId)) {
      throw new TypeError("The selected goods type is not active.");
    }

    return storage.listFieldDefinitions(goodsTypeId);
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

    await storage.updateItem(change);
    return structuredClone(change);
  }

  return {
    createItem,
    getAsset: (assetId) => storage.getAsset(assetId),
    getEntryFields,
    listItems: (goodsTypeId) => storage.listItems(goodsTypeId),
    updateItem
  };
}
