import { createAssetRecord } from "../src/data/models/asset.js";
import { createBuiltInFieldDefinitions } from "../src/data/models/built-in-fields.js";
import { createFieldDefinitionRecord } from "../src/data/models/field-definition.js";
import { createGoodsTypeRecord } from "../src/data/models/goods-type.js";
import { createItemRecord } from "../src/data/models/item.js";

export const CATALOG_TIMESTAMP = "2026-10-17T00:00:00.000Z";

export function createDataCatalogFixture() {
  const goodsType = createGoodsTypeRecord(
    {
      id: "figures",
      displayName: "Figures",
      description: ""
    },
    { now: () => CATALOG_TIMESTAMP }
  );
  const fieldDefinitions = createBuiltInFieldDefinitions({
    goodsTypeId: goodsType.id,
    generateId: (key) => `figures-${key}`,
    now: () => CATALOG_TIMESTAMP
  });
  const customField = createFieldDefinitionRecord(
    {
      id: "figures-series",
      goodsTypeId: goodsType.id,
      key: "series",
      displayName: "Series",
      dataType: "text",
      isRequired: true,
      isBuiltIn: false,
      position: 3
    },
    { now: () => CATALOG_TIMESTAMP }
  );
  const data = new Blob(["image"], { type: "image/jpeg" });
  const asset = createAssetRecord(
    {
      id: "asset-1",
      data,
      mediaType: data.type,
      width: 560,
      height: 792
    },
    { now: () => CATALOG_TIMESTAMP }
  );
  const item = createItemRecord(
    {
      id: "item-1",
      goodsTypeId: goodsType.id,
      name: "Example",
      imageAssetId: asset.id,
      customValues: { [customField.id]: "Example series" }
    },
    { now: () => CATALOG_TIMESTAMP }
  );

  return {
    assets: [asset],
    fieldDefinitions: [...fieldDefinitions, customField],
    goodsTypes: [goodsType],
    items: [item]
  };
}
