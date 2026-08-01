import assert from "node:assert/strict";
import test from "node:test";

import { createFieldEditor } from "../../src/views/administration/field-editor.js";

class FakeElement {
  constructor(tagName) {
    this.attributes = new Map();
    this.children = [];
    this.dataset = {};
    this.disabled = false;
    this.hidden = false;
    this.tagName = tagName;
    this.value = "";
  }

  addEventListener() {}

  append(...children) {
    this.children.push(...children);
  }

  focus() {}

  querySelector() {
    return null;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  toggleAttribute() {}
}

function withFakeDom(run) {
  const previousDocument = globalThis.document;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;

  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName)
  };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };

  try {
    return run();
  } finally {
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  }
}

test("field editor opens existing and staged fields without a draft-state error", () => {
  withFakeDom(() => {
    const callbacks = { onCancel() {}, onSave() {} };
    const existingEditor = createFieldEditor({
      ...callbacks,
      field: {
        dataType: "text",
        displayName: "Width",
        isRequired: false,
        originalIsRequired: false
      }
    });
    const stagedEditor = createFieldEditor({
      ...callbacks,
      field: {
        dataType: "text",
        displayName: "Height",
        isRequired: false,
        stagedKind: "add"
      }
    });

    assert.equal(existingEditor.tagName, "form");
    assert.equal(stagedEditor.tagName, "form");
  });
});
