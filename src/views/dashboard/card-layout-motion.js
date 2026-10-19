import { MAX_UI_MOTION_MS, getCustomPropertyDurationMs, prefersReducedMotion } from '../../shared/motion.js';
import { cardContentPoint, cardViewportBounds, cardViewportPoint } from './card-geometry.js';

export const cardKey = element => element.dataset?.cardId || element.id || element;

// Coordinates include the scroll offset, so scrolling cannot leave a stale
// starting position. Retarget the currently visible motion before each layout.
export function createCardLayoutMotion(container, { onSettled = () => {} } = {}) {
  let positions = new Map();
  const running = new Map();
  const exits = new Set();
  const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  function bounds(element) {
    const box = cardViewportBounds(element);
    return { ...box, ...cardContentPoint(container, box), angle: 0 };
  }
  function cancel() {
    for (const { animation, rock, fade } of running.values()) { animation.cancel(); rock?.cancel(); fade?.cancel(); }
    running.clear();
  }
  function reduce(event) { if (event.matches) { cancel(); for (const finish of [...exits]) finish(); onSettled(); } }
  query?.addEventListener('change', reduce);

  return {
    targets() { return [...positions].map(([key, box]) => ({ ...box, element: [...container.children].find(element => !element.dataset.cardExiting && cardKey(element) === key) })).filter(entry => entry.element); },
    isAnimating(element) { return running.has(cardKey(element)); },
    capture() {
      const previous = new Map();
      for (const [key, saved] of positions) {
        const motion = running.get(key);
        if (!motion) { previous.set(key, saved); continue; }
        const progress = motion.animation.effect.getComputedTiming().progress ?? 0;
        previous.set(key, { ...Object.fromEntries(['x', 'y', 'width', 'height'].map(property =>
          [property, motion.from[property] + (motion.to[property] - motion.from[property]) * progress])),
          angle: parseFloat(getComputedStyle(motion.element).rotate) || 0 });
      }
      cancel();
      return previous;
    },
    play(previous, elements = [...container.children].filter(element => !element.dataset?.cardExiting), { animate = true } = {}) {
      positions = new Map(elements.map(element => [cardKey(element), bounds(element)]));
      if (!animate || !container.isConnected || document.hidden || prefersReducedMotion()) return;
      const duration = getCustomPropertyDurationMs(container, '--motion-layout', MAX_UI_MOTION_MS);
      for (const element of elements) {
        const key = cardKey(element), to = positions.get(key), saved = previous.get(key);
        const entering = !saved?.width;
        const from = entering ? { ...to, y: to.y + 10, angle: -1 } : saved;
        if (!from.width || !from.height || !to.width || !to.height || typeof element.animate !== 'function') continue;
        if (['x', 'y', 'width', 'height'].every(key => Math.abs(from[key] - to[key]) < .5)) continue;
        // Animate actual dimensions so lettering and ring strokes never scale.
        const animation = element.animate([
          { translate: `${from.x - to.x}px ${from.y - to.y}px`, width: `${from.width}px`, height: `${from.height}px` },
          { translate: '0px 0px', width: `${to.width}px`, height: `${to.height}px` }
        ], { duration, easing: 'cubic-bezier(0.2, 0, 0.2, 1)', fill: 'both' });
        const tilt = Math.max(-2, Math.min(2, (to.x - from.x) / 150 + (to.y - from.y) / 600));
        const rock = element.animate([{ rotate: `${from.angle || 0}deg` }, { rotate: `${tilt}deg`, offset: .4 }, { rotate: '0deg' }],
          { duration, easing: 'ease-out', fill: 'both' });
        const fade = entering ? element.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-out' }) : null;
        running.set(key, { element, animation, rock, fade, from, to });
        animation.finished.then(() => {
          if (running.get(key)?.animation !== animation) return;
          running.delete(key); animation.cancel(); rock.cancel(); fade?.cancel(); onSettled();
        }, () => {});
      }
    },
    exit(element, from, onRemoved = () => {}) {
      let animation, finished = false;
      const finish = () => { if (finished) return; finished = true; exits.delete(finish); animation?.cancel(); element.remove(); onRemoved(); };
      if (!from?.width || prefersReducedMotion() || document.hidden) { finish(); return; }
      const viewport = cardViewportPoint(container, from);
      element.dataset.cardExiting = 'true'; element.inert = true; element.setAttribute('aria-hidden', 'true');
      Object.assign(element.style, { position: 'fixed', left: `${viewport.x}px`, top: `${viewport.y}px`,
        width: `${from.width}px`, height: `${from.height}px`, margin: '0', pointerEvents: 'none', zIndex: '4' });
      animation = element.animate([{ opacity: 1, translate: '0px 0px', rotate: `${from.angle || 0}deg` },
        { opacity: 0, translate: '0px -10px', rotate: '-1.5deg' }],
      { duration: getCustomPropertyDurationMs(container, '--motion-fast', MAX_UI_MOTION_MS), easing: 'ease-in', fill: 'both' });
      exits.add(finish); animation.finished.then(finish, finish);
    },
    destroy() { cancel(); for (const finish of [...exits]) finish(); positions.clear(); query?.removeEventListener('change', reduce); }
  };
}
