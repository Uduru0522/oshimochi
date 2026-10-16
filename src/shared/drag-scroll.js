const DRAG_THRESHOLD_PX = 6;
const boundContainers = new WeakMap();
const DRAG_EXCLUSION_SELECTOR = [
  "dialog",
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[role='switch']",
  "[data-no-drag-scroll]"
].join(",");

function isExcludedDragTarget(target) {
  return typeof target?.closest === "function" && Boolean(target.closest(DRAG_EXCLUSION_SELECTOR));
}

function canScrollOnAxis(container, axis) {
  if (axis === "x") {
    return container.scrollWidth > container.clientWidth + 1;
  }

  return container.scrollHeight > container.clientHeight + 1;
}

export function canScrollHorizontally(container) {
  return canScrollOnAxis(container, "x");
}

export function canScrollVertically(container) {
  return canScrollOnAxis(container, "y");
}

function getPrimaryCoordinate(event, axis) {
  return axis === "x" ? event.clientX : event.clientY;
}

function getScrollPosition(container, axis) {
  return axis === "x" ? container.scrollLeft : container.scrollTop;
}

function setScrollPosition(container, axis, value) {
  if (axis === "x") {
    container.scrollLeft = value;
    return;
  }

  container.scrollTop = value;
}

function clearDragState(container, event) {
  if (event && container.hasPointerCapture(event.pointerId)) {
    container.releasePointerCapture(event.pointerId);
  }

  delete container.dataset.dragging;
}

export function bindDragScroll(container, { allowInteractiveStart = false, axis }) {
  if (!container || boundContainers.get(container)?.has(axis)) {
    return;
  }

  const boundAxes = boundContainers.get(container) ?? new Set();
  let dragStart = 0;
  let scrollStart = 0;
  let isDragging = false;
  let didDrag = false;
  let pointerId = null;

  boundAxes.add(axis);
  boundContainers.set(container, boundAxes);

  container.addEventListener("pointerdown", (event) => {
    isDragging = false;
    didDrag = false;
    pointerId = null;

    if (
      event.button !== 0 ||
      (!allowInteractiveStart && isExcludedDragTarget(event.target)) ||
      !canScrollOnAxis(container, axis)
    ) {
      return;
    }

    pointerId = event.pointerId;
    dragStart = getPrimaryCoordinate(event, axis);
    scrollStart = getScrollPosition(container, axis);
  });

  container.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const dragDistance = getPrimaryCoordinate(event, axis) - dragStart;

    if (!isDragging && Math.abs(dragDistance) > DRAG_THRESHOLD_PX) {
      isDragging = true;
      didDrag = true;
      container.dataset.dragging = "true";
      container.setPointerCapture(event.pointerId);
    }

    if (isDragging) {
      event.preventDefault();
      setScrollPosition(container, axis, scrollStart - dragDistance);
    }
  });

  container.addEventListener("pointerup", (event) => {
    isDragging = false;
    pointerId = null;
    clearDragState(container, event);
  });

  container.addEventListener("pointercancel", (event) => {
    isDragging = false;
    pointerId = null;
    clearDragState(container, event);
  });

  container.addEventListener("click", (event) => {
    if (!didDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    didDrag = false;
  }, true);
}
