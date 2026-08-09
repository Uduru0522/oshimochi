import { TRANSLATIONS } from "./translations.js";

export const SUPPORTED_LANGUAGES = Object.freeze(["en", "ja", "zh-Hant"]);

export function normalizeLanguage(language) {
  const normalized = String(language ?? "").toLowerCase();

  if (normalized.startsWith("ja")) {
    return "ja";
  }

  if (normalized === "zh-hant" || normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")) {
    return "zh-Hant";
  }

  return "en";
}

export function translate(message, values = {}) {
  const language = normalizeLanguage(globalThis.document?.documentElement?.lang ?? "en");
  const template = TRANSLATIONS[language]?.[message] ?? message;

  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  );
}
