export function createRingInteractionState({ pinnedId = null, defaultId = null, ids = [] } = {}) {
  const validPin = ids.includes(pinnedId) ? pinnedId : null;
  const validDefault = ids.includes(defaultId) ? defaultId : null;
  return { hoveredId: null, focusedId: null, pinnedId: validPin, defaultId: validDefault, activeId: validPin ?? validDefault };
}

export function transitionRingInteraction(state, { type, id = null }) {
  let next;
  if (type === 'hover') next = { ...state, hoveredId: id };
  else if (type === 'focus') next = { ...state, focusedId: id, hoveredId: null };
  else if (type === 'blur') next = { ...state, focusedId: state.focusedId === id ? null : state.focusedId };
  else if (type === 'pin') next = { ...state, hoveredId: null, focusedId: null, pinnedId: id };
  else if (type === 'clear') next = { ...state, hoveredId: null, focusedId: null, pinnedId: null };
  else return state;
  next.activeId = next.pinnedId ?? next.defaultId ?? next.hoveredId ?? next.focusedId;
  return next;
}

// Keep radial forgiveness around the band while using exact angular boundaries
// so moving directly into a neighboring segment changes its preview at once.
export function ringSegmentAtPoint(items, { x, y }) {
  const dx = x - 100, dy = y - 100;
  const radius = Math.hypot(dx, dy);
  if (radius < 54 || radius > 114) return null;
  const angle = (Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1;
  return items.find(item => angle >= item.start && angle < item.start + item.share)?.id ?? null;
}

export function createRingInteraction({ svg, detail, items, onActivate, interactionState = { pinnedId: null } }) {
  const events = new AbortController();
  const largest = items.reduce((largest, item) => !largest || item.share > largest.share ? item : largest, null);
  let state = createRingInteractionState({ pinnedId: interactionState.pinnedId, defaultId: largest?.id, ids: items.map(item => item.id) });
  const name = detail.querySelector('.ring-detail-name'), value = detail.querySelector('.ring-detail-value');
  const preview = document.createElement('div'); preview.className = 'dashboard-ring-preview'; preview.setAttribute('aria-hidden', 'true');
  const previewName = document.createElement('strong'), previewValue = document.createElement('span'); preview.append(previewName, previewValue);
  let hoverTimer = 0, pendingHover = null, pointer = null, pointerFocusing = false;

  function positionPreview(item) {
    const bounds = item.element.getBoundingClientRect();
    const anchor = pointer ?? { x: bounds.right, y: bounds.top };
    const box = preview.getBoundingClientRect();
    const x = anchor.x + 12;
    const y = anchor.y + box.height + 28 <= innerHeight ? anchor.y + 16 : anchor.y - box.height - 12;
    preview.style.left = `${Math.max(12, Math.min(x, innerWidth - box.width - 12))}px`;
    preview.style.top = `${Math.max(12, Math.min(y, innerHeight - box.height - 12))}px`;
  }

  function render() {
    interactionState.pinnedId = state.pinnedId;
    for (const item of items) {
      const previewing = item.id === (state.hoveredId ?? state.focusedId) && item.id !== state.activeId;
      item.element.dataset.active = String(item.id === state.activeId);
      item.element.dataset.preview = String(previewing);
      item.element.setAttribute('aria-pressed', String(item.id === state.activeId));
      item.setActive(item.id === state.activeId || previewing, item.id === state.activeId);
    }
    const active = items.find(item => item.id === state.activeId);
    detail.dataset.active = String(Boolean(active));
    name.textContent = active?.label ?? '';
    name.title = active?.label ?? '';
    value.textContent = active?.value ?? '';
    value.title = active?.value ?? '';
    if (active) detail.style.setProperty('--category-color', active.color);
    else detail.style.removeProperty('--category-color');
    const temporary = items.find(item => item.id === (state.hoveredId ?? state.focusedId) && item.id !== state.activeId);
    if (temporary) {
      previewName.textContent = temporary.label; previewValue.textContent = temporary.value;
      if (!preview.isConnected) document.body.append(preview);
      positionPreview(temporary);
    } else preview.remove();
  }
  function dispatch(event) {
    const next = transitionRingInteraction(state, event);
    const changed = ['activeId', 'pinnedId', 'hoveredId', 'focusedId'].some(key => next[key] !== state[key]);
    state = next;
    if (!changed) return;
    if (state.activeId !== null) onActivate();
    render();
  }
  svg.addEventListener('pointerdown', event => {
    pointerFocusing = true; pointer = { x: event.clientX, y: event.clientY };
  }, { signal: events.signal });
  svg.addEventListener('pointercancel', () => { pointerFocusing = false; }, { signal: events.signal });
  svg.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    pointer = { x: event.clientX, y: event.clientY };
    const id = ringSegmentAtPoint(items, point);
    if (id !== null) {
      clearTimeout(hoverTimer); pendingHover = id;
      dispatch({ type: 'hover', id });
    } else if (pendingHover !== null) {
      clearTimeout(hoverTimer); pendingHover = null;
      hoverTimer = setTimeout(() => dispatch({ type: 'hover' }), 100);
    }
    const temporary = items.find(item => item.id === state.hoveredId);
    if (preview.isConnected && temporary) positionPreview(temporary);
  }, { signal: events.signal });
  svg.addEventListener('pointerleave', () => {
    pointerFocusing = false;
    clearTimeout(hoverTimer); pendingHover = null;
    hoverTimer = setTimeout(() => dispatch({ type: 'hover' }), 120);
  }, { signal: events.signal });
  svg.addEventListener('click', event => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const target = event.detail === 0 ? items.find(item => item.element === event.target)
      : items.find(item => item.id === ringSegmentAtPoint(items, point));
    if (!target) { pointerFocusing = false; return; }
    clearTimeout(hoverTimer); pendingHover = null;
    pointerFocusing = event.detail !== 0;
    if (pointerFocusing) pointer = { x: event.clientX, y: event.clientY };
    dispatch({ type: 'pin', id: target.id }); target.element.focus({ preventScroll: true });
    pointerFocusing = false;
  }, { signal: events.signal });
  for (const [index, item] of items.entries()) {
    const segment = item.element;
    segment.addEventListener('focus', () => { clearTimeout(hoverTimer); pendingHover = null; if (!pointerFocusing) pointer = null; dispatch({ type: 'focus', id: item.id }); }, { signal: events.signal });
    segment.addEventListener('blur', () => dispatch({ type: 'blur', id: item.id }), { signal: events.signal });
    segment.addEventListener('keydown', event => {
      pointerFocusing = false; pointer = null;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clearTimeout(hoverTimer); pendingHover = null;
        if (!event.repeat) dispatch({ type: 'pin', id: item.id });
      } else if (event.key === 'Escape') {
        if (state.activeId !== null) {
          clearTimeout(hoverTimer); pendingHover = null;
          event.preventDefault(); event.stopPropagation(); dispatch({ type: 'clear' });
        }
      } else {
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % items.length
            : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + items.length - 1) % items.length : null;
        if (target !== null) { event.preventDefault(); items[target].element.focus({ preventScroll: true }); }
      }
    }, { signal: events.signal });
  }
  if (state.pinnedId !== null) onActivate();
  render();
  return { isInteracting() { return state.pinnedId !== null || state.hoveredId !== null || state.focusedId !== null; }, destroy() { events.abort(); clearTimeout(hoverTimer); preview.remove(); } };
}
