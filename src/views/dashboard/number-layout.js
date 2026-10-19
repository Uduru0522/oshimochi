// Reserve the final text's actual footprint, including with wider system fonts.
// Measure outside normal flow so counting and fitting cannot move the unit.
export function createNumberLayout(display, number, finalText) {
  let width = 0, destroyed = false;
  function refresh() {
    if (destroyed || !display.isConnected || !display.clientWidth) return;
    width = display.clientWidth;
    const measure = number.cloneNode(false);
    measure.removeAttribute('style'); measure.setAttribute('aria-hidden', 'true');
    measure.textContent = finalText;
    Object.assign(measure.style, { position: 'absolute', visibility: 'hidden', width: 'max-content', maxWidth: 'none' });
    display.append(measure);
    try {
      const base = parseFloat(getComputedStyle(measure).fontSize);
      const natural = measure.getBoundingClientRect().width;
      const size = natural > width ? base * (width - 1) / natural : base;
      measure.style.fontSize = `${size}px`;
      number.style.fontSize = `${size}px`;
      number.style.width = `${Math.min(width, measure.getBoundingClientRect().width)}px`;
    } finally { measure.remove(); }
  }
  const observer = new ResizeObserver(() => { if (display.clientWidth !== width) refresh(); });
  observer.observe(display);
  document.fonts?.addEventListener('loadingdone', refresh);
  return { refresh, destroy() {
    destroyed = true; observer.disconnect(); document.fonts?.removeEventListener('loadingdone', refresh);
  } };
}
