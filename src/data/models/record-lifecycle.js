import {
  requireBoolean,
  requireTimestamp
} from "./record-validation.js";

export const RECORD_SCOPES = Object.freeze({
  active: "active",
  all: "all",
  deleted: "deleted"
});

const VALID_RECORD_SCOPES = new Set(Object.values(RECORD_SCOPES));

export function requireRecordScope(scope = RECORD_SCOPES.active) {
  if (!VALID_RECORD_SCOPES.has(scope)) {
    throw new TypeError(`Unsupported record scope: ${scope}.`);
  }

  return scope;
}

export function filterRecordsByScope(records, scope = RECORD_SCOPES.active) {
  const requestedScope = requireRecordScope(scope);

  if (requestedScope === RECORD_SCOPES.all) {
    return records;
  }

  const isDeleted = requestedScope === RECORD_SCOPES.deleted;
  return records.filter((record) => record.isDeleted === isDeleted);
}

export function parseRecordTimestamps(input) {
  const createdAt = requireTimestamp(input.createdAt, "createdAt");
  const updatedAt = requireTimestamp(input.updatedAt, "updatedAt");

  if (updatedAt < createdAt) {
    throw new TypeError("updatedAt cannot be earlier than createdAt.");
  }

  return { createdAt, updatedAt };
}

export function parseDeletionLifecycle(input, entityName = "Record") {
  const { createdAt, updatedAt } = parseRecordTimestamps(input);
  const isDeleted = requireBoolean(input.isDeleted, "isDeleted");

  if (isDeleted && input.deletedAt === null) {
    throw new TypeError(`deletedAt is required when ${entityName.toLowerCase()} is deleted.`);
  }

  if (!isDeleted && input.deletedAt !== null) {
    throw new TypeError("deletedAt must be null when isDeleted is false.");
  }

  const deletedAt = isDeleted ? requireTimestamp(input.deletedAt, "deletedAt") : null;

  if (deletedAt && (deletedAt < createdAt || deletedAt > updatedAt)) {
    throw new TypeError("deletedAt must be between createdAt and updatedAt.");
  }

  return { createdAt, deletedAt, isDeleted, updatedAt };
}

export function createDeletionLifecycle(
  input,
  { now = () => new Date().toISOString(), entityName = "Record" } = {}
) {
  const timestamp = now();
  const isDeleted = input.isDeleted ?? false;
  const updatedAt = input.updatedAt ?? timestamp;

  return parseDeletionLifecycle(
    {
      createdAt: input.createdAt ?? timestamp,
      deletedAt: isDeleted ? (input.deletedAt ?? updatedAt) : null,
      isDeleted,
      updatedAt
    },
    entityName
  );
}

export function createDeletionTransition(
  record,
  isDeleted,
  { now = () => new Date().toISOString() } = {}
) {
  requireBoolean(isDeleted, "isDeleted");
  const timestamp = now();

  return {
    ...record,
    deletedAt: isDeleted ? timestamp : null,
    isDeleted,
    updatedAt: timestamp
  };
}
