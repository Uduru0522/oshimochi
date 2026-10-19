import { MAX_UI_MOTION_MS, getCustomPropertyDurationMs, prefersReducedMotion } from '../../shared/motion.js';
import { translate as t } from '../../localization/translate.js';
import { cardContentPoint, cardViewportBounds, cardViewportPoint } from './card-geometry.js';

export function reorderVisibleCards(cards, ids) {
  const visible = cards.filter(card => card.type !== 'recent-items' || card.visible);
  if (ids.length !== visible.length || new Set(ids).size !== ids.length || ids.some(id => !visible.some(card => card.id === id))) {
    throw new TypeError('Card order must contain every visible card exactly once.');
  }
  const byId = new Map(visible.map(card => [card.id, card]));
  let index = 0;
  return cards.map(card => card.type === 'recent-items' && !card.visible ? card : byId.get(ids[index++]));
}

export function moveCard(ids, id, index) {
  const next = ids.filter(value => value !== id);
  next.splice(Math.max(0, Math.min(next.length, index)), 0, id);
  return next;
}

export function createCardArrangement({ root, container, bar, status, saveButton, cancelButton, layout, getIds, onSave, onError }) {
  const events = new AbortController(), signal = events.signal;
  const dragLayer = document.createElement('div'); dragLayer.className = 'dashboard-view dashboard-drag-layer'; dragLayer.setAttribute('aria-hidden', 'true'); dragLayer.inert = true;
  let open = false, saving = false, original = [], draft = [], returnFocus = null, drag = null, held = null, frame = 0, settling = null;
  const cards = () => [...container.children].filter(card => card.dataset.cardId && !card.dataset.cardExiting);
  function sync() {
    root.dataset.arranging = String(open); container.dataset.arranging = String(open);
    bar.hidden = !open;
    for (const card of cards()) {
      card.querySelector('.card-drag-handle').hidden = !open;
      card.querySelector('.card-drag-handle').setAttribute('aria-pressed', String(held?.id === card.dataset.cardId));
      card.querySelector('.card-options').inert = open;
      for (const content of card.querySelectorAll('.card-readout, .recent-items')) content.inert = open;
    }
    const add = container.querySelector('.add-card-tile'); if (add) add.hidden = open;
  }
  function apply(ids) {
    draft = ids;
    const byId = new Map(cards().map(card => [card.dataset.cardId, card]));
    const rest = [...container.children].filter(card => !card.dataset.cardId && !card.dataset.cardExiting);
    layout.reconcile([...ids.map(id => byId.get(id)).filter(Boolean), ...rest]);
  }
  function announce(id) {
    const card = cards().find(card => card.dataset.cardId === id);
    status.textContent = t('{title}, position {position} of {count}.', { title: card?.getAttribute('aria-label') ?? '', position: draft.indexOf(id) + 1, count: draft.length });
  }
  function finishSettling() {
    if (!settling) return;
    const previous = settling; settling = null;
    previous.animation?.cancel(); previous.ghost.remove(); dragLayer.remove(); delete previous.card.dataset.dragging;
    if (open && !saving) previous.card.querySelector('.card-drag-handle')?.focus({ preventScroll: true });
  }
  function stopDrag(cancelled = false) {
    if (frame && drag?.ghost && !cancelled) { cancelAnimationFrame(frame); updateDrag(); }
    cancelAnimationFrame(frame); frame = 0;
    if (!drag) return;
    const previous = drag; drag = null;
    if (container.hasPointerCapture(previous.pointerId)) container.releasePointerCapture(previous.pointerId);
    if (cancelled) apply(previous.order);
    if (!previous.ghost) return;
    const target = layout.targets().find(entry => entry.element === previous.card);
    if (cancelled || !target || prefersReducedMotion()) {
      previous.ghost.remove(); dragLayer.remove(); delete previous.card.dataset.dragging;
      previous.card.querySelector('.card-drag-handle')?.focus({ preventScroll: true }); return;
    }
    const viewport = cardViewportPoint(container, target);
    const animation = previous.ghost.animate([
      { translate: previous.ghost.style.translate, rotate: previous.ghost.style.rotate, width: previous.ghost.style.width, height: previous.ghost.style.height },
      { translate: `${viewport.x - previous.left}px ${viewport.y - previous.top}px`, rotate: '0deg', width: `${target.width}px`, height: `${target.height}px` }
    ], { duration: getCustomPropertyDurationMs(container, '--motion-layout', MAX_UI_MOTION_MS), easing: 'cubic-bezier(0.2, 0, 0.2, 1)', fill: 'both' });
    settling = { card: previous.card, ghost: previous.ghost, animation };
    animation.finished.then(finishSettling, () => {});
  }
  function close(cancelled = false) {
    stopDrag(cancelled); finishSettling(); held = null;
    if (cancelled) apply(original);
    open = false; sync(); layout.update();
    returnFocus?.isConnected && returnFocus.focus({ preventScroll: true });
  }
  function updateDrag() {
    frame = 0;
    if (!drag?.ghost) return;
    const dx = drag.x - drag.startX, dy = drag.y - drag.startY;
    drag.ghost.style.translate = `${dx}px ${dy}px`;
    drag.ghost.style.rotate = prefersReducedMotion() ? '0deg' : `${Math.max(-3, Math.min(3, (drag.x - drag.lastX) * .15))}deg`;
    drag.lastX = drag.x;
    const slots = layout.targets().filter(entry => entry.element.dataset.cardId);
    const { x, y } = cardContentPoint(container, drag);
    let best = null, distance = Infinity;
    for (const slot of slots) {
      const score = Math.hypot(Math.max(slot.x - x, 0, x - slot.x - slot.width), Math.max(slot.y - y, 0, y - slot.y - slot.height));
      if (score < distance) { best = slot; distance = score; }
    }
    const moved = !drag.placement || Math.hypot(x - drag.placement.x, y - drag.placement.y) >= 8;
    if (moved && best && best.element.dataset.cardId !== drag.id) {
      drag.placement = { x, y };
      apply(moveCard(draft, drag.id, draft.indexOf(best.element.dataset.cardId))); announce(drag.id);
    }
    const scrollport = container.closest('.view-panel');
    if (scrollport) {
      const bounds = scrollport.getBoundingClientRect();
      const speed = drag.y < bounds.top + 60 ? -Math.min(16, (bounds.top + 60 - drag.y) / 4)
        : drag.y > bounds.bottom - 60 ? Math.min(16, (drag.y - bounds.bottom + 60) / 4) : 0;
      if (speed) { scrollport.scrollTop += speed; frame = requestAnimationFrame(updateDrag); }
    }
  }
  container.addEventListener('pointerdown', event => {
    if (!open || saving || event.button !== 0) return;
    const card = event.target.closest('.summary-card:not([data-card-exiting])');
    if (!card || (event.target.closest('button, summary, a, input') && !event.target.closest('.card-drag-handle'))) return;
    event.preventDefault(); finishSettling();
    card.querySelector('.card-drag-handle').focus({ preventScroll: true });
    const box = cardViewportBounds(card);
    drag = { card, id: card.dataset.cardId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      left: box.x, top: box.y, width: box.width, height: box.height,
      x: event.clientX, y: event.clientY, lastX: event.clientX, order: [...draft], ghost: null };
    container.setPointerCapture(event.pointerId);
  }, { signal });
  container.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.ghost && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 6) {
      const ghost = document.createElement('article'); ghost.className = `${drag.card.className} dashboard-drag-ghost`;
      ghost.dataset.display = drag.card.dataset.display ?? '';
      const heading = drag.card.querySelector('h3').cloneNode(true), grip = document.createElement('span'); grip.textContent = '⠿';
      const header = document.createElement('div'); header.className = 'card-heading'; header.append(grip, heading);
      const placeholder = document.createElement('div'); placeholder.className = 'dashboard-drag-placeholder';
      for (let index = 0; index < 3; index++) placeholder.append(document.createElement('span'));
      ghost.append(header, placeholder);
      Object.assign(ghost.style, { position: 'fixed', left: `${drag.left}px`, top: `${drag.top}px`, width: `${drag.width}px`, height: `${drag.height}px`, margin: '0', pointerEvents: 'none' });
      drag.ghost = ghost; drag.card.dataset.dragging = 'true'; dragLayer.append(ghost);
      if (!dragLayer.isConnected) document.body.append(dragLayer);
    }
    if (drag.ghost && !frame) frame = requestAnimationFrame(updateDrag);
  }, { signal });
  container.addEventListener('pointerup', () => stopDrag(), { signal });
  container.addEventListener('pointercancel', () => stopDrag(true), { signal });
  container.addEventListener('keydown', event => {
    if (!open || saving || !event.target.matches('.card-drag-handle')) return;
    const card = event.target.closest('.summary-card'), id = card.dataset.cardId, index = draft.indexOf(id);
    const columns = Number(getComputedStyle(container).getPropertyValue('--card-columns')) || 1;
    const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key];
    if (offset) {
      event.preventDefault(); apply(moveCard(draft, id, Math.max(0, Math.min(draft.length - 1, index + offset)))); announce(id);
      event.target.focus({ preventScroll: true });
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault(); held = held ? null : { id, order: [...draft] };
      sync(); announce(id);
    }
  }, { signal });
  document.addEventListener('keydown', event => {
    if (!open || saving || event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation();
    if (drag) stopDrag(true);
    else if (held) { apply(held.order); held = null; cards().forEach(card => card.querySelector('.card-drag-handle').setAttribute('aria-pressed', 'false')); }
    else close(true);
  }, { signal, capture: true });
  saveButton.addEventListener('click', async () => {
    if (saving) return;
    stopDrag(); finishSettling(); saving = true; saveButton.disabled = cancelButton.disabled = true;
    try { await onSave(draft); close(); }
    catch (error) { onError(error); }
    finally { saving = false; saveButton.disabled = cancelButton.disabled = false; }
  }, { signal });
  cancelButton.addEventListener('click', () => { if (!saving) close(true); }, { signal });
  return {
    get isOpen() { return open; },
    open(button) {
      if (open) return;
      returnFocus = button; original = getIds(); draft = [...original]; open = true;
      container.querySelectorAll('.card-options[open]').forEach(menu => menu.open = false);
      sync(); layout.update(); cards()[0]?.querySelector('.card-drag-handle').focus({ preventScroll: true });
    },
    destroy() { events.abort(); stopDrag(true); finishSettling(); cancelAnimationFrame(frame); dragLayer.remove(); }
  };
}
