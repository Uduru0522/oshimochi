export const CUSTOM_FIELD_TYPES = Object.freeze([
  Object.freeze({ value: "text", label: "Text" }),
  Object.freeze({ value: "long_text", label: "Long text" }),
  Object.freeze({ value: "number", label: "Number" }),
  Object.freeze({ value: "date", label: "Date" }),
  Object.freeze({ value: "boolean", label: "Two-option toggle" }),
  Object.freeze({ value: "url", label: "Web address" }),
  Object.freeze({ value: "select", label: "Selection list" })
]);

const CUSTOM_FIELD_TYPE_VALUES = new Set(CUSTOM_FIELD_TYPES.map(({ value }) => value));

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function requireOptionLabels(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    throw new TypeError("Selection options must be an array.");
  }

  const labels = value.map((label) => requireNonEmptyString(label, "Selection option"));
  const normalizedLabels = labels.map(normalizeLabel);

  if (!allowEmpty && labels.length === 0) {
    throw new TypeError("A selection field requires at least one option.");
  }

  if (new Set(normalizedLabels).size !== labels.length) {
    throw new TypeError("Selection option labels must be unique.");
  }

  return labels;
}

export function assertCustomFieldType(value) {
  const dataType = requireNonEmptyString(value, "dataType");

  if (!CUSTOM_FIELD_TYPE_VALUES.has(dataType)) {
    throw new TypeError(`Unsupported custom field type: ${dataType}.`);
  }

  return dataType;
}

export function createUniqueFieldKey(displayName, existingKeys) {
  const baseKey = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "field_$&") || "field";
  let candidate = baseKey;
  let suffix = 2;

  while (existingKeys.has(candidate)) {
    candidate = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  existingKeys.add(candidate);
  return candidate;
}

export function createSelectOptions(labels, generateId) {
  return {
    choices: requireOptionLabels(labels).map((label) => ({
      id: generateId(),
      label
    }))
  };
}

export function createBooleanOptions(falseLabel, trueLabel) {
  const options = {
    falseLabel: requireNonEmptyString(falseLabel, "Left option label"),
    trueLabel: requireNonEmptyString(trueLabel, "Right option label")
  };

  if (normalizeLabel(options.falseLabel) === normalizeLabel(options.trueLabel)) {
    throw new TypeError("The two toggle option labels must be different.");
  }

  return options;
}

export function appendSelectOptions(currentOptions, newLabels, generateId) {
  const existingChoices = currentOptions?.choices;

  if (!Array.isArray(existingChoices)) {
    throw new TypeError("The existing selection field has invalid options.");
  }

  const additions = requireOptionLabels(newLabels, { allowEmpty: true });
  const usedLabels = new Set(existingChoices.map(({ label }) => normalizeLabel(label)));

  additions.forEach((label) => {
    if (usedLabels.has(normalizeLabel(label))) {
      throw new TypeError(`Selection option already exists: ${label}.`);
    }

    usedLabels.add(normalizeLabel(label));
  });

  return {
    choices: [
      ...existingChoices,
      ...additions.map((label) => ({ id: generateId(), label }))
    ]
  };
}

export function updateSelectOptions(
  currentOptions,
  updatedChoices,
  newLabels,
  generateId
) {
  const existingChoices = currentOptions?.choices;

  if (!Array.isArray(existingChoices) || !Array.isArray(updatedChoices)) {
    throw new TypeError("The existing selection field has invalid options.");
  }

  const existingIds = new Set(existingChoices.map(({ id }) => id));
  const updatedIds = updatedChoices.map(({ id }) => id);

  if (
    updatedChoices.length !== existingChoices.length ||
    new Set(updatedIds).size !== updatedIds.length ||
    updatedIds.some((id) => !existingIds.has(id))
  ) {
    throw new TypeError("Existing selection options cannot be removed or replaced.");
  }

  const labelsById = new Map(updatedChoices.map(({ id, label }) => [
    id,
    requireNonEmptyString(label, "Selection option")
  ]));
  const additions = requireOptionLabels(newLabels ?? [], { allowEmpty: true });
  const nextChoices = existingChoices.map(({ id }) => ({ id, label: labelsById.get(id) }));
  const allLabels = [...nextChoices.map(({ label }) => label), ...additions];
  const normalizedLabels = allLabels.map(normalizeLabel);

  if (new Set(normalizedLabels).size !== normalizedLabels.length) {
    throw new TypeError("Selection option labels must be unique.");
  }

  return {
    choices: [
      ...nextChoices,
      ...additions.map((label) => ({ id: generateId(), label }))
    ]
  };
}
