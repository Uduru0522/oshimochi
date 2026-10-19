import { RECORD_SCOPES } from "../../data/models/record-lifecycle.js";
import { createDashboardCardRecord, createRecentItemsCardRecord } from "../../data/models/dashboard-card.js";
import { calculateDashboardCard } from "./calculate-card.js";
import { calculateDashboardBreakdown } from "./calculate-breakdown.js";

export function createDashboardOperations({ storage }) {
  if (["listGoodsTypes", "listFieldDefinitions", "listItems", "listDashboardCards", "replaceDashboardCards"].some(
    (method) => typeof storage?.[method] !== "function"
  )) {
    throw new TypeError("Dashboard operations require collection, field, and item reads and card storage.");
  }

  async function readCollectionData(card) {
    const definition = structuredClone(card);
    const goodsTypes = await storage.listGoodsTypes({ scope: RECORD_SCOPES.active });
    const collections = await Promise.all(definition.sources.map(async ({ goodsTypeId }) => {
      const goodsType = goodsTypes.find(({ id }) => id === goodsTypeId);
      if (!goodsType) return { goodsType: null, fields: [], items: [] };
      const [fields, items] = await Promise.all([
        storage.listFieldDefinitions(goodsTypeId, { scope: RECORD_SCOPES.active }),
        storage.listItems(goodsTypeId, {
          scope: definition.includeDeleted ? RECORD_SCOPES.all : RECORD_SCOPES.active
        })
      ]);
      return { goodsType, fields, items };
    }));
    return { definition, collections };
  }

  async function readCard(card, options) {
    const { definition, collections } = await readCollectionData(card);
    if (definition.groupBy?.type === "field") {
      const { breakdown, ...result } = calculateDashboardBreakdown(definition, collections, options);
      return result;
    }
    return calculateDashboardCard(definition, collections, options);
  }

  async function readCardBreakdown(card, options) {
    const { definition, collections } = await readCollectionData(card);
    return calculateDashboardBreakdown(definition, collections, options);
  }

  async function readRecentItems({ limit = 5 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new RangeError("Recent item limit must be between 1 and 50.");
    }
    const goodsTypes = await storage.listGoodsTypes({ scope: RECORD_SCOPES.active });
    const collections = await Promise.all(goodsTypes.map(async (goodsType) => {
      const items = await storage.listItems(goodsType.id, { scope: RECORD_SCOPES.active });
      return items.map((item) => ({ item, goodsType }));
    }));
    return collections.flat().sort((first, second) => {
      if (first.item.createdAt !== second.item.createdAt) {
        return first.item.createdAt > second.item.createdAt ? -1 : 1;
      }
      return first.item.id === second.item.id ? 0 : first.item.id < second.item.id ? -1 : 1;
    }).slice(0, limit);
  }

  async function readOverview() {
    const goodsTypes = await storage.listGoodsTypes({ scope: RECORD_SCOPES.active });
    const collections = await Promise.all(goodsTypes.map(async (goodsType) => {
      const [fields, items] = await Promise.all([
        storage.listFieldDefinitions(goodsType.id, { scope: RECORD_SCOPES.active }),
        storage.listItems(goodsType.id, { scope: RECORD_SCOPES.all })
      ]);
      return { goodsType, fields, items };
    }));
    const items = collections.flatMap(({ items }) => items);
    return { collections, counts: {
      collections: collections.length,
      activeItems: items.filter(item => !item.isDeleted).length,
      deletedItems: items.filter(item => item.isDeleted).length
    } };
  }

  return Object.freeze({
    readCard,
    readCardBreakdown,
    readRecentItems,
    readOverview,
    createCard: (input) => createDashboardCardRecord(input),
    createRecentCard: (input) => createRecentItemsCardRecord(input),
    listCards: () => storage.listDashboardCards(),
    replaceCards: (change) => storage.replaceDashboardCards(change)
  });
}
