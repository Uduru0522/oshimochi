import {
  BACKUP_PROVIDER_STATUS,
  createBackupProviderState
} from "./backup-provider.js";
import {
  BACKUP_ARCHIVE_MIME_TYPE,
  createGzipBackupArchive,
  readBackupArchiveText
} from "../backup-archive.js";
import { pickGoogleDriveFolder } from "./google-picker.js";

const APPLICATION_ID = "oshimochi";
const DRIVE_API_ROOT = "https://www.googleapis.com/drive/v3";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const SNAPSHOT_KIND = "snapshot";
const UPLOAD_API_ROOT = "https://www.googleapis.com/upload/drive/v3";

export class GoogleDriveBackupError extends Error {
  constructor(message, { cause, code = "request-failed" } = {}) {
    super(message, { cause });
    this.name = "GoogleDriveBackupError";
    this.code = code;
  }
}

function requireBackup(backup) {
  if (
    typeof backup?.fileName !== "string" ||
    typeof backup?.mimeType !== "string" ||
    typeof backup?.summary?.createdAt !== "string" ||
    typeof backup?.summary?.exportFormatVersion !== "number" ||
    typeof backup?.summary?.snapshotId !== "string" ||
    typeof backup?.text !== "string"
  ) {
    throw new TypeError("A serialized backup is required for cloud upload.");
  }

  return backup;
}

function getAccount(user) {
  if (!user) {
    return null;
  }

  return {
    displayName: user.displayName || "",
    email: user.emailAddress || "",
    uid: user.permissionId || user.emailAddress || "google-drive-user"
  };
}

function normalizeRemoteSnapshot(file) {
  const properties = file.appProperties ?? {};

  return Object.freeze({
    createdAt: properties.createdAt || file.createdTime || file.modifiedTime,
    fileName: properties.fileName || file.name,
    id: file.id,
    size: Number(file.size),
    snapshotId: properties.snapshotId || file.id,
    updatedAt: file.modifiedTime || file.createdTime
  });
}

function compareNewestFirst(left, right) {
  return String(right.createdAt).localeCompare(String(left.createdAt));
}

function createUrl(root, path, parameters = {}) {
  const url = new URL(`${root}${path}`);

  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

function createMultipartUpload(metadata, content, mimeType) {
  const boundary = `oshimochi-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const body = new Blob([
    `--${boundary}\r\n`,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`
  ]);

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`
  };
}

async function readErrorResponse(response) {
  try {
    const value = await response.json();
    return value?.error?.message || value?.error_description || response.statusText;
  } catch {
    return response.statusText;
  }
}

export function createGoogleDriveBackupProvider({
  archiveBackup = createGzipBackupArchive,
  configuration,
  fetchImpl = globalThis.fetch,
  loadIdentity,
  loadPicker,
  maxSnapshots = 3,
  now = () => Date.now(),
  readArchiveText = readBackupArchiveText
}) {
  if (
    !configuration ||
    typeof configuration.clear !== "function" ||
    typeof configuration.getApiKey !== "function" ||
    typeof configuration.getAppId !== "function" ||
    typeof configuration.getClientId !== "function" ||
    typeof configuration.getDestination !== "function" ||
    typeof configuration.setCredentials !== "function" ||
    typeof configuration.setDestination !== "function"
  ) {
    throw new TypeError("Google Drive backup requires local Google configuration.");
  }

  if (typeof fetchImpl !== "function") {
    throw new TypeError("Google Drive backup requires fetch.");
  }

  if (typeof loadIdentity !== "function") {
    throw new TypeError("Google Drive backup requires Google Identity Services.");
  }

  if (typeof loadPicker !== "function") {
    throw new TypeError("Google Drive backup requires Google Picker.");
  }

  if (typeof archiveBackup !== "function" || typeof readArchiveText !== "function") {
    throw new TypeError("Google Drive backup requires archive support.");
  }

  if (!Number.isSafeInteger(maxSnapshots) || maxSnapshots < 1) {
    throw new TypeError("Google Drive backup retention must be a positive integer.");
  }

  const listeners = new Set();
  let accessToken = "";
  let account = null;
  let authorizationRequest = null;
  let expiresAt = 0;
  let oauth2 = null;
  let preparationPromise = null;
  let tokenClient = null;

  function isConfigured() {
    return Boolean(
      configuration.getApiKey() &&
      configuration.getAppId() &&
      configuration.getClientId()
    );
  }

  let state = createBackupProviderState({
    status: isConfigured()
      ? BACKUP_PROVIDER_STATUS.disconnected
      : BACKUP_PROVIDER_STATUS.unavailable
  });

  function publish(nextState) {
    state = createBackupProviderState(nextState);
    listeners.forEach((listener) => listener(state));
  }

  function publishError(error) {
    const normalizedError = error instanceof GoogleDriveBackupError
      ? error
      : new GoogleDriveBackupError("Google Drive backup is unavailable.", {
          cause: error,
          code: error?.code || "request-failed"
        });

    publish({
      error: normalizedError,
      status: BACKUP_PROVIDER_STATUS.error
    });
    return normalizedError;
  }

  function revokeCurrentToken() {
    if (accessToken && oauth2?.revoke) {
      try {
        oauth2.revoke(accessToken, () => {});
      } catch {
        // Local disconnection must still complete when revocation is unavailable.
      }
    }
  }

  function clearSession({ status } = {}) {
    accessToken = "";
    account = null;
    authorizationRequest = null;
    expiresAt = 0;
    publish({
      status: status ?? (
        isConfigured()
          ? BACKUP_PROVIDER_STATUS.disconnected
          : BACKUP_PROVIDER_STATUS.unavailable
      )
    });
  }

  function assertConfigured() {
    const apiKey = configuration.getApiKey();
    const appId = configuration.getAppId();
    const clientId = configuration.getClientId();

    if (!apiKey || !appId || !clientId) {
      throw new GoogleDriveBackupError(
        "Configure Google Drive before connecting.",
        { code: "not-configured" }
      );
    }

    return { apiKey, appId, clientId };
  }

  function handleTokenResponse(response) {
    const pending = authorizationRequest;

    authorizationRequest = null;
    if (!pending) {
      return;
    }

    if (response?.error || !response?.access_token) {
      pending.reject(
        new GoogleDriveBackupError(
          response?.error_description || "Google authorization was not completed.",
          { code: response?.error || "authorization-failed" }
        )
      );
      return;
    }

    if (!oauth2.hasGrantedAllScopes(response, DRIVE_FILE_SCOPE)) {
      pending.reject(
        new GoogleDriveBackupError(
          "Google Drive access was not granted.",
          { code: "scope-not-granted" }
        )
      );
      return;
    }

    accessToken = response.access_token;
    expiresAt = now() + (Number(response.expires_in) || 3600) * 1000;
    pending.resolve();
  }

  function handleAuthorizationError(error) {
    const pending = authorizationRequest;

    authorizationRequest = null;
    if (pending) {
      pending.reject(
        new GoogleDriveBackupError(
          "Google authorization was cancelled or blocked.",
          { cause: error, code: error?.type || "authorization-failed" }
        )
      );
    }
  }

  function prepare() {
    let credentials;

    try {
      credentials = assertConfigured();
    } catch (error) {
      return Promise.reject(error);
    }

    if (preparationPromise) {
      return preparationPromise;
    }

    publish({ status: BACKUP_PROVIDER_STATUS.loading });
    preparationPromise = Promise.resolve(loadIdentity())
      .then((loadedOAuth2) => {
        if (
          typeof loadedOAuth2?.hasGrantedAllScopes !== "function" ||
          typeof loadedOAuth2?.initTokenClient !== "function" ||
          typeof loadedOAuth2?.revoke !== "function"
        ) {
          throw new GoogleDriveBackupError(
            "Google Identity Services is unavailable.",
            { code: "sdk-unavailable" }
          );
        }

        oauth2 = loadedOAuth2;
        tokenClient = oauth2.initTokenClient({
          callback: handleTokenResponse,
          client_id: credentials.clientId,
          error_callback: handleAuthorizationError,
          scope: DRIVE_FILE_SCOPE
        });
        publish({ status: BACKUP_PROVIDER_STATUS.disconnected });
      })
      .catch((error) => {
        preparationPromise = null;
        oauth2 = null;
        tokenClient = null;
        throw publishError(error);
      });

    return preparationPromise;
  }

  async function requestDrive(path, {
    body,
    headers = {},
    method = "GET",
    parameters,
    root = DRIVE_API_ROOT
  } = {}) {
    if (!accessToken || expiresAt <= now() + 30_000) {
      clearSession();
      throw new GoogleDriveBackupError(
        "The Google Drive connection expired. Connect again.",
        { code: "not-connected" }
      );
    }

    let response;

    try {
      response = await fetchImpl(createUrl(root, path, parameters), {
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...headers
        },
        method
      });
    } catch (error) {
      throw new GoogleDriveBackupError("Google Drive could not be reached.", {
        cause: error,
        code: "network-failed"
      });
    }

    if (!response.ok) {
      const message = await readErrorResponse(response);

      if (response.status === 401) {
        clearSession();
      }

      throw new GoogleDriveBackupError(
        message || `Google Drive request failed with ${response.status}.`,
        { code: `drive-${response.status}` }
      );
    }

    return response;
  }

  async function requestJson(path, options) {
    const response = await requestDrive(path, options);
    return response.json();
  }

  async function readAccount() {
    const result = await requestJson("/about", {
      parameters: { fields: "user(displayName,emailAddress,permissionId)" }
    });
    return result.user ?? null;
  }

  async function connect() {
    await prepare();

    if (accessToken && expiresAt > now() + 30_000 && account) {
      return state;
    }

    if (authorizationRequest) {
      return authorizationRequest.promise;
    }

    publish({ status: BACKUP_PROVIDER_STATUS.connecting });
    let resolveAuthorization;
    let rejectAuthorization;
    const promise = new Promise((resolve, reject) => {
      resolveAuthorization = resolve;
      rejectAuthorization = reject;
    });

    authorizationRequest = {
      promise,
      reject: rejectAuthorization,
      resolve: resolveAuthorization
    };

    try {
      tokenClient.requestAccessToken({ prompt: "" });
      await promise;
      account = await readAccount();
      publish({
        account: getAccount(account),
        status: BACKUP_PROVIDER_STATUS.connected
      });
      return state;
    } catch (error) {
      revokeCurrentToken();
      clearSession();
      throw error instanceof GoogleDriveBackupError
        ? error
        : new GoogleDriveBackupError("Google Drive could not connect.", {
            cause: error,
            code: error?.code || "connection-failed"
          });
    }
  }

  async function disconnect() {
    revokeCurrentToken();
    clearSession();
  }

  async function requireConnection() {
    if (!accessToken || expiresAt <= now() + 30_000 || !account) {
      clearSession();
      throw new GoogleDriveBackupError(
        "Connect Google Drive before using cloud backups.",
        { code: "not-connected" }
      );
    }
  }

  async function requireBackupFolder() {
    await requireConnection();
    const destination = configuration.getDestination();

    if (!destination) {
      throw new GoogleDriveBackupError(
        "Choose a Google Drive folder before using cloud backups.",
        { code: "destination-required" }
      );
    }

    return destination.id;
  }

  async function selectDestination({ locale, origin, title } = {}) {
    await requireConnection();
    const { apiKey, appId } = assertConfigured();
    let picker;

    try {
      picker = await loadPicker();
    } catch (error) {
      throw new GoogleDriveBackupError("Google Picker could not be loaded.", {
        cause: error,
        code: "picker-unavailable"
      });
    }

    const selected = await pickGoogleDriveFolder(picker, {
      accessToken,
      apiKey,
      appId,
      locale,
      origin,
      title
    });

    if (!selected) {
      return null;
    }

    const folder = await requestJson(
      `/files/${encodeURIComponent(selected.id)}`,
      { parameters: { fields: "id,name,mimeType,trashed" } }
    );

    if (
      folder.trashed ||
      folder.mimeType !== FOLDER_MIME_TYPE ||
      typeof folder.id !== "string" ||
      typeof folder.name !== "string"
    ) {
      throw new GoogleDriveBackupError(
        "The selected Drive location is not an available folder.",
        { code: "invalid-destination" }
      );
    }

    const destination = configuration.setDestination({
      id: folder.id,
      name: folder.name
    });

    publish({
      account: getAccount(account),
      lastBackup: state.lastBackup,
      status: BACKUP_PROVIDER_STATUS.connected
    });
    return destination;
  }

  async function readSnapshots() {
    const parentId = await requireBackupFolder();
    const query = [
      `'${parentId}' in parents`,
      "trashed = false",
      `mimeType = '${BACKUP_ARCHIVE_MIME_TYPE}'`,
      `appProperties has { key='application' and value='${APPLICATION_ID}' }`,
      `appProperties has { key='kind' and value='${SNAPSHOT_KIND}' }`
    ].join(" and ");
    const files = [];
    let pageToken = "";

    do {
      const result = await requestJson("/files", {
        parameters: {
          fields: "nextPageToken,files(id,name,size,createdTime,modifiedTime,parents,appProperties,mimeType)",
          orderBy: "createdTime desc",
          pageSize: 100,
          pageToken,
          q: query,
          spaces: "drive"
        }
      });

      files.push(...(result.files ?? []));
      pageToken = result.nextPageToken ?? "";
    } while (pageToken);

    return files.map(normalizeRemoteSnapshot).sort(compareNewestFirst);
  }

  async function listSnapshots() {
    return readSnapshots();
  }

  async function enforceRetention() {
    const snapshots = await readSnapshots();
    const expiredSnapshots = snapshots.slice(maxSnapshots);
    const results = await Promise.allSettled(
      expiredSnapshots.map(({ id }) => requestDrive(
        `/files/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      ))
    );

    return {
      failed: results.filter(({ status }) => status === "rejected").length,
      removed: results.filter(({ status }) => status === "fulfilled").length
    };
  }

  async function uploadSnapshot(value) {
    const backup = requireBackup(value);
    const parentId = await requireBackupFolder();
    const archive = await archiveBackup(backup);
    const metadata = {
      appProperties: {
        application: APPLICATION_ID,
        createdAt: backup.summary.createdAt,
        exportFormatVersion: String(backup.summary.exportFormatVersion),
        fileName: archive.fileName,
        kind: SNAPSHOT_KIND,
        snapshotId: backup.summary.snapshotId
      },
      mimeType: archive.mimeType,
      name: archive.fileName,
      parents: [parentId]
    };
    const upload = createMultipartUpload(
      metadata,
      archive.blob,
      archive.mimeType
    );
    const result = await requestJson("/files", {
      body: upload.body,
      headers: { "Content-Type": upload.contentType },
      method: "POST",
      parameters: {
        fields: "id,name,size,createdTime,modifiedTime,parents,appProperties,mimeType",
        uploadType: "multipart"
      },
      root: UPLOAD_API_ROOT
    });
    const snapshot = normalizeRemoteSnapshot(result);
    let retention = { failed: 0, removed: 0 };

    try {
      retention = await enforceRetention();
    } catch {
      retention = { failed: 1, removed: 0 };
    }

    publish({
      account: getAccount(account),
      lastBackup: snapshot,
      status: BACKUP_PROVIDER_STATUS.connected
    });
    return Object.freeze({ retention: Object.freeze(retention), snapshot });
  }

  async function downloadSnapshot(snapshotId) {
    if (typeof snapshotId !== "string" || snapshotId.trim() === "") {
      throw new TypeError("A Google Drive snapshot ID is required.");
    }

    const parentId = await requireBackupFolder();
    const path = `/files/${encodeURIComponent(snapshotId)}`;
    const file = await requestJson(path, {
      parameters: {
        fields: "id,mimeType,parents,appProperties"
      }
    });

    if (
      file.mimeType !== BACKUP_ARCHIVE_MIME_TYPE ||
      !file.parents?.includes(parentId) ||
      file.appProperties?.application !== APPLICATION_ID ||
      file.appProperties?.kind !== SNAPSHOT_KIND
    ) {
      throw new GoogleDriveBackupError(
        "The selected file is not an Oshimochi backup.",
        { code: "invalid-snapshot" }
      );
    }

    const response = await requestDrive(path, {
      parameters: { alt: "media" }
    });
    return readArchiveText(await response.blob());
  }

  async function configure(credentials) {
    configuration.setCredentials(credentials);
    revokeCurrentToken();
    oauth2 = null;
    preparationPromise = null;
    tokenClient = null;
    clearSession({ status: BACKUP_PROVIDER_STATUS.disconnected });
  }

  async function clearConfiguration() {
    revokeCurrentToken();
    configuration.clear();
    oauth2 = null;
    preparationPromise = null;
    tokenClient = null;
    clearSession({ status: BACKUP_PROVIDER_STATUS.unavailable });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Backup provider subscriptions require a listener.");
    }

    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  }

  function destroy() {
    accessToken = "";
    account = null;
    authorizationRequest?.reject(
      new GoogleDriveBackupError("Google authorization was cancelled.", {
        code: "cancelled"
      })
    );
    authorizationRequest = null;
    expiresAt = 0;
    oauth2 = null;
    preparationPromise = null;
    tokenClient = null;
    listeners.clear();
    state = createBackupProviderState({
      status: isConfigured()
        ? BACKUP_PROVIDER_STATUS.disconnected
        : BACKUP_PROVIDER_STATUS.unavailable
    });
  }

  return Object.freeze({
    clearConfiguration,
    configure,
    connect,
    destroy,
    disconnect,
    downloadSnapshot,
    getConfiguration: () => Object.freeze({
      apiKey: configuration.getApiKey(),
      appId: configuration.getAppId(),
      clientId: configuration.getClientId(),
      destination: configuration.getDestination()
    }),
    getState: () => state,
    id: "google-drive",
    isConfigured,
    listSnapshots,
    name: "Google Drive",
    prepare,
    selectDestination,
    setupUrl: "https://console.cloud.google.com/apis/credentials",
    subscribe,
    uploadSnapshot
  });
}
