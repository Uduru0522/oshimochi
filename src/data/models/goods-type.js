import {
  createDeletionLifecycle,
  parseDeletionLifecycle
} from "./record-lifecycle.js";
import {
  requireRecord,
  requireString
} from "./record-validation.js";

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

export function parseGoodsTypeRecord(value) {
  const input = requireRecord(value, "Goods type");
  const lifecycle = parseDeletionLifecycle(input, "Goods type");

  return {
    id: requireString(input.id, "id", { allowEmpty: false, canonical: true }),
    displayName: requireString(input.displayName, "displayName", {
      allowEmpty: false,
      canonical: true
    }),
    description: requireString(input.description, "description"),
    ...lifecycle
  };
}

export function createGoodsTypeRecord(input, { now = () => new Date().toISOString() } = {}) {
  return parseGoodsTypeRecord({
    id: requireNonEmptyString(input.id, "id"),
    displayName: requireNonEmptyString(input.displayName, "displayName"),
    description: requireString(input.description ?? "", "description"),
    ...createDeletionLifecycle(input, { entityName: "Goods type", now })
  });
}
