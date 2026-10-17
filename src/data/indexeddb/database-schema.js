import { DOMAIN_MODEL_VERSION } from "../models/domain-model.js";

export const DATABASE_NAME = "wotagoods-manager";
export const DATABASE_VERSION = 2;

export { DOMAIN_MODEL_VERSION };

export const OBJECT_STORES = Object.freeze({
  assets: "assets",
  fieldDefinitions: "field_definitions",
  goodsTypes: "goods_types",
  items: "items",
  metadata: "app_metadata"
});

export const INDEXES = Object.freeze({
  fieldDefinitionsByGoodsType: "by_goods_type",
  fieldDefinitionsByGoodsTypeAndKey: "by_goods_type_and_key",
  goodsTypesByUpdatedAt: "by_updated_at",
  itemsByGoodsType: "by_goods_type",
  itemsByGoodsTypeAndUpdatedAt: "by_goods_type_and_updated_at"
});

function createVersionOneSchema(database) {
  const goodsTypes = database.createObjectStore(OBJECT_STORES.goodsTypes, {
    keyPath: "id"
  });
  goodsTypes.createIndex(INDEXES.goodsTypesByUpdatedAt, "updatedAt");

  const fieldDefinitions = database.createObjectStore(OBJECT_STORES.fieldDefinitions, {
    keyPath: "id"
  });
  fieldDefinitions.createIndex(
    INDEXES.fieldDefinitionsByGoodsType,
    "goodsTypeId"
  );
  fieldDefinitions.createIndex(
    INDEXES.fieldDefinitionsByGoodsTypeAndKey,
    ["goodsTypeId", "key"],
    { unique: true }
  );

  const items = database.createObjectStore(OBJECT_STORES.items, {
    keyPath: "id"
  });
  items.createIndex(INDEXES.itemsByGoodsType, "goodsTypeId");
  items.createIndex(
    INDEXES.itemsByGoodsTypeAndUpdatedAt,
    ["goodsTypeId", "updatedAt"]
  );

  database.createObjectStore(OBJECT_STORES.assets, { keyPath: "id" });
  const metadata = database.createObjectStore(OBJECT_STORES.metadata, {
    keyPath: "key"
  });

  metadata.put({ key: "domainModelVersion", value: DOMAIN_MODEL_VERSION });
}

function migrateVersionTwoData(transaction) {
  const fields = transaction.objectStore(OBJECT_STORES.fieldDefinitions);
  const request = fields.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;

    if (!cursor) {
      return;
    }

    const field = cursor.value;

    if (
      field?.isBuiltIn === true &&
      field.key === "image" &&
      field.isRequired === false
    ) {
      cursor.update({ ...field, isRequired: true });
    }

    cursor.continue();
  };
}

export function upgradeDatabase(database, oldVersion, transaction) {
  if (oldVersion < 1) {
    createVersionOneSchema(database);
  }

  if (oldVersion >= 1 && oldVersion < 2) {
    migrateVersionTwoData(transaction);
  }
}
