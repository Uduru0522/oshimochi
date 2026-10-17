import assert from "node:assert/strict";
import test from "node:test";

import {
  createGooglePickerLoader,
  pickGoogleDriveFolder
} from "../../../src/services/backups/google-picker.js";

function createPickerApi() {
  const calls = {
    builder: {},
    view: {},
    visible: []
  };
  let callback;

  class DocsView {
    constructor(viewId) {
      calls.view.viewId = viewId;
    }

    setIncludeFolders(value) {
      calls.view.includeFolders = value;
      return this;
    }

    setMimeTypes(value) {
      calls.view.mimeTypes = value;
      return this;
    }

    setSelectFolderEnabled(value) {
      calls.view.selectFolder = value;
      return this;
    }
  }

  class PickerBuilder {
    addView(value) {
      calls.builder.view = value;
      return this;
    }

    build() {
      return {
        setVisible(value) {
          calls.visible.push(value);
        }
      };
    }

    setAppId(value) {
      calls.builder.appId = value;
      return this;
    }

    setCallback(value) {
      callback = value;
      return this;
    }

    setDeveloperKey(value) {
      calls.builder.apiKey = value;
      return this;
    }

    setLocale(value) {
      calls.builder.locale = value;
      return this;
    }

    setMaxItems(value) {
      calls.builder.maxItems = value;
      return this;
    }

    setOAuthToken(value) {
      calls.builder.accessToken = value;
      return this;
    }

    setOrigin(value) {
      calls.builder.origin = value;
      return this;
    }

    setTitle(value) {
      calls.builder.title = value;
      return this;
    }
  }

  return {
    api: {
      Action: { CANCEL: "cancel", PICKED: "picked" },
      DocsView,
      Document: { ID: "id", NAME: "name" },
      PickerBuilder,
      Response: { ACTION: "action", DOCUMENTS: "docs" },
      ViewId: { FOLDERS: "folders" }
    },
    calls,
    respond(value) {
      callback(value);
    }
  };
}

test("Google Picker loader returns an API that is already available", async () => {
  const picker = createPickerApi().api;
  let scriptLoads = 0;
  const loader = createGooglePickerLoader({
    getPicker: () => picker,
    loadScript: async () => {
      scriptLoads += 1;
    }
  });

  assert.equal(await loader.load(), picker);
  assert.equal(scriptLoads, 0);
});

test("Google Picker loader shares one pending module load", async () => {
  const picker = createPickerApi().api;
  const gapi = { load() {} };
  let releaseLoad;
  let moduleLoads = 0;
  let isAvailable = false;
  const loader = createGooglePickerLoader({
    getGapi: () => gapi,
    getPicker: () => isAvailable ? picker : null,
    loadModule: () => {
      moduleLoads += 1;
      return new Promise((resolve) => {
        releaseLoad = () => {
          isAvailable = true;
          resolve();
        };
      });
    }
  });

  const first = loader.load();
  const second = loader.load();

  assert.equal(first, second);
  await Promise.resolve();
  releaseLoad();
  assert.equal(await first, picker);
  assert.equal(moduleLoads, 1);
});

test("Google folder picker resolves the selected folder", async () => {
  const picker = createPickerApi();
  const selection = pickGoogleDriveFolder(picker.api, {
    accessToken: "access-token",
    apiKey: "api-key",
    appId: "123456789012",
    locale: "ja",
    origin: "https://example.com",
    title: "Choose a folder"
  });

  picker.respond({
    action: picker.api.Action.PICKED,
    docs: [{ id: "folder-1", name: "My backups" }]
  });

  assert.deepEqual(await selection, { id: "folder-1", name: "My backups" });
  assert.deepEqual(picker.calls.view, {
    includeFolders: true,
    mimeTypes: "application/vnd.google-apps.folder",
    selectFolder: true,
    viewId: "folders"
  });
  assert.deepEqual(picker.calls.visible, [true]);
  assert.equal(picker.calls.builder.accessToken, "access-token");
  assert.equal(picker.calls.builder.apiKey, "api-key");
  assert.equal(picker.calls.builder.appId, "123456789012");
});

test("Google folder picker resolves null when selection is cancelled", async () => {
  const picker = createPickerApi();
  const selection = pickGoogleDriveFolder(picker.api, {
    accessToken: "access-token",
    apiKey: "api-key",
    appId: "123456789012"
  });

  picker.respond({ action: picker.api.Action.CANCEL });

  assert.equal(await selection, null);
});
