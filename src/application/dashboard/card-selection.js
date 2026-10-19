import { DASHBOARD_CALCULATIONS } from "../../data/models/dashboard-card.js";
import { filterItems } from "../items/filter-items.js";

const CALCULATIONS = new Set(DASHBOARD_CALCULATIONS);

function findSourceIssues(source, collection, calculation, grouping) {
  const { goodsType, fields } = collection ?? {};
  const issue = (code, fieldId) => ({
    code,
    goodsTypeId: source.goodsTypeId,
    goodsTypeName: goodsType?.displayName ?? source.goodsTypeName ?? null,
    fieldId,
    fieldName: fields?.find((field) => field.id === fieldId)?.displayName
      ?? (source.fieldId === fieldId ? source.fieldName : source.filter?.rules?.find((rule) => rule.fieldId === fieldId)?.fieldName)
      ?? (grouping && grouping.fieldId === fieldId ? grouping.fieldName : null)
      ?? null
  });
  if (!goodsType || goodsType.isDeleted) {
    return [issue("collection-unavailable")];
  }

  const activeFields = fields.filter((field) =>
    !field.isDeleted && field.goodsTypeId === goodsType.id
  );
  const byId = new Map(activeFields.map((field) => [field.id, field]));
  const issues = [];
  if (grouping) {
    const field = byId.get(grouping.fieldId);
    if (!field) issues.push(issue("field-unavailable", grouping.fieldId));
    else if (!["select", "boolean"].includes(field.dataType) || field.dataType !== grouping.dataType) {
      issues.push(issue("category-field-required", grouping.fieldId));
    }
  }
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
      for (const choiceId of rule.values.filter((value) =>
        !field.options.choices.some((choice) => choice.id === value)
      )) {
        issues.push({
          ...issue("choice-unavailable", rule.fieldId),
          choiceId,
          choiceName: rule.choiceLabels?.find((choice) => choice.id === choiceId)?.label ?? null
        });
      }
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

// Validate every reference before selecting any items, so broken cards cannot
// expose a plausible partial total. The total and its groups share this selection.
export function selectDashboardItems(card, collections, { now = () => new Date() } = {}) {
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
    findSourceIssues(source, byId.get(source.goodsTypeId), card.calculation,
      card.groupBy?.type === "field" ? card.groupBy.fields.find((field) => field.goodsTypeId === source.goodsTypeId) : null)
  );
  if (issues.length > 0) {
    return { issues, selections: [] };
  }

  const timestamp = now();
  const selections = card.sources.map(source => {
    const collection = byId.get(source.goodsTypeId);
    const fields = collection.fields.filter(field => !field.isDeleted && field.goodsTypeId === collection.goodsType.id);
    const candidates = collection.items.filter(item =>
      item.goodsTypeId === collection.goodsType.id && (card.includeDeleted || !item.isDeleted));
    const filter = resolveFilter(source.filter, () => timestamp);
    for (const rule of filter.rules) {
      if (rule.datePreset && fields.find(field => field.id === rule.fieldId).dataType !== "date") {
        throw new TypeError("Relative dashboard dates require a date field.");
      }
    }
    return { source, collection: { ...collection, fields }, items: filterItems(candidates, fields, filter) };
  });
  return { issues: [], selections };
}
