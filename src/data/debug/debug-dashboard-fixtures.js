import { createDashboardCardRecord, createRecentItemsCardRecord } from "../models/dashboard-card.js";

// Derive remembered labels from the actual fixture fields so sample cards stay
// editable and demonstrate selecting different number fields per collection.
export function createDebugDashboardCards({ goodsTypes, fieldDefinitions, now }) {
  function field(goodsTypeId, key) {
    const definition = fieldDefinitions.find(field => field.goodsTypeId === goodsTypeId && field.key === key);
    if (!definition) throw new TypeError(`Debug card field is missing: ${goodsTypeId}/${key}.`);
    return definition;
  }
  function source(goodsTypeId, key = null) {
    const number = key ? field(goodsTypeId, key) : null;
    return { goodsTypeId, goodsTypeName: goodsTypes.find(type => type.id === goodsTypeId).displayName,
      fieldId: number?.id ?? null, fieldName: number?.displayName ?? null };
  }
  const spendingSources = [source("tapestries", "purchase_price"), source("figures", "cost"), source("acrylic-goods", "purchase_price")];
  const yen = { type: "number", currency: null, unit: { symbol: "¥", position: "prefix" } };
  const condition = field("tapestries", "condition"), display = field("tapestries", "display_status");
  const definitions = [
    { id: "debug-total-spent", title: "Total spent", calculation: "sum", sources: spendingSources, format: yen },
    { id: "debug-collection-mix", title: "Collection mix", calculation: "count", sources: goodsTypes.map(type => source(type.id)) },
    { id: "debug-spent-this-year", title: "Spent this year", calculation: "sum", displayMode: "number", format: yen,
      sources: spendingSources.map(entry => {
        const purchased = field(entry.goodsTypeId, "purchased_on");
        return { ...entry, filter: { rules: [{ fieldId: purchased.id, fieldName: purchased.displayName, dataType: "date", datePreset: "this-year" }] } };
      }) },
    { id: "debug-tapestry-condition", title: "Tapestry condition", calculation: "count", sources: [source("tapestries")],
      groupBy: { type: "field", fields: [{ goodsTypeId: "tapestries", fieldId: condition.id, fieldName: condition.displayName,
        dataType: "select", choiceLabels: condition.options.choices }] } },
    { id: "debug-average-figure-price", title: "Average figure price", calculation: "average", sources: [source("figures", "cost")], format: yen },
    { id: "debug-tapestries-on-display", title: "Tapestries on display", calculation: "count", displayMode: "number",
      sources: [{ ...source("tapestries"), filter: { rules: [{ fieldId: display.id, fieldName: display.displayName, dataType: "boolean", values: [true] }] } }] }
  ];
  return [createRecentItemsCardRecord({ id: "debug-recent-items" }, { now }),
    ...definitions.map((definition, index) => createDashboardCardRecord({ ...definition, position: index + 1 }, { now }))];
}
