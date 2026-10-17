export const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

const SCRIPT_ATTRIBUTE = "data-oshimochi-google-identity";

function getBrowserOAuth2() {
  return globalThis.google?.accounts?.oauth2 ?? null;
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
      reject(new Error("Google Identity Services could not be loaded."));
    }

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.setAttribute(SCRIPT_ATTRIBUTE, "");
      script.async = true;
      script.defer = true;
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      document.head.append(script);
    }
  });
}

export function createGoogleIdentityLoader({
  getOAuth2 = getBrowserOAuth2,
  loadScript = loadBrowserScript
} = {}) {
  let loadingPromise = null;

  function load() {
    const available = getOAuth2();

    if (available) {
      return Promise.resolve(available);
    }

    if (!loadingPromise) {
      loadingPromise = Promise.resolve(loadScript())
        .then(() => {
          const oauth2 = getOAuth2();

          if (
            !oauth2?.hasGrantedAllScopes ||
            !oauth2?.initTokenClient ||
            !oauth2?.revoke
          ) {
            throw new Error("Google Identity Services is unavailable.");
          }

          return oauth2;
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
