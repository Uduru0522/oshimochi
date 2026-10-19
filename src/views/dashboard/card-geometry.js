// Layout motion and dragging use the same unrotated box and coordinate space.
// Resolve the scrollport at use time: views are constructed before mounting.
export function cardViewportBounds(element) {
  const box = element.getBoundingClientRect();
  const width = element.offsetWidth ?? box.width, height = element.offsetHeight ?? box.height;
  return { x: box.left + (box.width - width) / 2, y: box.top + (box.height - height) / 2, width, height };
}

function offset(container) {
  const port = container.closest?.('.view-panel');
  return { x: port?.scrollLeft ?? 0, y: port?.scrollTop ?? 0 };
}

export function cardContentPoint(container, { x, y }) {
  const scroll = offset(container);
  return { x: x + scroll.x, y: y + scroll.y };
}

export function cardViewportPoint(container, { x, y }) {
  const scroll = offset(container);
  return { x: x - scroll.x, y: y - scroll.y };
}
