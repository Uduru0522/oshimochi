import { cardKey, createCardLayoutMotion } from './card-layout-motion.js';
import { cardColumns, packCards } from './card-packing.js';

// Pack cards in saved order into the shortest column, without stretching them.
// The layout owns both card positions and container height. Measurement never
// clears an existing layout or temporarily reduces the page's scroll range.
export function createCardLayout(container) {
  let frame = 0, destroyed = false, measuredWidth = 0, initialized = false;
  const motion = createCardLayoutMotion(container, { onSettled: schedule });
  const observer = new ResizeObserver(entries => {
    // Animated card dimensions are owned by motion until they settle. Observe
    // external width/content changes without feeding each motion frame back in.
    if (entries.some(entry => entry.target === container && Math.abs(entry.contentRect.width - measuredWidth) > .5)) arrange();
    else if (entries.some(entry => entry.target !== container && !entry.target.dataset.cardExiting && !motion.isAnimating(entry.target))) schedule();
  });

  function schedule() {
    if (!destroyed && !frame) frame = requestAnimationFrame(arrange);
  }

  function arrange(previous = null) {
    cancelAnimationFrame(frame); frame = 0;
    if (destroyed || !container.isConnected || !container.clientWidth) return;
    const children = [...container.children].filter(child => !child.dataset.cardExiting && !child.hidden);
    if (!(previous instanceof Map)) previous = motion.capture();
    const styles = getComputedStyle(container);
    const maximum = Number(styles.getPropertyValue('--card-max-columns')) || 1;
    const gap = parseFloat(styles.columnGap) || 0;
    const width = container.clientWidth;
    const columns = cardColumns(width, gap, maximum);
    container.style.setProperty('--card-columns', String(columns));
    if (container.dataset.layout !== 'packed') container.style.height = `${container.offsetHeight}px`;
    container.dataset.layout = 'packed';
    const columnWidth = (width - (columns - 1) * gap) / columns;
    for (const child of children) {
      child.style.width = `${child.dataset.cardSpan === 'full' ? width : columnWidth}px`;
    }
    const packed = packCards(children.map(child => ({ height: child.offsetHeight, fullWidth: child.dataset.cardSpan === 'full' })),
      { width, columns, gap });
    children.forEach((child, index) => {
      child.style.left = `${packed.positions[index].left}px`;
      child.style.top = `${packed.positions[index].top}px`;
    });
    container.style.height = `${packed.height}px`;
    measuredWidth = container.getBoundingClientRect().width;
    motion.play(previous, children, { animate: initialized });
  }

  function update() {
    observer.disconnect();
    arrange();
    observer.observe(container);
    for (const child of container.children) observer.observe(child);
  }

  update();
  return {
    update,
    targets: motion.targets,
    reconcile(children, onRemoved = () => {}) {
      const previous = motion.capture(), active = document.activeElement;
      const next = new Set(children);
      for (const child of [...container.children]) {
        if (!next.has(child) && !child.dataset.cardExiting) motion.exit(child, previous.get(cardKey(child)), () => onRemoved(child));
      }
      let cursor = container.firstElementChild;
      for (const child of children) {
        if (child === cursor) cursor = cursor.nextElementSibling;
        else if (typeof container.moveBefore === 'function' && child.parentElement === container) container.moveBefore(child, cursor);
        else container.insertBefore(child, cursor);
      }
      arrange(previous);
      initialized = true;
      if (active?.isConnected && active !== document.activeElement) active.focus({ preventScroll: true });
      observer.disconnect(); observer.observe(container);
      for (const child of children) observer.observe(child);
    },
    destroy() {
      destroyed = true; observer.disconnect(); cancelAnimationFrame(frame); motion.destroy();
    }
  };
}
