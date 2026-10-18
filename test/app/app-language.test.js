import assert from "node:assert/strict";
import test from "node:test";

import { applyAppLanguage } from "../../src/app/app-language.js";

function createElement() {
  const attributes = new Map();

  return {
    attributes,
    setAttribute: (name, value) => attributes.set(name, value),
    textContent: ""
  };
}

test("app language localizes the GitHub project link metadata", () => {
  const previousDocument = globalThis.document;
  const description = createElement();
  const elements = {
    appShell: createElement(),
    primaryNavList: createElement(),
    projectRepositoryLink: createElement(),
    sidebar: createElement(),
    utilityMenuToggle: createElement(),
    utilityNavList: createElement()
  };

  globalThis.document = {
    documentElement: {
      dataset: { languagePending: "true" },
      lang: "ja"
    },
    querySelector: () => description,
    title: ""
  };

  try {
    applyAppLanguage(elements);

    assert.equal(
      elements.projectRepositoryLink.attributes.get("aria-label"),
      "GitHub でプロジェクトを見る"
    );
    assert.equal(
      elements.projectRepositoryLink.attributes.get("title"),
      "GitHub でプロジェクトを見る"
    );
  } finally {
    globalThis.document = previousDocument;
  }
});

test("app language localizes the utility menu disclosure", () => {
  const previousDocument = globalThis.document;
  const elements = {
    appShell: createElement(),
    primaryNavList: createElement(),
    projectRepositoryLink: createElement(),
    sidebar: createElement(),
    utilityMenuToggle: createElement(),
    utilityNavList: createElement()
  };

  globalThis.document = {
    documentElement: {
      dataset: { languagePending: "true" },
      lang: "en"
    },
    querySelector: () => createElement(),
    title: ""
  };

  try {
    applyAppLanguage(elements);

    assert.equal(elements.utilityMenuToggle.attributes.get("aria-label"), "More");
    assert.equal(elements.utilityMenuToggle.attributes.get("title"), "More");
  } finally {
    globalThis.document = previousDocument;
  }
});
