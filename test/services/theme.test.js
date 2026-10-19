import assert from "node:assert/strict";
import test from "node:test";

import { createThemeController } from "../../src/services/theme.js";

function createDocument() {
  const metaAttributes = new Map();
  const themeColorMeta = {
    setAttribute: (name, value) => metaAttributes.set(name, value)
  };

  return {
    documentElement: { dataset: {}, style: {} },
    getThemeColor: () => metaAttributes.get("content"),
    querySelector: (selector) => selector === 'meta[name="theme-color"]'
      ? themeColorMeta
      : null
  };
}

function createMemoryStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    get: (key, fallbackValue = null) => values.get(key) ?? fallbackValue,
    read: (key) => values.get(key),
    set: (key, value) => values.set(key, value)
  };
}

test("theme controller exposes accent colors in display order", () => {
  const controller = createThemeController({
    documentRef: createDocument(),
    storage: createMemoryStorage()
  });

  assert.deepEqual(
    controller.getAccentOptions(),
    ["red", "orange", "yellow", "blue", "green", "pink", "purple"]
  );
});

test("theme initialization restores the saved accent", () => {
  const documentRef = createDocument();
  const controller = createThemeController({
    documentRef,
    storage: createMemoryStorage({ accent: "purple", theme: "light" })
  });

  controller.initialize();

  assert.equal(documentRef.documentElement.dataset.accent, "purple");
});

test("invalid saved accents fall back to green", () => {
  const documentRef = createDocument();
  const storage = createMemoryStorage({ accent: "chartreuse" });
  const controller = createThemeController({ documentRef, storage });

  controller.initialize();

  assert.equal(documentRef.documentElement.dataset.accent, "green");
  assert.equal(storage.read("accent"), "green");
});

test("accent changes persist and update light browser chrome", () => {
  const documentRef = createDocument();
  const storage = createMemoryStorage();
  const controller = createThemeController({ documentRef, storage });

  controller.initialize();
  controller.setAccent("red");

  assert.equal(storage.read("accent"), "red");
  assert.equal(documentRef.getThemeColor(), "#c2354b");
});

test("yellow uses the bright light-theme color for browser chrome", () => {
  const documentRef = createDocument();
  const controller = createThemeController({
    documentRef,
    storage: createMemoryStorage({ theme: "light" })
  });

  controller.initialize();
  controller.setAccent("yellow");

  assert.equal(documentRef.getThemeColor(), "#d3ad00");
});

test("dark mode keeps dark browser chrome when the accent changes", () => {
  const documentRef = createDocument();
  const controller = createThemeController({
    documentRef,
    storage: createMemoryStorage({ theme: "dark" })
  });

  controller.initialize();
  controller.setAccent("yellow");

  assert.equal(documentRef.getThemeColor(), "#171c1b");
});
