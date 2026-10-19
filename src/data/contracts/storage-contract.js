export const STORAGE_ERROR_CODES = Object.freeze({
  conflict: "conflict",
  initializationFailed: "initialization-failed",
  invalidAdapter: "invalid-adapter",
  invalidData: "invalid-data",
  notInitialized: "not-initialized",
  operationFailed: "operation-failed",
  unavailable: "unavailable",
  upgradeBlocked: "upgrade-blocked"
});

const REQUIRED_STORAGE_METHODS = Object.freeze([
  "initialize",
  "listGoodsTypes",
  "listDashboardCards",
  "replaceDashboardCards",
  "createGoodsType",
  "createItem",
  "updateItemContent",
  "updateItemLifecycle",
  "getAsset",
  "listFieldDefinitions",
  "saveFieldDefinitions",
  "listItems",
  "purgeItem",
  "readDataCatalog",
  "replaceDataCatalog",
  "resetData",
  "close"
]);

export class StorageError extends Error {
  constructor(message, { cause, code = STORAGE_ERROR_CODES.operationFailed } = {}) {
    super(message, { cause });
    this.name = "StorageError";
    this.code = code;
  }
}

export function assertStorageAdapter(adapter) {
  const missingMethods = REQUIRED_STORAGE_METHODS.filter(
    (methodName) => typeof adapter?.[methodName] !== "function"
  );

  if (missingMethods.length > 0) {
    throw new StorageError(
      `Storage adapter is missing required methods: ${missingMethods.join(", ")}`,
      { code: STORAGE_ERROR_CODES.invalidAdapter }
    );
  }

  return adapter;
}
