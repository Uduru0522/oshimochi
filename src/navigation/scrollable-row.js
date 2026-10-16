import { bindDragScroll, canScrollHorizontally } from "../shared/drag-scroll.js";

const boundRows = new WeakSet();

function updateScrollHint(container) {
  const canScrollRight =
    canScrollHorizontally(container) &&
    container.scrollLeft + container.clientWidth < container.scrollWidth - 1;

  container.parentElement?.toggleAttribute("data-can-scroll-right", canScrollRight);
}

function bindWheelScroll(container) {
  container.addEventListener("wheel", (event) => {
    if (!canScrollHorizontally(container)) {
      return;
    }

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += event.deltaY;
  }, { passive: false });
}


export function bindScrollableRow(container) {
  if (boundRows.has(container)) {
    updateScrollHint(container);
    return;
  }

  const update = () => updateScrollHint(container);

  boundRows.add(container);
  bindWheelScroll(container);
  bindDragScroll(container, { allowInteractiveStart: true, axis: "x" });
  container.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  if ("ResizeObserver" in window) {
    new ResizeObserver(update).observe(container);
  }

  requestAnimationFrame(update);
}
