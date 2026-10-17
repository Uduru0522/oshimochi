import assert from "node:assert/strict";
import test from "node:test";

import {
  createGoogleDriveConfiguration,
  normalizeGoogleApiKey,
  normalizeGoogleCloudProjectNumber,
  normalizeGoogleDriveDestination,
  normalizeGoogleOAuthClientId
} from "../../../src/services/backups/google-drive-configuration.js";

const API_KEY = "AIzaSyExample_0123456789012345678901234";
const APP_ID = "123456789012";
const CLIENT_ID = "123456-example.apps.googleusercontent.com";
const DESTINATION = Object.freeze({ id: "folder-1", name: "My backups" });

function createStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const calls = { removed: [], saved: [] };

  return {
    calls,
    get(key, fallbackValue) {
      return values.has(key) ? values.get(key) : fallbackValue;
    },
    remove(key) {
      calls.removed.push(key);
      values.delete(key);
    },
    set(key, value) {
      calls.saved.push({ key, value });
      values.set(key, value);
    }
  };
}

function createConfiguration(storage) {
  return createGoogleDriveConfiguration({
    apiKeyStorageKey: "api-key",
    appIdStorageKey: "app-id",
    clientIdStorageKey: "client-id",
    destinationStorageKey: "destination",
    storageOverride: storage
  });
}

test("Google OAuth client ID normalization trims a valid web client ID", () => {
  assert.equal(normalizeGoogleOAuthClientId(`  ${CLIENT_ID}  `), CLIENT_ID);
});

test("Google OAuth client ID normalization rejects a non-Google ID", () => {
  assert.throws(
    () => normalizeGoogleOAuthClientId("example.invalid"),
    /valid Google OAuth web client ID/
  );
});

test("Google API key normalization trims a valid key", () => {
  assert.equal(normalizeGoogleApiKey(` ${API_KEY} `), API_KEY);
});

test("Google Cloud project number normalization rejects a project name", () => {
  assert.throws(
    () => normalizeGoogleCloudProjectNumber("wotagoods-project"),
    /valid Google Cloud project number/
  );
});

test("Google Drive destination normalization freezes a trimmed folder", () => {
  const destination = normalizeGoogleDriveDestination({
    id: " folder-1 ",
    name: " My backups "
  });

  assert.deepEqual(destination, DESTINATION);
  assert.equal(Object.isFrozen(destination), true);
});

test("Google Drive configuration persists validated credentials", () => {
  const storage = createStorage();
  const configuration = createConfiguration(storage);

  assert.deepEqual(configuration.setCredentials({
    apiKey: ` ${API_KEY} `,
    appId: ` ${APP_ID} `,
    clientId: ` ${CLIENT_ID} `
  }), {
    apiKey: API_KEY,
    appId: APP_ID,
    clientId: CLIENT_ID
  });
  assert.deepEqual(storage.calls.saved, [
    { key: "api-key", value: API_KEY },
    { key: "app-id", value: APP_ID },
    { key: "client-id", value: CLIENT_ID }
  ]);
});

test("Google Drive configuration persists the selected destination", () => {
  const storage = createStorage();
  const configuration = createConfiguration(storage);

  assert.deepEqual(configuration.setDestination(DESTINATION), DESTINATION);
  assert.deepEqual(configuration.getDestination(), DESTINATION);
  assert.deepEqual(storage.calls.saved, [{
    key: "destination",
    value: JSON.stringify(DESTINATION)
  }]);
});

test("Google Drive configuration reloads a persisted destination", () => {
  const configuration = createConfiguration(createStorage({
    destination: JSON.stringify(DESTINATION)
  }));

  assert.deepEqual(configuration.getDestination(), DESTINATION);
});

test("changing Google credentials clears the previous destination", () => {
  const storage = createStorage({
    "api-key": API_KEY,
    "app-id": APP_ID,
    "client-id": CLIENT_ID,
    destination: JSON.stringify(DESTINATION)
  });
  const configuration = createConfiguration(storage);

  configuration.setCredentials({
    apiKey: `${API_KEY}changed`,
    appId: APP_ID,
    clientId: CLIENT_ID
  });

  assert.equal(configuration.getDestination(), null);
  assert.equal(storage.calls.removed.includes("destination"), true);
});

test("saving unchanged Google credentials preserves the destination", () => {
  const storage = createStorage({
    "api-key": API_KEY,
    "app-id": APP_ID,
    "client-id": CLIENT_ID,
    destination: JSON.stringify(DESTINATION)
  });
  const configuration = createConfiguration(storage);

  configuration.setCredentials({
    apiKey: API_KEY,
    appId: APP_ID,
    clientId: CLIENT_ID
  });

  assert.deepEqual(configuration.getDestination(), DESTINATION);
  assert.equal(storage.calls.removed.includes("destination"), false);
});

test("Google Drive configuration removes an invalid persisted destination", () => {
  const storage = createStorage({ destination: "not-json" });
  const configuration = createConfiguration(storage);

  assert.equal(configuration.getDestination(), null);
  assert.deepEqual(storage.calls.removed, ["destination"]);
});

test("Google Drive configuration clears credentials and destination", () => {
  const storage = createStorage({
    "api-key": API_KEY,
    "app-id": APP_ID,
    "client-id": CLIENT_ID,
    destination: JSON.stringify(DESTINATION)
  });
  const configuration = createConfiguration(storage);

  configuration.clear();

  assert.equal(configuration.getApiKey(), "");
  assert.equal(configuration.getAppId(), "");
  assert.equal(configuration.getClientId(), "");
  assert.equal(configuration.getDestination(), null);
  assert.deepEqual(storage.calls.removed, [
    "destination",
    "api-key",
    "app-id",
    "client-id"
  ]);
});
