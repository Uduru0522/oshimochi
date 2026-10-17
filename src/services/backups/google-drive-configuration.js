import { APP_CONFIG } from "../../app/config.js";
import { createStorage } from "../storage.js";

const CLIENT_ID_SUFFIX = ".apps.googleusercontent.com";
const CLIENT_ID_PATTERN = /^[a-z0-9._-]+\.apps\.googleusercontent\.com$/i;
const API_KEY_PATTERN = /^[a-z0-9_-]{20,512}$/i;
const APP_ID_PATTERN = /^\d{6,30}$/;
const DESTINATION_ID_PATTERN = /^[a-z0-9_-]{1,256}$/i;

export function normalizeGoogleOAuthClientId(value, { allowEmpty = false } = {}) {
  const clientId = typeof value === "string" ? value.trim() : "";

  if (allowEmpty && clientId === "") {
    return "";
  }

  if (
    clientId.length > 512 ||
    !clientId.toLowerCase().endsWith(CLIENT_ID_SUFFIX) ||
    !CLIENT_ID_PATTERN.test(clientId)
  ) {
    throw new TypeError("Enter a valid Google OAuth web client ID.");
  }

  return clientId;
}

export function normalizeGoogleApiKey(value, { allowEmpty = false } = {}) {
  const apiKey = typeof value === "string" ? value.trim() : "";

  if (allowEmpty && apiKey === "") {
    return "";
  }

  if (!API_KEY_PATTERN.test(apiKey)) {
    throw new TypeError("Enter a valid Google API key.");
  }

  return apiKey;
}

export function normalizeGoogleCloudProjectNumber(
  value,
  { allowEmpty = false } = {}
) {
  const appId = typeof value === "string" ? value.trim() : "";

  if (allowEmpty && appId === "") {
    return "";
  }

  if (!APP_ID_PATTERN.test(appId)) {
    throw new TypeError("Enter a valid Google Cloud project number.");
  }

  return appId;
}

export function normalizeGoogleDriveDestination(value, { allowEmpty = false } = {}) {
  if (allowEmpty && (value === null || value === undefined || value === "")) {
    return null;
  }

  const id = typeof value?.id === "string" ? value.id.trim() : "";
  const name = typeof value?.name === "string" ? value.name.trim() : "";

  if (
    !DESTINATION_ID_PATTERN.test(id) ||
    name === "" ||
    name.length > 512
  ) {
    throw new TypeError("Choose a valid Google Drive folder.");
  }

  return Object.freeze({ id, name });
}

export function createGoogleDriveConfiguration({
  apiKeyStorageKey = APP_CONFIG.backups.googleDrive.apiKeyStorageKey,
  appIdStorageKey = APP_CONFIG.backups.googleDrive.appIdStorageKey,
  destinationStorageKey = APP_CONFIG.backups.googleDrive.destinationStorageKey,
  storageOverride,
  clientIdStorageKey = APP_CONFIG.backups.googleDrive.clientIdStorageKey,
  storageNamespace = APP_CONFIG.backups.googleDrive.storageNamespace
} = {}) {
  const storage = storageOverride ?? createStorage(storageNamespace);
  let apiKey = "";
  let appId = "";
  let clientId = "";
  let destination = null;

  try {
    apiKey = normalizeGoogleApiKey(storage.get(apiKeyStorageKey, ""), {
      allowEmpty: true
    });
  } catch {
    storage.remove(apiKeyStorageKey);
  }

  try {
    appId = normalizeGoogleCloudProjectNumber(storage.get(appIdStorageKey, ""), {
      allowEmpty: true
    });
  } catch {
    storage.remove(appIdStorageKey);
  }

  try {
    clientId = normalizeGoogleOAuthClientId(storage.get(clientIdStorageKey, ""), {
      allowEmpty: true
    });
  } catch {
    storage.remove(clientIdStorageKey);
  }

  try {
    const serializedDestination = storage.get(destinationStorageKey, "");

    destination = normalizeGoogleDriveDestination(
      serializedDestination ? JSON.parse(serializedDestination) : null,
      { allowEmpty: true }
    );
  } catch {
    storage.remove(destinationStorageKey);
  }

  function clearDestination() {
    destination = null;
    storage.remove(destinationStorageKey);
  }

  function setCredentials(value) {
    const nextCredentials = {
      apiKey: normalizeGoogleApiKey(value?.apiKey),
      appId: normalizeGoogleCloudProjectNumber(value?.appId),
      clientId: normalizeGoogleOAuthClientId(value?.clientId)
    };
    const didChange = apiKey !== nextCredentials.apiKey ||
      appId !== nextCredentials.appId ||
      clientId !== nextCredentials.clientId;

    apiKey = nextCredentials.apiKey;
    appId = nextCredentials.appId;
    clientId = nextCredentials.clientId;
    storage.set(apiKeyStorageKey, apiKey);
    storage.set(appIdStorageKey, appId);
    storage.set(clientIdStorageKey, clientId);

    if (didChange) {
      clearDestination();
    }

    return Object.freeze({ ...nextCredentials });
  }

  function setDestination(value) {
    destination = normalizeGoogleDriveDestination(value);
    storage.set(destinationStorageKey, JSON.stringify(destination));
    return destination;
  }

  function clear() {
    apiKey = "";
    appId = "";
    clientId = "";
    clearDestination();
    storage.remove(apiKeyStorageKey);
    storage.remove(appIdStorageKey);
    storage.remove(clientIdStorageKey);
  }

  return Object.freeze({
    clear,
    clearDestination,
    getApiKey: () => apiKey,
    getAppId: () => appId,
    getClientId: () => clientId,
    getDestination: () => destination,
    setCredentials,
    setDestination
  });
}
