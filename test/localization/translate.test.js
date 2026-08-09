import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeLanguage,
  translate
} from "../../src/localization/translate.js";
import { TRANSLATIONS } from "../../src/localization/translations.js";

function withDocumentLanguage(language, callback) {
  const previousDocument = globalThis.document;
  globalThis.document = { documentElement: { lang: language } };

  try {
    callback();
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

function listJavaScriptFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);

    if (entry.isDirectory()) {
      return entry.name === "localization" ? [] : listJavaScriptFiles(entryUrl);
    }

    return entry.name.endsWith(".js") ? [entryUrl] : [];
  });
}

function collectStaticTranslationKeys() {
  const keys = new Set();
  const stringPatterns = [
    /translate\(\s*"((?:[^"\\]|\\.)*)"/g,
    /translate\(\s*'((?:[^'\\]|\\.)*)'/g
  ];

  listJavaScriptFiles(new URL("../../src/", import.meta.url)).forEach((fileUrl) => {
    const source = readFileSync(fileUrl, "utf8");

    stringPatterns.forEach((pattern) => {
      for (const match of source.matchAll(pattern)) {
        keys.add(match[1].replace(/\\(["'])/g, "$1"));
      }
    });
  });

  return keys;
}

test("language normalization accepts supported browser locale variants", () => {
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("ja-JP"), "ja");
  assert.equal(normalizeLanguage("zh-TW"), "zh-Hant");
  assert.equal(normalizeLanguage("zh-HK"), "zh-Hant");
  assert.equal(normalizeLanguage("zh-CN"), "en");
});

test("translations use the document language and interpolate named values", () => {
  withDocumentLanguage("ja", () => {
    assert.equal(translate("Dashboard"), "ダッシュボード");
    assert.equal(
      translate("{name} items", { name: "フィギュア" }),
      "フィギュアのアイテム"
    );
  });

  withDocumentLanguage("zh-Hant", () => {
    assert.equal(translate("Dashboard"), "儀表板");
    assert.equal(translate("Add item"), "新增項目");
  });
});

test("English and missing catalog entries fall back to source copy", () => {
  withDocumentLanguage("en", () => {
    assert.equal(translate("Dashboard"), "Dashboard");
    assert.equal(translate("Unknown copy"), "Unknown copy");
  });
});

test("non-English catalogs expose the same translation keys", () => {
  assert.deepEqual(
    Object.keys(TRANSLATIONS.ja).sort(),
    Object.keys(TRANSLATIONS["zh-Hant"]).sort()
  );
});

test("static interface copy is present in every non-English catalog", () => {
  const missingKeys = [...collectStaticTranslationKeys()].filter(
    (key) => !Object.hasOwn(TRANSLATIONS.ja, key)
  );

  assert.deepEqual(missingKeys, []);
});
