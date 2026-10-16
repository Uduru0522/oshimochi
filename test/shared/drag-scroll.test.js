import assert from "node:assert/strict";
import test from "node:test";

import { bindDragScroll } from "../../src/shared/drag-scroll.js";

function createPointerTarget({ interactive = false } = {}) {
  return {
    closest: () => interactive ? {} : null
  };
}

function createContainer() {
  const capturedPointers = new Set();
  const listeners = new Map();

  return {
    clientHeight: 100,
    clientWidth: 100,
    dataset: {},
    scrollHeight: 100,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 400,
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) ?? [];

      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    dispatch(type, properties = {}) {
      const event = {
        button: 0,
        clientX: 0,
        clientY: 0,
        defaultPrevented: false,
        pointerId: 1,
        propagationStopped: false,
        target: createPointerTarget(),
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.propagationStopped = true;
        },
        ...properties
      };

      (listeners.get(type) ?? []).forEach((listener) => listener(event));
      return event;
    },
    hasPointerCapture(pointerId) {
      return capturedPointers.has(pointerId);
    },
    releasePointerCapture(pointerId) {
      capturedPointers.delete(pointerId);
    },
    setPointerCapture(pointerId) {
      capturedPointers.add(pointerId);
    }
  };
}

test("drag scrolling ignores interactive start targets by default", () => {
  const container = createContainer();
  const target = createPointerTarget({ interactive: true });

  bindDragScroll(container, { axis: "x" });
  container.dispatch("pointerdown", { clientX: 80, target });
  container.dispatch("pointermove", { clientX: 40, target });

  assert.equal(container.scrollLeft, 0);
  assert.equal(container.dataset.dragging, undefined);
});

test("scrollable rows can drag from an interactive start target", () => {
  const container = createContainer();
  const target = createPointerTarget({ interactive: true });

  bindDragScroll(container, { allowInteractiveStart: true, axis: "x" });
  container.dispatch("pointerdown", { clientX: 80, target });
  const moveEvent = container.dispatch("pointermove", { clientX: 40, target });

  assert.equal(container.scrollLeft, 40);
  assert.equal(container.dataset.dragging, "true");
  assert.equal(moveEvent.defaultPrevented, true);
});

test("a tab click is suppressed only after its row was dragged", () => {
  const container = createContainer();
  const target = createPointerTarget({ interactive: true });

  bindDragScroll(container, { allowInteractiveStart: true, axis: "x" });
  container.dispatch("pointerdown", { clientX: 80, target });
  container.dispatch("pointermove", { clientX: 40, target });
  container.dispatch("pointerup", { clientX: 40, target });
  const draggedClick = container.dispatch("click", { target });
  const ordinaryClick = container.dispatch("click", { target });

  assert.equal(draggedClick.defaultPrevented, true);
  assert.equal(draggedClick.propagationStopped, true);
  assert.equal(ordinaryClick.defaultPrevented, false);
  assert.equal(ordinaryClick.propagationStopped, false);
});
