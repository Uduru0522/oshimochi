import {
  createDeletionLifecycle,
  parseDeletionLifecycle
} from "./record-lifecycle.js";
import {
  areJsonValuesEqual,
  requireJsonValue,
  requireRecord,
  requireString
} from "./record-validation.js";

function requireCustomValues(value) {
  const customValues = requireRecord(value, "customValues");
  return requireJsonValue(customValues, "customValues");
}

function getLifecycleNeutralItem(item) {
  const { deletedAt, isDeleted, updatedAt, ...content } = item;
  return content;
}

function requireForwardTimestamp(currentItem, nextItem) {
  if (nextItem.updatedAt < currentItem.updatedAt) {
    throw new TypeError("Item updates cannot move updatedAt backwards.");
  }
}

export function parseItemRecord(value) {
  const input = requireRecord(value, "Item");
  const lifecycle = parseDeletionLifecycle(input, "Item");

  return {
    id: requireString(input.id, "id", { allowEmpty: false, canonical: true }),
    goodsTypeId: requireString(input.goodsTypeId, "goodsTypeId", {
      allowEmpty: false,
      canonical: true
    }),
    name: requireString(input.name, "name", { allowEmpty: false, canonical: true }),
    imageAssetId: input.imageAssetId === null
      ? null
      : requireString(input.imageAssetId, "imageAssetId", {
        allowEmpty: false,
        canonical: true
      }),
    customValues: requireCustomValues(input.customValues),
    ...lifecycle
  };
}

export function createItemRecord(input, { now = () => new Date().toISOString() } = {}) {
  return parseItemRecord({
    ...input,
    id: input.id?.trim(),
    goodsTypeId: input.goodsTypeId?.trim(),
    name: input.name?.trim(),
    imageAssetId: input.imageAssetId?.trim() || null,
    customValues: input.customValues ?? {},
    ...createDeletionLifecycle(input, { entityName: "Item", now })
  });
}

export function assertItemContentUpdate(currentValue, nextValue) {
  const currentItem = parseItemRecord(currentValue);
  const nextItem = parseItemRecord(nextValue);

  if (
    currentItem.id !== nextItem.id ||
    currentItem.goodsTypeId !== nextItem.goodsTypeId ||
    currentItem.createdAt !== nextItem.createdAt ||
    currentItem.isDeleted ||
    nextItem.isDeleted
  ) {
    throw new TypeError("Item content updates require the same active item identity.");
  }

  requireForwardTimestamp(currentItem, nextItem);
}

export function assertItemLifecycleUpdate(currentValue, nextValue) {
  const currentItem = parseItemRecord(currentValue);
  const nextItem = parseItemRecord(nextValue);

  if (
    currentItem.isDeleted === nextItem.isDeleted ||
    !areJsonValuesEqual(
      getLifecycleNeutralItem(currentItem),
      getLifecycleNeutralItem(nextItem)
    )
  ) {
    throw new TypeError("Item lifecycle updates may only change deletion state.");
  }

  requireForwardTimestamp(currentItem, nextItem);
}
