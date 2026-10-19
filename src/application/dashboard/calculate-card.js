import { getItemFieldValue } from "../items/item-field-value.js";
import { selectDashboardItems } from "./card-selection.js";

function aggregate(values, calculation) {
  if (calculation === "minimum") {
    return values.reduce((result, value) => Math.min(result, value), Infinity);
  }
  if (calculation === "maximum") {
    return values.reduce((result, value) => Math.max(result, value), -Infinity);
  }
  const total = values.reduce((result, value) => result + value, 0);
  if (calculation !== "average") return total;
  if (Number.isFinite(total)) return total / values.length;
  // Avoid an overflowing total when the average itself is representable.
  return values.reduce((result, value) => result + value / values.length, 0);
}

export function summarizeDashboardSelection(calculation, { issues = [], selections }) {
  if (issues.length) {
    return { status: "needs-repair", value: null, matchedItemCount: null, valueCount: null, issues };
  }
  const values = [];
  let matchedItemCount = 0;
  for (const { source, collection, items } of selections) {
    matchedItemCount += items.length;
    if (calculation === "count") continue;
    const field = collection.fields.find(field => field.id === source.fieldId);
    for (const item of items) {
      const value = getItemFieldValue(item, field);
      if (typeof value === "number" && Number.isFinite(value)) values.push(value);
    }
  }
  const valueCount = calculation === "count" ? matchedItemCount : values.length;
  const value = calculation === "count" ? matchedItemCount
    : values.length === 0 ? null : aggregate(values, calculation);
  const status = value === null ? "empty" : Number.isFinite(value) ? "ready" : "overflow";
  return { status, value: status === "overflow" ? null : value, matchedItemCount, valueCount, issues: [] };
}

export function calculateDashboardCard(card, collections, options) {
  return summarizeDashboardSelection(card.calculation, selectDashboardItems(card, collections, options));
}
