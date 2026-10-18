import { RECORD_SCOPES } from "../../data/models/record-lifecycle.js";
import { calculateDashboardCard } from "./calculate-card.js";

export function createDashboardOperations({ storage }) {
  if (["listGoodsTypes", "listFieldDefinitions", "listItems"].some(
    (method) => typeof storage?.[method] !== "function"
  )) {
    throw new TypeError("Dashboard operations require collection, field, and item reads.");
  }

  async function readCard(card, options) {
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
    return calculateDashboardCard(definition, collections, options);
  }

  return Object.freeze({ readCard });
}
