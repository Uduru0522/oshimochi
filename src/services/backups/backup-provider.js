export const BACKUP_PROVIDER_STATUS = Object.freeze({
  connected: "connected",
  connecting: "connecting",
  disconnected: "disconnected",
  error: "error",
  loading: "loading",
  unavailable: "unavailable"
});

const REQUIRED_METHODS = [
  "clearConfiguration",
  "connect",
  "configure",
  "disconnect",
  "downloadSnapshot",
  "getConfiguration",
  "getState",
  "isConfigured",
  "listSnapshots",
  "prepare",
  "selectDestination",
  "subscribe",
  "uploadSnapshot"
];

export function assertBackupProvider(provider) {
  if (
    !provider ||
    typeof provider.id !== "string" ||
    provider.id.trim() === "" ||
    typeof provider.name !== "string" ||
    provider.name.trim() === ""
  ) {
    throw new TypeError("A backup provider requires a stable ID and name.");
  }

  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== "function") {
      throw new TypeError(`Backup provider ${provider.id} is missing ${method}().`);
    }
  }

  return provider;
}

export function createBackupProviderState({
  account = null,
  error = null,
  lastBackup = null,
  status
}) {
  if (!Object.values(BACKUP_PROVIDER_STATUS).includes(status)) {
    throw new TypeError(`Unsupported backup provider status: ${String(status)}.`);
  }

  return Object.freeze({
    account: account ? Object.freeze({ ...account }) : null,
    error,
    lastBackup: lastBackup ? Object.freeze({ ...lastBackup }) : null,
    status
  });
}
