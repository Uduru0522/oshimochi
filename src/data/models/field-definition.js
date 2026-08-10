import {
  createDeletionLifecycle,
  parseDeletionLifecycle
} from "./record-lifecycle.js";
import {
  requireBoolean,
  requireJsonValue,
  requireRecord,
  requireString
} from "./record-validation.js";

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const FIELD_DATA_TYPES = Object.freeze([
  "boolean",
  "date",
  "image",
  "long_text",
  "number",
  "select",
  "text",
  "url"
]);

export const DEFAULT_BOOLEAN_OPTIONS = Object.freeze({
  falseLabel: "No",
  trueLabel: "Yes"
});

function requireCanonicalString(value, fieldName, { allowEmpty = false } = {}) {
  return requireString(value, fieldName, {
    allowEmpty,
    canonical: true
  });
}

function requireNullableObject(value, fieldName) {
  if (value !== null && (!value || typeof value !== "object" || Array.isArray(value))) {
    throw new TypeError(`${fieldName} must be an object or null.`);
  }

  return requireJsonValue(value, fieldName);
}

function requireFieldOptions(dataType, value) {
  if (dataType === "boolean") {
    const options = value === null ? DEFAULT_BOOLEAN_OPTIONS : requireNullableObject(value, "options");
    const falseLabel = requireCanonicalString(options?.falseLabel, "false option label");
    const trueLabel = requireCanonicalString(options?.trueLabel, "true option label");

    if (
      falseLabel.replace(/\s+/g, " ").toLocaleLowerCase() ===
      trueLabel.replace(/\s+/g, " ").toLocaleLowerCase()
    ) {
      throw new TypeError("Boolean option labels must be different.");
    }

    return {
      falseLabel,
      trueLabel
    };
  }

  if (dataType !== "select") {
    if (value !== null) {
      throw new TypeError("options must be null for this field type.");
    }

    return null;
  }

  const options = requireNullableObject(value, "options");

  if (!options || !Array.isArray(options.choices) || options.choices.length === 0) {
    throw new TypeError("Selection fields require at least one option.");
  }

  const choices = options.choices.map((choice) => {
    const input = requireRecord(choice);

    return {
      id: requireCanonicalString(input.id, "option id"),
      label: requireCanonicalString(input.label, "option label")
    };
  });
  const normalizedLabels = choices.map(({ label }) =>
    label.replace(/\s+/g, " ").toLocaleLowerCase()
  );

  if (
    new Set(choices.map(({ id }) => id)).size !== choices.length ||
    new Set(normalizedLabels).size !== choices.length
  ) {
    throw new TypeError("Selection option IDs and labels must be unique.");
  }

  return { choices };
}

function requirePosition(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("position must be a non-negative safe integer.");
  }

  return value;
}

export function parseFieldDefinitionRecord(value) {
  const input = requireRecord(value, "Field definition");
  const key = requireCanonicalString(input.key, "key");
  const dataType = requireCanonicalString(input.dataType, "dataType");
  const lifecycle = parseDeletionLifecycle(input, "Field definition");

  if (!FIELD_KEY_PATTERN.test(key)) {
    throw new TypeError("key must use lowercase snake_case.");
  }

  if (!FIELD_DATA_TYPES.includes(dataType)) {
    throw new TypeError(`Unsupported field data type: ${dataType}.`);
  }

  return {
    id: requireCanonicalString(input.id, "id"),
    goodsTypeId: requireCanonicalString(input.goodsTypeId, "goodsTypeId"),
    key,
    displayName: requireCanonicalString(input.displayName, "displayName"),
    dataType,
    isRequired: requireBoolean(input.isRequired, "isRequired"),
    isBuiltIn: requireBoolean(input.isBuiltIn, "isBuiltIn"),
    position: requirePosition(input.position),
    defaultValue: requireJsonValue(input.defaultValue, "defaultValue"),
    options: requireFieldOptions(dataType, input.options),
    ...lifecycle
  };
}

export function createFieldDefinitionRecord(
  input,
  { now = () => new Date().toISOString() } = {}
) {
  return parseFieldDefinitionRecord({
    ...input,
    id: input.id?.trim(),
    goodsTypeId: input.goodsTypeId?.trim(),
    key: input.key?.trim(),
    displayName: input.displayName?.trim(),
    isRequired: input.isRequired ?? false,
    isBuiltIn: input.isBuiltIn ?? false,
    defaultValue: input.defaultValue ?? null,
    options: input.options ?? null,
    ...createDeletionLifecycle(input, { entityName: "Field definition", now })
  });
}
