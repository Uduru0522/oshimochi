import { MAX_UI_MOTION_MS, prefersReducedMotion } from '../../shared/motion.js';

const active = new WeakMap();
// Data visualization is deliberately slower than buttons, dialogs, and routing.
export const DASHBOARD_REVEAL_MS = 600;

export function playReadoutMotion({ element, numberElement, value, formatNumber, reveal = () => {}, enabled = true, integer = false, duration = MAX_UI_MOTION_MS }) {
  active.get(element)?.();
  const finalText = formatNumber(value);
  const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const originalWidth = numberElement.style.minWidth;
  let frame = 0, observer = null, started = null, scheduled = false, finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    numberElement.textContent = finalText;
    numberElement.style.minWidth = originalWidth;
    reveal(1);
    element.dataset.motion = 'done';
    query?.removeEventListener('change', onPreferenceChange);
    active.delete(element);
  }
  function onPreferenceChange(event) { if (event.matches) finish(); }
  if (!enabled || prefersReducedMotion() || document.hidden || value === null || !Number.isFinite(value) || value === 0 || !element.isConnected) {
    finish(); return () => {};
  }
  numberElement.style.minWidth = `${numberElement.getBoundingClientRect().width}px`;
  // IntersectionObserver runs after paint. Prepare the empty sweep now so a
  // newly mounted chart cannot flash its complete shape before the reveal.
  reveal(0);
  element.dataset.motion = 'waiting';
  active.set(element, finish);
  query?.addEventListener('change', onPreferenceChange);
  function tick(timestamp) {
    if (!element.isConnected) { finish(); return; }
    started ??= timestamp;
    element.dataset.motion = 'running';
    const progress = Math.min(1, Math.max(0, (timestamp - started) / duration));
    if (progress === 1) { finish(); return; }
    const eased = progress * progress * (3 - 2 * progress);
    const current = value * (1 - (1 - progress) ** 3);
    numberElement.textContent = formatNumber(integer ? Math.round(current) : current);
    reveal(eased);
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (scheduled || finished) return;
    scheduled = true;
    observer?.disconnect();
    // Keep the correct accessible value while offscreen (including editor
    // previews). Reset only when the visible reveal is actually about to run.
    numberElement.textContent = formatNumber(0); reveal(0);
    element.dataset.motion = 'running';
    // Two frames let the mounted chart paint at zero before its first tick.
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(tick); });
  }
  if (globalThis.IntersectionObserver) {
    observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) start(); });
    observer.observe(element);
  } else start();
  return finish;
}
