import { createDataCatalogFixture } from "./data-catalog-fixtures.js";
import { createAssetRecord } from "../src/data/models/asset.js";
import { createFieldDefinitionRecord } from "../src/data/models/field-definition.js";
import { createGoodsTypeRecord } from "../src/data/models/goods-type.js";
import { createBuiltInFieldDefinitions } from "../src/data/models/built-in-fields.js";
import { createItemRecord } from "../src/data/models/item.js";

export function createDashboardCatalogFixture() {
  const catalog = createDataCatalogFixture(), timestamp = new Date().toISOString(), now = () => timestamp;
  const year = new Date().getFullYear();
  const data = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="#81aacc"/></svg>'], { type: "image/svg+xml" });
  catalog.assets[0] = createAssetRecord({ id: "asset-1", data, mediaType: data.type, width: 40, height: 60 }, { now });
  catalog.goodsTypes.push(createGoodsTypeRecord({ id: "tapestries", displayName: "Tapestries" }, { now }));
  catalog.fieldDefinitions.push(...createBuiltInFieldDefinitions({ goodsTypeId: "tapestries", generateId: key => `tapestries-${key}`, now }));
  for (const [goodsTypeId, fields] of [["figures", [["price", "Purchase price", "number"], ["shipping", "Shipping cost", "number"], ["status", "Status", "select"], ["owned", "Owned?", "boolean"], ["purchased", "Purchased", "date"]]], ["tapestries", [["cost", "Purchased cost", "number"], ["status", "Ownership", "select"]]]]) {
    fields.forEach(([key, displayName, dataType], index) => {
      catalog.fieldDefinitions.push(createFieldDefinitionRecord({ id: `${goodsTypeId}-${key}`, goodsTypeId, key, displayName, dataType,
        position: (goodsTypeId === "figures" ? 4 : 3) + index,
        ...(dataType === "select" ? { options: { choices: [{ id: `${goodsTypeId}-owned`, label: "Owned" }, { id: `${goodsTypeId}-wanted`, label: "Wanted" }] } } : {}),
        ...(dataType === "boolean" ? { options: { falseLabel: "Not owned", trueLabel: "Owned" } } : {}) }, { now }));
    });
  }
  catalog.items[0].name = "Limited edition figure";
  Object.assign(catalog.items[0].customValues, { "figures-price": 1200, "figures-shipping": 45, "figures-status": "figures-owned", "figures-owned": true, "figures-purchased": `${year - 1}-06-01` });
  for (const [id, name, price, shipping] of [["free", "Mini figure", 0, 60], ["missing", "Desk figure", undefined, 75], ["deleted", "Deleted figure", 2400, 120]]) {
    catalog.items.push(createItemRecord({ id, name, goodsTypeId: "figures", customValues: { "figures-shipping": shipping,
      ...(price === undefined ? {} : { "figures-price": price, "figures-status": id === "free" ? "figures-wanted" : "figures-owned", "figures-owned": id !== "free", "figures-purchased": `${year}-01-01` }) },
      isDeleted: id === "deleted", deletedAt: id === "deleted" ? timestamp : null }, { now }));
  }
  for (const [id, name, cost] of [["tapestry-1", "Summer tapestry", 3000], ["tapestry-2", "Concert tapestry", 1500]]) {
    catalog.items.push(createItemRecord({ id, name, goodsTypeId: "tapestries", customValues: { "tapestries-cost": cost, "tapestries-status": id === "tapestry-1" ? "tapestries-owned" : "tapestries-wanted" } }, { now }));
  }
  catalog.items = catalog.items.map((item, index) => ({ ...item,
    createdAt: new Date(Date.parse(timestamp) - (catalog.items.length - index) * 3600000).toISOString(), updatedAt: timestamp }));
  return catalog;
}
