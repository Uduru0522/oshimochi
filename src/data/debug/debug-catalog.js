import {
  createDebugAssets,
  createDebugFieldDefinitions,
  createDebugGoodsTypes,
  createDebugItems
} from "./debug-fixtures.js";
import { parseAssetRecord } from "../models/asset.js";
import { parseDashboardCards } from "../models/dashboard-card.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import { parseGoodsTypeRecord } from "../models/goods-type.js";
import { parseItemRecord } from "../models/item.js";

export function createDebugCatalog(options = {}) {
  const usesDefaultCatalog = options.goodsTypes === undefined;
  const goodsTypes = options.goodsTypes ?? createDebugGoodsTypes();
  const fieldDefinitions = options.fieldDefinitions ?? createDebugFieldDefinitions(goodsTypes);
  const items = options.items ?? (usesDefaultCatalog ? createDebugItems() : []);
  const assets = options.assets ?? (usesDefaultCatalog ? createDebugAssets() : []);

  return {
    assets: assets.map(parseAssetRecord),
    dashboardCards: parseDashboardCards(options.dashboardCards ?? []),
    fieldDefinitions: fieldDefinitions.map(parseFieldDefinitionRecord),
    goodsTypes: goodsTypes.map(parseGoodsTypeRecord),
    items: items.map(parseItemRecord)
  };
}
