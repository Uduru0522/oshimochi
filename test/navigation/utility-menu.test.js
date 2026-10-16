import assert from "node:assert/strict";
import test from "node:test";

import { bindUtilityMenu } from "../../src/navigation/utility-menu.js";

class FakeTarget {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();

    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  contains(target) {
    return target === this;
  }

  focus() {
    this.focused = true;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

function createFixture() {
  const documentTarget = new FakeTarget();
  const menu = new FakeTarget();
  const toggle = new FakeTarget();
  const windowTarget = new FakeTarget();
  const controller = bindUtilityMenu({
    documentTarget,
    menu,
    toggle,
    windowTarget
  });

  return { controller, documentTarget, menu, toggle };
}

test("utility menu toggle opens and closes the disclosure", () => {
  const { controller, menu, toggle } = createFixture();

  toggle.dispatch("click");

  assert.equal(menu.dataset.open, "true");
  assert.equal(toggle.attributes.get("aria-expanded"), "true");

  toggle.dispatch("click");

  assert.equal(menu.dataset.open, undefined);
  assert.equal(toggle.attributes.get("aria-expanded"), "false");
  controller.destroy();
});

test("utility menu closes after an outside pointer press", () => {
  const { controller, documentTarget, menu, toggle } = createFixture();

  toggle.dispatch("click");
  documentTarget.dispatch("pointerdown", { target: new FakeTarget() });

  assert.equal(menu.dataset.open, undefined);
  controller.destroy();
});

test("Escape closes the utility menu and restores trigger focus", () => {
  const { controller, documentTarget, menu, toggle } = createFixture();
  let wasPrevented = false;

  toggle.dispatch("click");
  documentTarget.dispatch("keydown", {
    key: "Escape",
    preventDefault: () => {
      wasPrevented = true;
    }
  });

  assert.equal(menu.dataset.open, undefined);
  assert.equal(toggle.focused, true);
  assert.equal(wasPrevented, true);
  controller.destroy();
});

test("choosing a utility destination closes the disclosure", () => {
  const { controller, menu, toggle } = createFixture();

  toggle.dispatch("click");
  menu.dispatch("click", {
    target: { closest: () => ({}) }
  });

  assert.equal(menu.dataset.open, undefined);
  controller.destroy();
});

test("destroy removes utility menu event listeners", () => {
  const { controller, menu, toggle } = createFixture();

  controller.destroy();
  toggle.dispatch("click");

  assert.equal(menu.dataset.open, undefined);
  assert.equal(toggle.attributes.get("aria-expanded"), "false");
});
