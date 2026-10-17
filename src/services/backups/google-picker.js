export const GOOGLE_PICKER_SCRIPT_URL = "https://apis.google.com/js/api.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const SCRIPT_ATTRIBUTE = "data-wotagoods-google-picker";

function getBrowserGapi() {
  return globalThis.gapi ?? null;
}

function getBrowserPicker() {
  return globalThis.google?.picker ?? null;
}

function loadBrowserScript() {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[${SCRIPT_ATTRIBUTE}]`);
    const script = existingScript ?? document.createElement("script");

    function cleanup() {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    }

    function handleLoad() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      script.remove();
      reject(new Error("Google Picker could not be loaded."));
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.setAttribute(SCRIPT_ATTRIBUTE, "");
      script.async = true;
      script.defer = true;
      script.src = GOOGLE_PICKER_SCRIPT_URL;
      document.head.append(script);
    }
  });
}

function loadBrowserPickerModule(gapi) {
  return new Promise((resolve, reject) => {
    gapi.load("picker", {
      callback: resolve,
      onerror: () => reject(new Error("Google Picker could not be loaded.")),
      ontimeout: () => reject(new Error("Google Picker loading timed out.")),
      timeout: 10_000
    });
  });
}

function assertPickerApi(picker) {
  if (
    typeof picker?.DocsView !== "function" ||
    typeof picker?.PickerBuilder !== "function" ||
    !picker.Action ||
    !picker.Document ||
    !picker.Response ||
    !picker.ViewId
  ) {
    throw new Error("Google Picker is unavailable.");
  }

  return picker;
}

export function createGooglePickerLoader({
  getGapi = getBrowserGapi,
  getPicker = getBrowserPicker,
  loadModule = loadBrowserPickerModule,
  loadScript = loadBrowserScript
} = {}) {
  let loadingPromise = null;

  function load() {
    const available = getPicker();

    if (available) {
      return Promise.resolve(assertPickerApi(available));
    }

    if (!loadingPromise) {
      loadingPromise = Promise.resolve()
        .then(async () => {
          let gapi = getGapi();

          if (!gapi?.load) {
            await loadScript();
            gapi = getGapi();
          }

          if (!gapi?.load) {
            throw new Error("Google API Loader is unavailable.");
          }

          await loadModule(gapi);
          return assertPickerApi(getPicker());
        })
        .catch((error) => {
          loadingPromise = null;
          throw error;
        });
    }

    return loadingPromise;
  }

  return Object.freeze({ load });
}

export function pickGoogleDriveFolder(picker, {
  accessToken,
  apiKey,
  appId,
  locale,
  origin = globalThis.location?.origin,
  title
}) {
  assertPickerApi(picker);

  if (!accessToken || !apiKey || !appId) {
    throw new TypeError("Google Picker requires an access token and app credentials.");
  }

  return new Promise((resolve, reject) => {
    let isSettled = false;

    function settle(action, value) {
      if (!isSettled) {
        isSettled = true;
        action(value);
      }
    }

    function handleSelection(data) {
      const action = data?.action ?? data?.[picker.Response.ACTION];

      if (action === picker.Action.CANCEL) {
        settle(resolve, null);
        return;
      }

      if (action !== picker.Action.PICKED) {
        return;
      }

      const documents = data?.[picker.Response.DOCUMENTS] ?? data?.docs ?? [];
      const document = documents[0];
      const id = document?.[picker.Document.ID] ?? document?.id;
      const name = document?.[picker.Document.NAME] ?? document?.name;

      if (typeof id !== "string" || typeof name !== "string") {
        settle(reject, new Error("Google Picker returned an invalid folder."));
        return;
      }

      settle(resolve, Object.freeze({ id, name }));
    }

    try {
      const view = new picker.DocsView(picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setMimeTypes(FOLDER_MIME_TYPE)
        .setSelectFolderEnabled(true);
      const builder = new picker.PickerBuilder()
        .addView(view)
        .setAppId(appId)
        .setCallback(handleSelection)
        .setDeveloperKey(apiKey)
        .setMaxItems(1)
        .setOAuthToken(accessToken);

      if (locale && typeof builder.setLocale === "function") {
        builder.setLocale(locale);
      }

      if (origin && typeof builder.setOrigin === "function") {
        builder.setOrigin(origin);
      }

      if (title && typeof builder.setTitle === "function") {
        builder.setTitle(title);
      }

      builder.build().setVisible(true);
    } catch (error) {
      settle(reject, error);
    }
  });
}
