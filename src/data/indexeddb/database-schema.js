import { DOMAIN_MODEL_VERSION } from "../models/domain-model.js";

export const DATABASE_NAME = "oshimochi";
export const DATABASE_VERSION = 2;

export { DOMAIN_MODEL_VERSION };

export const OBJECT_STORES = Object.freeze({
  assets: "assets",
  dashboardCards: "dashboard_cards",
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

export function upgradeDatabase(database, oldVersion, transaction) {
  if (oldVersion < 1) {
    createVersionOneSchema(database);
  }
  if (oldVersion < 2) {
    database.createObjectStore(OBJECT_STORES.dashboardCards, { keyPath: "id" });
    if (oldVersion >= 1) {
      transaction.objectStore(OBJECT_STORES.metadata).put({
        key: "domainModelVersion", value: DOMAIN_MODEL_VERSION
      });
    }
  }
}
