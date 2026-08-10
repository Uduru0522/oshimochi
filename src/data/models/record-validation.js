export function requireRecord(value, entityName = "Record") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${entityName} must be an object.`);
  }

  return value;
}

export function requireString(
  value,
  fieldName,
  { allowEmpty = true, canonical = false } = {}
) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new TypeError(
      `${fieldName} must be ${allowEmpty ? "a string" : "a non-empty string"}.`
    );
  }

  if (canonical && value.trim() !== value) {
    throw new TypeError(`${fieldName} cannot have leading or trailing whitespace.`);
  }

  return value;
}

export function requireBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${fieldName} must be a boolean.`);
  }

  return value;
}

export function requireTimestamp(value, fieldName) {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new TypeError(`${fieldName} must be an ISO 8601 UTC timestamp.`);
  }

  return value;
}

export function requireJsonValue(value, fieldName) {
  const isPrimitive =
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));

  if (isPrimitive) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => requireJsonValue(entry, fieldName));
  }

  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, requireJsonValue(entry, fieldName)])
    );
  }

  throw new TypeError(`${fieldName} must be JSON-compatible.`);
}

export function requirePositiveInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }

  return value;
}

export function areJsonValuesEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => areJsonValuesEqual(entry, right[index]));
  }

  const leftIsObject = left && Object.getPrototypeOf(left) === Object.prototype;
  const rightIsObject = right && Object.getPrototypeOf(right) === Object.prototype;

  if (!leftIsObject || !rightIsObject) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return leftKeys.length === rightKeys.length && leftKeys.every(
    (key) => Object.hasOwn(right, key) && areJsonValuesEqual(left[key], right[key])
  );
}
