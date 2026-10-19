import { MAX_UI_MOTION_MS, getCustomPropertyDurationMs, prefersReducedMotion } from '../../shared/motion.js';

const CENTER = 100;
const INNER_RADIUS = 68;
const OUTER_RADIUS = 96;
// Preserve the visible lift while giving both neighboring edges that clearance.
const LIFT = 7.36;
const PINNED_EXTRA_THICKNESS = 6;
const TAU = Math.PI * 2;

export function createRingRevealPath(progress) {
  if (progress <= 0) return '';
  if (progress >= 1) return 'M -50 -50 H 250 V 250 H -50 Z';
  const angle = progress * TAU, radius = 150;
  const x = CENTER + radius * Math.cos(angle), y = CENTER + radius * Math.sin(angle);
  // A filled sector avoids the stray end cap of a dashed circular mask.
  return `M ${CENTER} ${CENTER} L 250 100 A ${radius} ${radius} 0 ${progress > .5 ? 1 : 0} 1 ${x} ${y} Z`;
}

export function createRingShape(start, share, progress = 0, pinnedProgress = 0) {
  const active = Math.max(0, Math.min(1, progress));
  const pinned = Math.max(0, Math.min(active, pinnedProgress));
  const sweep = Math.min(1, share) * TAU;
  const full = share >= 1;
  const sine = Math.sin(sweep / 2) * .9;
  const innerBase = INNER_RADIUS - PINNED_EXTRA_THICKNESS * pinned;
  // Very small slices need proportionally smaller lift/clearance to stay visible.
  const limit = sweep < Math.PI ? INNER_RADIUS * sine / (1 - sine) : LIFT;
  const lift = Math.min(LIFT, limit) * active;
  const gap = full ? 0 : lift;
  const innerRadius = innerBase + lift, outerRadius = OUTER_RADIUS + lift;
  const first = start * TAU, last = first + sweep;
  const outerTrim = Math.asin(gap / outerRadius), innerTrim = Math.asin(gap / innerRadius);
  const point = (radius, angle) => [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
  const outerStart = point(outerRadius, first + outerTrim), outerEnd = point(outerRadius, last - outerTrim);
  const innerStart = point(innerRadius, first + innerTrim), innerEnd = point(innerRadius, last - innerTrim);
  const coordinates = point => point.map(value => Number(value.toFixed(7))).join(' ');
  const arc = (radius, angle, clockwise, end) => `A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} ${clockwise} ${coordinates(end)}`;
  const path = full
    ? `M ${coordinates(outerStart)} ${arc(outerRadius, Math.PI, 1, point(outerRadius, first + Math.PI))} ${arc(outerRadius, Math.PI, 1, outerEnd)} L ${coordinates(innerEnd)} ${arc(innerRadius, Math.PI, 0, point(innerRadius, first + Math.PI))} ${arc(innerRadius, Math.PI, 0, innerStart)} Z`
    : `M ${coordinates(outerStart)} ${arc(outerRadius, sweep - 2 * outerTrim, 1, outerEnd)} L ${coordinates(innerEnd)} ${arc(innerRadius, sweep - 2 * innerTrim, 0, innerStart)} Z`;
  return { path, lift, gap, innerRadius, outerRadius, outerStart, outerEnd, innerStart, innerEnd };
}

export function createRingShapeMotion(element, start, share) {
  let progress = 0, pinnedProgress = 0, target = 0, pinnedTarget = 0, frame = 0;
  function draw(value, pinnedValue) {
    progress = value; pinnedProgress = pinnedValue;
    const shape = createRingShape(start, share, value, pinnedValue);
    element.setAttribute('d', shape.path);
    element.dataset.hitRadius = String((shape.innerRadius + shape.outerRadius) / 2);
  }
  draw(0, 0);
  return {
    setActive(active, pinned = false) {
      const next = active ? 1 : 0, nextPinned = active && pinned ? 1 : 0;
      if (next === target && nextPinned === pinnedTarget) return;
      target = next; pinnedTarget = nextPinned; cancelAnimationFrame(frame);
      if (!element.isConnected || document.hidden || prefersReducedMotion()) { draw(next, nextPinned); return; }
      const from = progress, fromPinned = pinnedProgress, started = performance.now();
      const duration = getCustomPropertyDurationMs(element, '--motion-fast', MAX_UI_MOTION_MS);
      function tick(time) {
        if (!element.isConnected || document.hidden || prefersReducedMotion()) { draw(next, nextPinned); return; }
        const elapsed = Math.min(1, Math.max(0, (time - started) / duration));
        const eased = 1 - (1 - elapsed) ** 3;
        draw(from + (next - from) * eased, fromPinned + (nextPinned - fromPinned) * eased);
        if (elapsed < 1) frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    },
    destroy() { cancelAnimationFrame(frame); }
  };
}
