import { getItemFieldValue } from "../items/item-field-value.js";
import { summarizeDashboardSelection } from "./calculate-card.js";
import { selectDashboardItems } from "./card-selection.js";

export function calculateDashboardBreakdown(card, collections, options) {
  const selection = selectDashboardItems(card, collections, options);
  const result = summarizeDashboardSelection(card.calculation, selection);
  if (!["sum", "count"].includes(card.calculation) || !["ready", "empty"].includes(result.status)) {
    return { ...result, breakdown: [] };
  }
  const breakdown = [], issues = [];
  for (const selected of selection.selections) {
    const { source, collection } = selected;
    const grouping = card.groupBy?.type === "field"
      ? card.groupBy.fields.find((field) => field.goodsTypeId === source.goodsTypeId) : null;
    const field = grouping ? collection.fields.find((field) => field.id === grouping.fieldId) : null;
    const groups = new Map();
    if (!grouping) groups.set(null, selected.items);
    else for (const item of selected.items) {
      const value = getItemFieldValue(item, field);
      const key = value === undefined || value === null || value === "" ? null : value;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const categoryOrder = (key) => key === null ? Infinity : field?.dataType === "boolean"
      ? (key ? 1 : 0) : field?.options.choices.findIndex((choice) => choice.id === key) ?? 0;
    const entries = [...groups];
    if (grouping) entries.sort(([first], [second]) => categoryOrder(first) - categoryOrder(second));
    for (const [key, items] of entries) {
      const value = summarizeDashboardSelection(card.calculation, { selections: [{ ...selected, items }] });
      if (grouping && value.matchedItemCount === 0) continue;
      let label = collection.goodsType.displayName;
      if (grouping) {
        if (key === null) label = "Uncategorized";
        else if (field.dataType === "boolean" && typeof key === "boolean") {
          label = key ? field.options.trueLabel : field.options.falseLabel;
        } else if (field.dataType === "select" && field.options.choices.some((choice) => choice.id === key)) {
          label = field.options.choices.find((choice) => choice.id === key).label;
        } else {
          issues.push({
            code: "choice-unavailable", goodsTypeId: source.goodsTypeId, goodsTypeName: collection.goodsType.displayName,
            fieldId: field.id, fieldName: field.displayName, choiceId: key,
            choiceName: grouping.choiceLabels?.find((choice) => choice.id === key)?.label ?? String(key)
          });
          continue;
        }
      }
      breakdown.push({
        id: JSON.stringify(grouping ? [source.goodsTypeId, field.id, key] : [source.goodsTypeId]),
        label,
        goodsTypeId: source.goodsTypeId,
        goodsTypeName: collection.goodsType.displayName,
        value: value.value,
        matchedItemCount: value.matchedItemCount,
        valueCount: value.valueCount
      });
    }
  }
  if (issues.length) return { status: "needs-repair", value: null, matchedItemCount: null, valueCount: null, issues, breakdown: [] };
  return { ...result, breakdown };
}
