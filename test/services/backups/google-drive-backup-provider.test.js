import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleDriveBackupError,
  createGoogleDriveBackupProvider
} from "../../../src/services/backups/google-drive-backup-provider.js";
import {
  createGzipBackupArchive
} from "../../../src/services/backup-archive.js";

const CLIENT_ID = "123456-example.apps.googleusercontent.com";
const API_KEY = "AIzaSyExample_0123456789012345678901234";
const APP_ID = "123456789012";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DESTINATION = Object.freeze({ id: "folder-1", name: "My backups" });
const OWNER = Object.freeze({
  displayName: "Backup Owner",
  emailAddress: "owner@example.com",
  permissionId: "owner-1"
});

function createConfiguration({
  apiKey: initialApiKey = API_KEY,
  appId: initialAppId = APP_ID,
  clientId: initialClientId = CLIENT_ID,
  destination: initialDestination = DESTINATION
} = {}) {
  let apiKey = initialApiKey;
  let appId = initialAppId;
  let clientId = initialClientId;
  let destination = initialDestination;

  return {
    clear() {
      apiKey = "";
      appId = "";
      clientId = "";
      destination = null;
    },
    getApiKey: () => apiKey,
    getAppId: () => appId,
    getClientId: () => clientId,
    getDestination: () => destination,
    setCredentials(value) {
      apiKey = value.apiKey;
      appId = value.appId;
      clientId = value.clientId;
    },
    setDestination(value) {
      destination = Object.freeze({ ...value });
      return destination;
    }
  };
}

function createFolderPicker(selection = DESTINATION) {
  let callback;

  class DocsView {
    setIncludeFolders() {
      return this;
    }

    setMimeTypes() {
      return this;
    }

    setSelectFolderEnabled() {
      return this;
    }
  }

  class PickerBuilder {
    addView() {
      return this;
    }

    build() {
      return {
        setVisible() {
          queueMicrotask(() => callback({
            action: "picked",
            docs: [selection]
          }));
        }
      };
    }

    setAppId() {
      return this;
    }

    setCallback(value) {
      callback = value;
      return this;
    }

    setDeveloperKey() {
      return this;
    }

    setMaxItems() {
      return this;
    }

    setOAuthToken() {
      return this;
    }
  }

  return {
    Action: { CANCEL: "cancel", PICKED: "picked" },
    DocsView,
    Document: { ID: "id", NAME: "name" },
    PickerBuilder,
    Response: { ACTION: "action", DOCUMENTS: "docs" },
    ViewId: { FOLDERS: "folders" }
  };
}

function createIdentity({ grantsScope = true } = {}) {
  const calls = {
    init: [],
    requests: [],
    revoked: []
  };
  let tokenConfiguration;
  const oauth2 = {
    calls,
    hasGrantedAllScopes(response, scope) {
      assert.equal(response.access_token, "access-token");
      assert.equal(scope, DRIVE_SCOPE);
      return grantsScope;
    },
    initTokenClient(configuration) {
      tokenConfiguration = configuration;
      calls.init.push(configuration);
      return {
        requestAccessToken(options) {
          calls.requests.push(options);
          queueMicrotask(() => configuration.callback({
            access_token: "access-token",
            expires_in: 3600,
            scope: DRIVE_SCOPE
          }));
        }
      };
    },
    revoke(token, callback) {
      calls.revoked.push(token);
      callback({ successful: true });
    }
  };

  return {
    oauth2,
    rejectPopup(error = { type: "popup_closed" }) {
      tokenConfiguration.error_callback(error);
    }
  };
}

function jsonResponse(value, { status = 200 } = {}) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

function createFetchQueue(steps) {
  const calls = [];

  async function fetchImpl(input, options = {}) {
    const url = new URL(String(input));
    const step = steps[calls.length];

    calls.push({ options, url });
    assert.ok(step, `Unexpected Drive request: ${options.method ?? "GET"} ${url}`);
    await step.assert?.({ options, url });
    return typeof step.response === "function"
      ? step.response({ options, url })
      : step.response;
  }

  return { calls, fetchImpl };
}

function accountStep() {
  return {
    assert({ options, url }) {
      assert.equal(url.pathname, "/drive/v3/about");
      assert.equal(options.headers.Authorization, "Bearer access-token");
    },
    response: jsonResponse({ user: OWNER })
  };
}

function createProvider({
  configuration = createConfiguration(),
  identity = createIdentity(),
  loadPicker = async () => createFolderPicker(),
  maxSnapshots = 3,
  steps = [accountStep()]
} = {}) {
  const drive = createFetchQueue(steps);
  const provider = createGoogleDriveBackupProvider({
    configuration,
    fetchImpl: drive.fetchImpl,
    loadIdentity: async () => identity.oauth2,
    loadPicker,
    maxSnapshots,
    now: () => 1_800_000_000_000
  });

  return { configuration, drive, identity, provider };
}

async function connect(provider) {
  await provider.prepare();
  await provider.connect();
}

function createBackup() {
  return {
    fileName: "wotagoods-backup.json",
    mimeType: "application/json",
    summary: {
      createdAt: "2026-10-17T12:00:00.000Z",
      exportFormatVersion: 1,
      snapshotId: "snapshot-new"
    },
    text: "{\"application\":\"wotagoods-manager\"}\n"
  };
}

function createRemoteFile({
  createdAt,
  fileName,
  id,
  mimeType = "application/gzip",
  parentId = "folder-1",
  snapshotId = id
}) {
  return {
    appProperties: {
      application: "wotagoods-manager",
      createdAt,
      fileName,
      kind: "snapshot",
      snapshotId
    },
    createdTime: createdAt,
    id,
    mimeType,
    modifiedTime: createdAt,
    name: fileName,
    parents: [parentId],
    size: "42"
  };
}

test("Google Drive backup stays unavailable without a client ID", async () => {
  let identityLoads = 0;
  const provider = createGoogleDriveBackupProvider({
    configuration: createConfiguration({ clientId: "" }),
    fetchImpl: async () => jsonResponse({}),
    loadIdentity: async () => {
      identityLoads += 1;
      return createIdentity().oauth2;
    },
    loadPicker: async () => createFolderPicker()
  });

  assert.equal(provider.getState().status, "unavailable");
  await assert.rejects(provider.prepare(), (error) => {
    assert.equal(error instanceof GoogleDriveBackupError, true);
    assert.equal(error.code, "not-configured");
    return true;
  });
  assert.equal(identityLoads, 0);
});

test("Google Drive backup prepares the narrow Drive file scope", async () => {
  const { identity, provider } = createProvider();

  await provider.prepare();

  assert.equal(identity.oauth2.calls.init.length, 1);
  assert.equal(identity.oauth2.calls.init[0].client_id, CLIENT_ID);
  assert.equal(identity.oauth2.calls.init[0].scope, DRIVE_SCOPE);
  assert.equal(provider.getState().status, "disconnected");
});

test("Google Drive backup connects the selected Drive account", async () => {
  const { identity, provider } = createProvider();

  await connect(provider);

  assert.equal(provider.getState().status, "connected");
  assert.deepEqual(provider.getState().account, {
    displayName: OWNER.displayName,
    email: OWNER.emailAddress,
    uid: OWNER.permissionId
  });
  assert.deepEqual(identity.oauth2.calls.requests, [{ prompt: "" }]);
});

test("Google Drive backup saves a folder selected through Google Picker", async () => {
  const configuration = createConfiguration({ destination: null });
  const { provider } = createProvider({
    configuration,
    loadPicker: async () => createFolderPicker({
      id: "chosen-folder",
      name: "Chosen in Picker"
    }),
    steps: [
      accountStep(),
      {
        assert({ url }) {
          assert.equal(url.pathname, "/drive/v3/files/chosen-folder");
          assert.equal(url.searchParams.get("fields"), "id,name,mimeType,trashed");
        },
        response: jsonResponse({
          id: "chosen-folder",
          mimeType: "application/vnd.google-apps.folder",
          name: "Chosen in Picker",
          trashed: false
        })
      }
    ]
  });

  await connect(provider);
  const destination = await provider.selectDestination();

  assert.deepEqual(destination, {
    id: "chosen-folder",
    name: "Chosen in Picker"
  });
  assert.deepEqual(configuration.getDestination(), destination);
});

test("Google Drive backup requires a selected destination", async () => {
  const { drive, provider } = createProvider({
    configuration: createConfiguration({ destination: null })
  });

  await connect(provider);
  await assert.rejects(provider.listSnapshots(), (error) => {
    assert.equal(error.code, "destination-required");
    return true;
  });
  assert.equal(drive.calls.length, 1);
});

test("Google Drive backup disconnect revokes its memory-only token", async () => {
  const { identity, provider } = createProvider();

  await connect(provider);
  await provider.disconnect();

  assert.deepEqual(identity.oauth2.calls.revoked, ["access-token"]);
  assert.equal(provider.getState().status, "disconnected");
  assert.equal(provider.getState().account, null);
});

test("Google Drive backup rejects a token without the Drive file scope", async () => {
  const { provider } = createProvider({
    identity: createIdentity({ grantsScope: false }),
    steps: []
  });

  await assert.rejects(provider.connect(), (error) => {
    assert.equal(error.code, "scope-not-granted");
    return true;
  });
  assert.equal(provider.getState().status, "disconnected");
});

test("Google Drive backup lists paged snapshots newest first", async () => {
  const older = createRemoteFile({
    createdAt: "2026-10-16T12:00:00.000Z",
    fileName: "older.json",
    id: "older"
  });
  const newer = createRemoteFile({
    createdAt: "2026-10-17T12:00:00.000Z",
    fileName: "newer.json",
    id: "newer"
  });
  const { provider } = createProvider({
    steps: [
      accountStep(),
      {
        assert({ url }) {
          assert.equal(url.searchParams.has("pageToken"), false);
        },
        response: jsonResponse({ files: [older], nextPageToken: "page-2" })
      },
      {
        assert({ url }) {
          assert.equal(url.searchParams.get("pageToken"), "page-2");
        },
        response: jsonResponse({ files: [newer] })
      }
    ]
  });

  await connect(provider);
  const snapshots = await provider.listSnapshots();

  assert.deepEqual(
    snapshots.map(({ snapshotId }) => snapshotId),
    ["newer", "older"]
  );
});

test("Google Drive backup uploads an app-owned snapshot and trims retention", async () => {
  const uploadedFile = createRemoteFile({
    createdAt: "2026-10-17T12:00:00.000Z",
    fileName: "wotagoods-backup.json.gz",
    id: "drive-new",
    snapshotId: "snapshot-new"
  });
  const olderFile = createRemoteFile({
    createdAt: "2026-10-16T12:00:00.000Z",
    fileName: "older.json",
    id: "drive-old"
  });
  let uploadText = "";
  const { provider } = createProvider({
    maxSnapshots: 1,
    steps: [
      accountStep(),
      {
        async assert({ options, url }) {
          assert.equal(options.method, "POST");
          assert.equal(url.pathname, "/upload/drive/v3/files");
          assert.equal(url.searchParams.get("uploadType"), "multipart");
          uploadText = await options.body.text();
        },
        response: jsonResponse(uploadedFile)
      },
      {
        response: jsonResponse({ files: [uploadedFile, olderFile] })
      },
      {
        assert({ options, url }) {
          assert.equal(options.method, "DELETE");
          assert.equal(url.pathname, "/drive/v3/files/drive-old");
        },
        response: new Response(null, { status: 204 })
      }
    ]
  });

  await connect(provider);
  const result = await provider.uploadSnapshot(createBackup());

  assert.match(uploadText, /"application":"wotagoods-manager"/);
  assert.match(uploadText, /"snapshotId":"snapshot-new"/);
  assert.match(uploadText, /"mimeType":"application\/gzip"/);
  assert.match(uploadText, /"name":"wotagoods-backup\.json\.gz"/);
  assert.deepEqual(result.retention, { failed: 0, removed: 1 });
  assert.equal(provider.getState().lastBackup.id, "drive-new");
});

test("Google Drive backup downloads and decompresses its marked snapshot", async () => {
  const archive = await createGzipBackupArchive({
    fileName: "backup.json",
    mimeType: "application/json",
    text: "portable snapshot"
  });
  const file = createRemoteFile({
    createdAt: "2026-10-17T12:00:00.000Z",
    fileName: archive.fileName,
    id: "snapshot-1"
  });
  const { provider } = createProvider({
    steps: [
      accountStep(),
      { response: jsonResponse(file) },
      {
        assert({ url }) {
          assert.equal(url.pathname, "/drive/v3/files/snapshot-1");
          assert.equal(url.searchParams.get("alt"), "media");
        },
        response: new Response(archive.blob)
      }
    ]
  });

  await connect(provider);

  assert.equal(
    await provider.downloadSnapshot("snapshot-1"),
    "portable snapshot"
  );
});

test("Google Drive backup rejects an uncompressed snapshot", async () => {
  const file = createRemoteFile({
    createdAt: "2026-10-17T12:00:00.000Z",
    fileName: "backup.json",
    id: "snapshot-json",
    mimeType: "application/json"
  });
  const { drive, provider } = createProvider({
    steps: [accountStep(), { response: jsonResponse(file) }]
  });

  await connect(provider);
  await assert.rejects(provider.downloadSnapshot("snapshot-json"), (error) => {
    assert.equal(error.code, "invalid-snapshot");
    return true;
  });
  assert.equal(drive.calls.length, 2);
});

test("Google Drive backup rejects an unmarked Drive file", async () => {
  const file = createRemoteFile({
    createdAt: "2026-10-17T12:00:00.000Z",
    fileName: "foreign.json",
    id: "foreign"
  });
  file.appProperties.application = "another-app";
  const { drive, provider } = createProvider({
    steps: [accountStep(), { response: jsonResponse(file) }]
  });

  await connect(provider);
  await assert.rejects(provider.downloadSnapshot("foreign"), (error) => {
    assert.equal(error.code, "invalid-snapshot");
    return true;
  });
  assert.equal(drive.calls.length, 2);
});
