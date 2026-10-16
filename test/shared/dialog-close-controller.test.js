import assert from "node:assert/strict";
import test from "node:test";

import {
  createDialogCloseController
} from "../../src/shared/dialog-close-controller.js";

function createDialog() {
  const listeners = new Map();

  return {
    closeCount: 0,
    dataset: {},
    open: true,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    close() {
      this.closeCount += 1;
      this.open = false;
    },
    dispatch(type, target = this) {
      listeners.get(type)?.({ target });
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    }
  };
}

function withMotionPreference(reduce, callback) {
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const previousMatchMedia = globalThis.matchMedia;
  globalThis.getComputedStyle = () => ({
    animationDelay: "0s",
    animationDuration: "0.1s"
  });
  globalThis.matchMedia = () => ({ matches: reduce });

  try {
    callback();
  } finally {
    if (previousGetComputedStyle === undefined) {
      delete globalThis.getComputedStyle;
    } else {
      globalThis.getComputedStyle = previousGetComputedStyle;
    }

    if (previousMatchMedia === undefined) {
      delete globalThis.matchMedia;
    } else {
      globalThis.matchMedia = previousMatchMedia;
    }
  }
}

test("dialog close controller finishes after the dialog animation", () => {
  withMotionPreference(false, () => {
    const dialog = createDialog();
    const events = [];
    const controller = createDialogCloseController(dialog, {
      onClosed: () => events.push("closed"),
      onCloseRequested: () => events.push("requested")
    });

    assert.equal(controller.requestClose({
      afterClose: () => events.push("action")
    }), true);
    assert.equal(dialog.open, true);
    assert.equal(dialog.dataset.closing, "true");

    dialog.dispatch("animationend");

    assert.equal(dialog.open, false);
    assert.deepEqual(events, ["requested", "closed", "action"]);
    assert.equal("closing" in dialog.dataset, false);
  });
});

test("dialog close controller honors reduced motion immediately", () => {
  withMotionPreference(true, () => {
    const dialog = createDialog();
    const controller = createDialogCloseController(dialog);

    assert.equal(controller.requestClose(), true);
    assert.equal(dialog.open, false);
    assert.equal(dialog.closeCount, 1);
  });
});

test("dialog close controller requires an explicit force to bypass a blocker", () => {
  withMotionPreference(true, () => {
    const dialog = createDialog();
    const controller = createDialogCloseController(dialog, {
      canClose: ({ force }) => force
    });

    assert.equal(controller.requestClose(), false);
    assert.equal(dialog.open, true);
    assert.equal(controller.requestClose({ force: true }), true);
    assert.equal(dialog.open, false);
  });
});

test("destroying a dialog close controller cancels pending completion work", () => {
  withMotionPreference(false, () => {
    const dialog = createDialog();
    let completionCount = 0;
    const controller = createDialogCloseController(dialog, {
      onClosed: () => { completionCount += 1; }
    });

    controller.requestClose({
      afterClose: () => { completionCount += 1; }
    });
    controller.destroy();
    dialog.dispatch("animationend");

    assert.equal(dialog.open, false);
    assert.equal(dialog.closeCount, 1);
    assert.equal(completionCount, 0);
  });
});
