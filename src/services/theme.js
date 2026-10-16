import { APP_CONFIG } from "../app/config.js";
import { createStorage } from "./storage.js";

export function createThemeController({
  documentRef = globalThis.document,
  storage: storageOverride
} = {}) {
  const {
    accent: accentConfig,
    colors,
    dark,
    light,
    storageKey,
    storageNamespace
  } = APP_CONFIG.theme;
  const storage = storageOverride ?? createStorage(storageNamespace);

  function normalizeAccent(accent) {
    return accentConfig.values.includes(accent) ? accent : accentConfig.defaultValue;
  }

  function getSavedTheme() {
    return storage.get(storageKey);
  }

  function getTheme() {
    return documentRef.documentElement.dataset.theme === dark ? dark : light;
  }

  function getAccent() {
    return normalizeAccent(documentRef.documentElement.dataset.accent);
  }

  function updateThemeColor(theme = getTheme(), accent = getAccent()) {
    const themeColor = theme === dark ? colors.dark : accentConfig.colors[accent];

    documentRef
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
  }

  function setTheme(theme) {
    const normalizedTheme = theme === dark ? dark : light;

    documentRef.documentElement.dataset.theme = normalizedTheme;
    documentRef.documentElement.style.colorScheme = normalizedTheme;
    updateThemeColor(normalizedTheme);
    storage.set(storageKey, normalizedTheme);
  }

  function setAccent(accent) {
    const normalizedAccent = normalizeAccent(accent);

    documentRef.documentElement.dataset.accent = normalizedAccent;
    updateThemeColor(getTheme(), normalizedAccent);
    storage.set(accentConfig.storageKey, normalizedAccent);
  }

  function initialize() {
    setAccent(storage.get(accentConfig.storageKey, accentConfig.defaultValue));
    setTheme(getSavedTheme() === dark ? dark : light);
  }

  return {
    getAccent,
    getAccentOptions: () => [...accentConfig.values],
    getTheme,
    initialize,
    isDarkMode: () => getTheme() === dark,
    setAccent,
    setTheme,
    setDarkMode: (isEnabled) => setTheme(isEnabled ? dark : light)
  };
}
