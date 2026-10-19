import { parseRecordTimestamps } from "./record-lifecycle.js";
import { requireBoolean, requireRecord, requireString } from "./record-validation.js";

export const DASHBOARD_CALCULATIONS = Object.freeze([
  "count", "sum", "average", "minimum", "maximum"
]);

const TEXT_OPERATORS = ["contains", "not_contains", "equals", "starts_with", "ends_with"];

function name(value, label) {
  return requireString(value, label, { allowEmpty: false, canonical: true });
}

function array(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`);
}

function date(value, label) {
  requireString(value, label);
  if (value === "") return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ||
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} must be a calendar date.`);
  }
  return value;
}

function parseRule(value) {
  const input = requireRecord(value, "Card filter");
  const rule = {
    fieldId: name(input.fieldId, "Filter field ID"),
    fieldName: name(input.fieldName, "Filter field name"),
    dataType: name(input.dataType, "Filter data type"),
    includeMissing: requireBoolean(input.includeMissing, "includeMissing")
  };
  if (["text", "long_text", "url"].includes(rule.dataType)) {
    const operators = rule.dataType === "url" ? [...TEXT_OPERATORS, "domain_equals"] : TEXT_OPERATORS;
    if (!operators.includes(input.operator)) throw new TypeError("Unsupported text filter operator.");
    return { ...rule, operator: input.operator, value: name(input.value, "Filter value") };
  }
  if (rule.dataType === "number") {
    if (input.operator !== "range") throw new TypeError("Numeric filters require a range.");
    const bounds = {};
    for (const key of ["min", "max"]) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== "number" || !Number.isFinite(input[key])) {
        throw new TypeError(`Filter ${key} must be finite.`);
      }
      bounds[key] = input[key];
    }
    if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
      throw new TypeError("Filter minimum cannot exceed maximum.");
    }
    return { ...rule, operator: "range", ...bounds };
  }
  if (rule.dataType === "date") {
    const from = date(input.from, "Filter start"), to = date(input.to, "Filter end");
    const datePreset = input.datePreset ?? null;
    if (datePreset !== null && datePreset !== "this-year") {
      throw new TypeError("Unsupported relative date filter.");
    }
    if (datePreset === "this-year" ? from !== "" || to !== "" : (!from && !to) || (from && to && from > to)) {
      throw new TypeError("Date filters require a relative preset or an ordered date range.");
    }
    return { ...rule, from, to, ...(datePreset ? { datePreset } : {}) };
  }
  if (rule.dataType === "boolean" || rule.dataType === "select") {
    const values = array(input.values, "Filter choices").map((entry) => rule.dataType === "boolean"
      ? requireBoolean(entry, "Filter choice") : name(entry, "Filter choice ID"));
    unique(values, "Filter choices");
    if (rule.dataType === "boolean") return { ...rule, values };
    const choiceLabels = array(input.choiceLabels, "Choice labels").map((entry) => {
      const choice = requireRecord(entry, "Choice label");
      return { id: name(choice.id, "Choice ID"), label: name(choice.label, "Choice label") };
    });
    unique(choiceLabels.map(({ id }) => id), "Choice label IDs");
    if (values.some((id) => !choiceLabels.some((choice) => choice.id === id))) {
      throw new TypeError("Selected choices require remembered labels.");
    }
    return { ...rule, values, choiceLabels };
  }
  throw new TypeError(`Unsupported card filter data type: ${rule.dataType}.`);
}

function parseSource(value, calculation) {
  const input = requireRecord(value, "Card collection");
  const filter = requireRecord(input.filter, "Collection filter");
  const rules = array(filter.rules, "Filter rules").map(parseRule);
  unique(rules.map(({ fieldId }) => fieldId), "Filtered field IDs");
  const numeric = calculation !== "count";
  return {
    goodsTypeId: name(input.goodsTypeId, "Collection ID"),
    goodsTypeName: name(input.goodsTypeName, "Collection name"),
    fieldId: numeric ? name(input.fieldId, "Numeric field ID") : null,
    fieldName: numeric ? name(input.fieldName, "Numeric field name") : null,
    filter: { query: requireString(filter.query, "Card search"), rules }
  };
}

function parseGrouping(value, sources, calculation) {
  if (value === undefined) return { type: "collection" };
  const input = requireRecord(value, "Card grouping");
  if (input.type === "collection") return { type: "collection" };
  if (input.type !== "field" || !["sum", "count"].includes(calculation)) {
    throw new TypeError("Field grouping is available for sums and counts.");
  }
  const fields = array(input.fields, "Grouping fields").map((value) => {
    const field = requireRecord(value, "Grouping field");
    if (!["select", "boolean"].includes(field.dataType)) {
      throw new TypeError("Category grouping requires a selection or two-option field.");
    }
    const result = {
      goodsTypeId: name(field.goodsTypeId, "Grouped collection ID"),
      fieldId: name(field.fieldId, "Grouping field ID"),
      fieldName: name(field.fieldName, "Grouping field name"),
      dataType: field.dataType
    };
    if (field.dataType === "boolean") {
      return { ...result, falseLabel: name(field.falseLabel, "False label"), trueLabel: name(field.trueLabel, "True label") };
    }
    const choiceLabels = array(field.choiceLabels, "Grouping choice labels").map((value) => {
      const choice = requireRecord(value, "Grouping choice");
      return { id: name(choice.id, "Grouping choice ID"), label: name(choice.label, "Grouping choice label") };
    });
    unique(choiceLabels.map(({ id }) => id), "Grouping choice IDs");
    return { ...result, choiceLabels };
  });
  unique(fields.map(({ goodsTypeId }) => goodsTypeId), "Grouped collection IDs");
  if (fields.length !== sources.length || sources.some(({ goodsTypeId }) => !fields.some((field) => field.goodsTypeId === goodsTypeId))) {
    throw new TypeError("Choose a category field for every selected collection.");
  }
  return { type: "field", fields };
}

export function parseDashboardCardRecord(value) {
  const input = requireRecord(value, "Dashboard card");
  if (!Number.isSafeInteger(input.position) || input.position < 0) {
    throw new TypeError("Card position must be a non-negative safe integer.");
  }
  if (input.type === "recent-items") {
    return {
      id: name(input.id, "Card ID"),
      type: "recent-items",
      visible: requireBoolean(input.visible, "visible"),
      position: input.position,
      ...parseRecordTimestamps(input)
    };
  }
  if (input.type !== undefined) throw new TypeError("Unsupported dashboard card type.");
  if (!DASHBOARD_CALCULATIONS.includes(input.calculation)) {
    throw new TypeError("Unsupported dashboard calculation.");
  }
  const displayMode = input.displayMode === undefined ? "auto" : input.displayMode;
  if (!["auto", "number", "ring"].includes(displayMode)) {
    throw new TypeError("Card display must be auto, number, or ring.");
  }
  if (displayMode === "ring" && !["sum", "count"].includes(input.calculation)) {
    throw new TypeError("Ring display is available for sums and counts.");
  }
  const sources = array(input.sources, "Card collections").map((source) => parseSource(source, input.calculation));
  if (sources.length === 0) throw new TypeError("Cards require at least one collection.");
  unique(sources.map(({ goodsTypeId }) => goodsTypeId), "Card collection IDs");
  const format = requireRecord(input.format, "Card format");
  if (format.type !== "number" && format.type !== "currency") throw new TypeError("Unsupported card format.");
  if (format.type === "currency" && (typeof format.currency !== "string" || !/^[A-Z]{3}$/.test(format.currency))) {
    throw new TypeError("Currency cards require a three-letter uppercase currency code.");
  }
  if (format.type === "number" && format.currency !== null) {
    throw new TypeError("Number cards must not specify a currency.");
  }
  if (input.calculation === "count" && format.type !== "number") {
    throw new TypeError("Item counts use number formatting.");
  }
  let unit;
  if (format.unit !== undefined) {
    const value = requireRecord(format.unit, "Card unit");
    const symbol = name(value.symbol, "Unit symbol");
    if (symbol.length > 32 || /[\u0000-\u001f\u007f]/.test(symbol)) {
      throw new TypeError("Unit symbols must be at most 32 characters without control characters.");
    }
    if (!["prefix", "suffix"].includes(value.position)) {
      throw new TypeError("Unit position must be prefix or suffix.");
    }
    if (format.type !== "number") throw new TypeError("Custom units require number formatting.");
    unit = { symbol, position: value.position };
  }
  return {
    id: name(input.id, "Card ID"),
    title: name(input.title, "Card title"),
    calculation: input.calculation,
    displayMode,
    includeDeleted: requireBoolean(input.includeDeleted, "includeDeleted"),
    position: input.position,
    sources,
    groupBy: parseGrouping(input.groupBy, sources, input.calculation),
    format: { type: format.type, currency: format.currency, ...(unit ? { unit } : {}) },
    ...parseRecordTimestamps(input)
  };
}

export function createDashboardCardRecord(input, { now = () => new Date().toISOString() } = {}) {
  const timestamp = now();
  return parseDashboardCardRecord({
    ...input,
    includeDeleted: input.includeDeleted ?? false,
    position: input.position ?? 0,
    format: input.format ?? { type: "number", currency: null },
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    sources: array(input.sources, "Card collections").map((source) => ({
      ...source,
      filter: {
        query: source.filter?.query ?? "",
        rules: (source.filter?.rules ?? []).map((rule) => ({
          ...rule,
          includeMissing: rule.includeMissing ?? false,
          ...(rule.dataType === "date" ? {
            datePreset: rule.datePreset ?? null,
            from: rule.datePreset ? "" : rule.from ?? "",
            to: rule.datePreset ? "" : rule.to ?? ""
          } : {})
        }))
      }
    }))
  });
}

export function createRecentItemsCardRecord(input = {}, { now = () => new Date().toISOString() } = {}) {
  const timestamp = now();
  return parseDashboardCardRecord({
    id: input.id ?? "recent-items",
    type: "recent-items",
    visible: input.visible ?? true,
    position: input.position ?? 0,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp
  });
}

export function parseDashboardCards(value) {
  const cards = array(value, "Dashboard cards").map(parseDashboardCardRecord);
  if (cards.filter(({ type }) => type === "recent-items").length > 1) {
    throw new TypeError("Only one recent-items card is allowed.");
  }
  unique(cards.map(({ id }) => id), "Card IDs");
  unique(cards.map(({ position }) => position), "Card positions");
  return cards.sort((first, second) => first.position - second.position);
}
