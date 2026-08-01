const TEXT_TYPES = new Set(["long_text", "text"]);

export const ITEM_FILTER_OPERATORS = Object.freeze({
  CONTAINS: "contains",
  DOMAIN_EQUALS: "domain_equals",
  ENDS_WITH: "ends_with",
  EQUALS: "equals",
  NOT_CONTAINS: "not_contains",
  RANGE: "range",
  STARTS_WITH: "starts_with"
});

function normalizeText(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase();
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function readQuotedToken(source, startIndex) {
  let index = startIndex + 1;
  let value = "";

  while (index < source.length) {
    const character = source[index];

    if (character === "\\" && index + 1 < source.length) {
      value += source[index + 1];
      index += 2;
      continue;
    }

    if (character === "\"") {
      return { endIndex: index + 1, value };
    }

    value += character;
    index += 1;
  }

  return { endIndex: index, value };
}

export function parseItemSearchQuery(query) {
  const source = typeof query === "string" ? query : "";
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) {
      index += 1;
    }

    if (index >= source.length) {
      break;
    }

    let excluded = false;
    if (source[index] === "-" && !/\s/.test(source[index + 1] ?? "")) {
      excluded = true;
      index += 1;
    }

    let exact = false;
    let value = "";
    if (source[index] === "\"") {
      exact = true;
      const quoted = readQuotedToken(source, index);
      value = quoted.value;
      index = quoted.endIndex;
    } else {
      const startIndex = index;
      while (index < source.length && !/\s/.test(source[index])) {
        index += 1;
      }
      value = source.slice(startIndex, index);
    }

    if (value !== "") {
      tokens.push({ exact, excluded, value });
    }
  }

  return tokens;
}

export function getItemFieldValue(item, field) {
  if (!field.isBuiltIn) {
    return item.customValues[field.id];
  }

  if (field.key === "id") {
    return item.id;
  }

  if (field.key === "name") {
    return item.name;
  }

  if (field.key === "image") {
    return item.imageAssetId;
  }

  return undefined;
}

function getHumanReadableValue(value, field) {
  if (!hasValue(value)) {
    return "";
  }

  if (field.dataType === "boolean") {
    return value ? field.options.trueLabel : field.options.falseLabel;
  }

  if (field.dataType === "select") {
    return field.options.choices.find(({ id }) => id === value)?.label ?? value;
  }

  return String(value);
}

function matchesGeneralQuery(item, fields, tokens) {
  if (tokens.length === 0) {
    return true;
  }

  const searchableText = normalizeText(
    fields
      .filter(({ dataType }) => dataType !== "image")
      .filter(({ isBuiltIn, key }) => !isBuiltIn || key !== "id")
      .map((field) => getHumanReadableValue(getItemFieldValue(item, field), field))
      .filter(Boolean)
      .join("\n")
  );

  return tokens.every(({ excluded, value }) => {
    const isMatch = searchableText.includes(normalizeText(value));
    return excluded ? !isMatch : isMatch;
  });
}

function matchesText(value, rule) {
  const actual = normalizeText(value);
  const expected = normalizeText(rule.value ?? "");

  switch (rule.operator) {
    case ITEM_FILTER_OPERATORS.CONTAINS:
      return actual.includes(expected);
    case ITEM_FILTER_OPERATORS.NOT_CONTAINS:
      return !actual.includes(expected);
    case ITEM_FILTER_OPERATORS.EQUALS:
      return actual === expected;
    case ITEM_FILTER_OPERATORS.STARTS_WITH:
      return actual.startsWith(expected);
    case ITEM_FILTER_OPERATORS.ENDS_WITH:
      return actual.endsWith(expected);
    default:
      return false;
  }
}

function matchesNumber(value, rule) {
  if (rule.operator !== ITEM_FILTER_OPERATORS.RANGE || typeof value !== "number") {
    return false;
  }

  const minimumMatches = rule.min === undefined || value >= rule.min;
  const maximumMatches = rule.max === undefined || value <= rule.max;
  return minimumMatches && maximumMatches;
}

function matchesDate(value, rule) {
  if (typeof value !== "string") {
    return false;
  }

  const afterStart = !rule.from || value >= rule.from;
  const beforeEnd = !rule.to || value <= rule.to;
  return afterStart && beforeEnd;
}

function matchesUrl(value, rule) {
  if (rule.operator !== ITEM_FILTER_OPERATORS.DOMAIN_EQUALS) {
    return matchesText(value, rule);
  }

  try {
    return normalizeText(new URL(value).hostname) === normalizeText(rule.value ?? "");
  } catch {
    return false;
  }
}

function matchesRule(item, field, rule) {
  const value = getItemFieldValue(item, field);

  if (!hasValue(value)) {
    const choices = Array.isArray(rule.values) ? rule.values : null;
    return rule.includeMissing === true || choices?.length === 0;
  }

  if (TEXT_TYPES.has(field.dataType)) {
    return matchesText(value, rule);
  }

  switch (field.dataType) {
    case "number":
      return matchesNumber(value, rule);
    case "date":
      return matchesDate(value, rule);
    case "url":
      return matchesUrl(value, rule);
    case "boolean":
      return rule.values.includes(value);
    case "select":
      return rule.values.includes(value);
    case "image":
      return rule.values.includes(true);
    default:
      return false;
  }
}

export function getNumberFilterDomain(items, field) {
  const values = [...new Set(
    items
      .map((item) => getItemFieldValue(item, field))
      .filter((value) => typeof value === "number" && Number.isFinite(value))
  )].sort((first, second) => first - second);

  if (values.length === 0) {
    return null;
  }

  return {
    max: values.at(-1),
    min: values[0],
    values
  };
}

export function filterItems(items, fields, filter = {}) {
  const tokens = parseItemSearchQuery(filter.query);
  const rules = Array.isArray(filter.rules) ? filter.rules : [];
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  return items.filter((item) =>
    matchesGeneralQuery(item, fields, tokens) &&
    rules.every((rule) => {
      const field = fieldsById.get(rule.fieldId);
      return field ? matchesRule(item, field, rule) : false;
    })
  );
}

export function countActiveItemFilters(filter = {}) {
  const queryCount = typeof filter.query === "string" && filter.query.trim() !== "" ? 1 : 0;
  const rulesCount = Array.isArray(filter.rules) ? filter.rules.length : 0;
  return queryCount + rulesCount;
}

export function cloneItemFilter(filter = {}) {
  return {
    query: typeof filter.query === "string" ? filter.query : "",
    rules: Array.isArray(filter.rules)
      ? filter.rules.map((rule) => ({
          ...rule,
          values: Array.isArray(rule.values) ? [...rule.values] : rule.values
        }))
      : []
  };
}
