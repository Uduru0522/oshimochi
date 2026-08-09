import { APP_CONFIG } from "../app/config.js";
import { normalizeLanguage, translate } from "../localization/translate.js";
import { createStorage } from "./storage.js";

export function createLanguageController() {
  const { storageKey, storageNamespace } = APP_CONFIG.language;
  const storage = createStorage(storageNamespace);

  function getLanguage() {
    return normalizeLanguage(document.documentElement.lang);
  }

  function applyDocumentMetadata() {
    document.title = translate("Wotagoods Manager");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        translate("A local-first web app for managing multiple goods collections.")
      );
  }

  function setLanguage(language) {
    const normalized = normalizeLanguage(language);

    document.documentElement.lang = normalized;
    storage.set(storageKey, normalized);
    applyDocumentMetadata();
  }

  function initialize() {
    setLanguage(storage.get(storageKey, "en"));
  }

  return {
    getLanguage,
    initialize,
    setLanguage
  };
}
