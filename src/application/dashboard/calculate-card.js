import { filterItems } from "../items/filter-items.js";
import { getItemFieldValue } from "../items/item-field-value.js";

const CALCULATIONS = new Set(["count", "sum", "average", "minimum", "maximum"]);

function findSourceIssues(source, collection, calculation) {
  const { goodsType, fields } = collection ?? {};
  const issue = (code, fieldId) => ({ code, goodsTypeId: source.goodsTypeId, fieldId });
  if (!goodsType || goodsType.isDeleted) {
    return [issue("collection-unavailable")];
  }

  const activeFields = fields.filter((field) =>
    !field.isDeleted && field.goodsTypeId === goodsType.id
  );
  const byId = new Map(activeFields.map((field) => [field.id, field]));
  const issues = [];
  if (calculation !== "count") {
    const field = byId.get(source.fieldId);
    if (!field) issues.push(issue("field-unavailable", source.fieldId));
    else if (field.dataType !== "number") {
      issues.push(issue("numeric-field-required", source.fieldId));
    }
  }
  for (const rule of source.filter?.rules ?? []) {
    const field = byId.get(rule.fieldId);
    if (!field) {
      issues.push(issue("field-unavailable", rule.fieldId));
    } else if (field.dataType === "select" && rule.values?.some((value) =>
      !field.options.choices.some((choice) => choice.id === value)
    )) {
      issues.push(issue("choice-unavailable", rule.fieldId));
    }
  }
  return issues;
}

function resolveFilter(filter = {}, now) {
  return {
    ...filter,
    rules: (filter.rules ?? []).map((rule) => {
      if (rule.datePreset === undefined) return rule;
      if (rule.datePreset !== "this-year") {
        throw new TypeError(`Unsupported dashboard date preset: ${rule.datePreset}.`);
      }
      const year = new Date(now()).getFullYear();
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        throw new RangeError("Dashboard dates require a valid local calendar year.");
      }
      const prefix = String(year).padStart(4, "0");
      return { ...rule, from: `${prefix}-01-01`, to: `${prefix}-12-31` };
    })
  };
}

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

/**
 * Evaluate a structurally validated card against current collection records.
 * Check references before filtering so an unavailable source never becomes a
 * plausible partial total. Input records and saved filter rules are read-only.
 */
export function calculateDashboardCard(card, collections, { now = () => new Date() } = {}) {
  if (!CALCULATIONS.has(card.calculation)) {
    throw new TypeError(`Unsupported dashboard calculation: ${card.calculation}.`);
  }
  if (!Array.isArray(card.sources) || card.sources.length === 0) {
    throw new TypeError("Dashboard cards require at least one collection.");
  }
  const sourceIds = card.sources.map((source) => source.goodsTypeId);
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new TypeError("A dashboard card cannot count a collection twice.");
  }

  const byId = new Map(collections.map((collection) => [collection.goodsType?.id, collection]));
  const issues = card.sources.flatMap((source) =>
    findSourceIssues(source, byId.get(source.goodsTypeId), card.calculation)
  );
  if (issues.length > 0) {
    return { status: "needs-repair", value: null, matchedItemCount: null, valueCount: null, issues };
  }

  const timestamp = now();
  const values = [];
  let matchedItemCount = 0;
  for (const source of card.sources) {
    const { goodsType, fields, items } = byId.get(source.goodsTypeId);
    const activeFields = fields.filter((field) =>
      !field.isDeleted && field.goodsTypeId === goodsType.id
    );
    const candidates = items.filter((item) =>
      item.goodsTypeId === goodsType.id && (card.includeDeleted || !item.isDeleted)
    );
    const filter = resolveFilter(source.filter, () => timestamp);
    for (const rule of filter.rules) {
      if (rule.datePreset && activeFields.find((field) => field.id === rule.fieldId).dataType !== "date") {
        throw new TypeError("Relative dashboard dates require a date field.");
      }
    }
    const matches = filterItems(candidates, activeFields, filter);
    matchedItemCount += matches.length;
    if (card.calculation === "count") continue;
    const field = activeFields.find((field) => field.id === source.fieldId);
    for (const item of matches) {
      const value = getItemFieldValue(item, field);
      if (typeof value === "number" && Number.isFinite(value)) values.push(value);
    }
  }

  const valueCount = card.calculation === "count" ? matchedItemCount : values.length;
  const value = card.calculation === "count"
    ? matchedItemCount
    : values.length === 0 ? null : aggregate(values, card.calculation);
  const status = value === null ? "empty" : Number.isFinite(value) ? "ready" : "overflow";
  return {
    status,
    value: status === "overflow" ? null : value,
    matchedItemCount,
    valueCount,
    issues: []
  };
}
