import assert from "node:assert/strict";
import test from "node:test";

import { createViewRouter } from "../../src/app/view-router.js";

function createElement() {
  const children = [];
  const classes = new Set();

  return {
    append(...elements) {
      children.push(...elements);
    },
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name))
    },
    get children() {
      return [...children];
    },
    hasChildNodes: () => children.length > 0,
    hidden: false,
    replaceChildren(...elements) {
      children.splice(0, children.length, ...elements);
    },
    scrollLeft: 0,
    scrollTop: 0,
    textContent: ""
  };
}

test("view router destroys replaced views and the active view on teardown", () => {
  const originalMatchMedia = globalThis.matchMedia;
  const destroyed = [];
  const views = [
    { id: "first", section: "One", title: "First" },
    { id: "second", section: "Two", title: "Second" }
  ];
  const router = createViewRouter({
    navigation: { setActiveView() {} },
    renderer: {
      render: (view) => ({
        content: { viewId: view.id },
        destroy: () => destroyed.push(view.id)
      })
    },
    views,
    viewActions: createElement(),
    viewPanel: createElement(),
    viewSection: createElement(),
    viewToolbar: createElement(),
    viewTitle: createElement()
  });

  globalThis.matchMedia = () => ({ matches: true });

  try {
    router.setActiveView("first");
    router.setActiveView("second");
    assert.deepEqual(destroyed, ["first"]);

    router.destroy();
    assert.deepEqual(destroyed, ["first", "second"]);
  } finally {
    globalThis.matchMedia = originalMatchMedia;
  }
});

test("view router can highlight a primary navigation alias", () => {
  const originalMatchMedia = globalThis.matchMedia;
  const activeNavigationIds = [];
  const overview = {
    id: "goods:figures:overview",
    navigationId: "goods:figures",
    section: "Goods type",
    title: "Figures overview"
  };
  const router = createViewRouter({
    navigation: {
      setActiveView: (viewId) => activeNavigationIds.push(viewId)
    },
    renderer: { render: () => ({}) },
    views: [overview],
    viewActions: createElement(),
    viewPanel: createElement(),
    viewSection: createElement(),
    viewToolbar: createElement(),
    viewTitle: createElement()
  });

  globalThis.matchMedia = () => ({ matches: true });

  try {
    router.setActiveView(overview.id);
    assert.deepEqual(activeNavigationIds, [overview.navigationId]);
  } finally {
    router.destroy();
    globalThis.matchMedia = originalMatchMedia;
  }
});

test("view router shows the action toolbar only for views that provide actions", () => {
  const originalMatchMedia = globalThis.matchMedia;
  const toolbarAction = { id: "actions" };
  const viewActions = createElement();
  const viewToolbar = createElement();
  const views = [
    { id: "with-actions", section: "One", title: "With actions" },
    { id: "without-actions", section: "Two", title: "Without actions" }
  ];
  const router = createViewRouter({
    navigation: { setActiveView() {} },
    renderer: {
      render: (view) => ({
        content: { viewId: view.id },
        toolbarAction: view.id === "with-actions" ? toolbarAction : null
      })
    },
    views,
    viewActions,
    viewPanel: createElement(),
    viewSection: createElement(),
    viewToolbar,
    viewTitle: createElement()
  });

  globalThis.matchMedia = () => ({ matches: true });

  try {
    router.setActiveView("with-actions");
    assert.equal(viewToolbar.hidden, false);
    assert.deepEqual(viewActions.children, [toolbarAction]);

    router.setActiveView("without-actions");
    assert.equal(viewToolbar.hidden, true);
    assert.deepEqual(viewActions.children, []);
  } finally {
    router.destroy();
    globalThis.matchMedia = originalMatchMedia;
  }
});
