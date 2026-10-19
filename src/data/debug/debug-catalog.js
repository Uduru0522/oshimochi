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
import { createDebugDashboardCards } from "./debug-dashboard-fixtures.js";

export function createDebugCatalog(options = {}) {
  const usesDefaultCatalog = options.goodsTypes === undefined;
  const usesDefaultDashboard = ["goodsTypes", "fieldDefinitions", "items", "assets"].every(key => options[key] === undefined);
  const timestamp = new Date(options.now?.() ?? new Date()).toISOString();
  const now = () => timestamp;
  const goodsTypes = options.goodsTypes ?? createDebugGoodsTypes();
  const fieldDefinitions = options.fieldDefinitions ?? createDebugFieldDefinitions(goodsTypes);
  const items = options.items ?? (usesDefaultCatalog ? createDebugItems({ now }) : []);
  const assets = options.assets ?? (usesDefaultCatalog ? createDebugAssets() : []);

  return {
    assets: assets.map(parseAssetRecord),
    dashboardCards: parseDashboardCards(options.dashboardCards ?? (usesDefaultDashboard
      ? createDebugDashboardCards({ goodsTypes, fieldDefinitions, now }) : [])),
    fieldDefinitions: fieldDefinitions.map(parseFieldDefinitionRecord),
    goodsTypes: goodsTypes.map(parseGoodsTypeRecord),
    items: items.map(parseItemRecord)
  };
}
