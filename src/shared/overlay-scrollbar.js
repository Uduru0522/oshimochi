let sequence = 0;

export function createOverlayScrollbar(element, { label } = {}) {
  const events = new AbortController(), signal = events.signal;
  const frame = document.createElement('div'); frame.className = 'overlay-scroll-frame';
  const rail = document.createElement('div'); rail.className = 'overlay-scrollbar'; rail.hidden = true;
  const thumb = document.createElement('div'); thumb.className = 'overlay-scroll-thumb'; rail.append(thumb);
  const generatedId = !element.id;
  if (generatedId) element.id = `overlay-scrollport-${++sequence}`;
  rail.tabIndex = 0; rail.setAttribute('role', 'scrollbar'); rail.setAttribute('aria-orientation', 'vertical');
  rail.setAttribute('aria-controls', element.id); rail.setAttribute('aria-label', label);
  rail.setAttribute('aria-valuemin', '0');
  element.before(frame); frame.append(element, rail); element.classList.add('overlay-scroll-content');
  let timer = 0, pending = 0, drag = null, limit = 0, travel = 0, destroyed = false;

  function visible() {
    frame.dataset.scrollbarVisible = String(Boolean(element.dataset.scrolling || element.dataset.scrollbarEdge || drag || document.activeElement === rail));
  }
  function update() {
    cancelAnimationFrame(pending);
    pending = 0;
    if (destroyed) return;
    limit = Math.max(0, element.scrollHeight - element.clientHeight);
    rail.hidden = !element.clientHeight || limit <= 1;
    const height = Math.min(rail.clientHeight, Math.max(28, rail.clientHeight * element.clientHeight / Math.max(1, element.scrollHeight)));
    travel = Math.max(0, rail.clientHeight - height);
    thumb.style.height = `${height}px`;
    thumb.style.translate = `0 ${limit ? Math.max(0, Math.min(1, element.scrollTop / limit)) * travel : 0}px`;
    rail.setAttribute('aria-valuemax', String(Math.round(limit))); rail.setAttribute('aria-valuenow', String(Math.round(element.scrollTop)));
    visible();
  }
  function schedule() { if (!destroyed && !pending) pending = requestAnimationFrame(update); }
  const observer = new ResizeObserver(schedule);
  function observe() {
    observer.disconnect(); observer.observe(element);
    for (const child of element.children) observer.observe(child);
    schedule();
  }
  const mutations = new MutationObserver(observe); mutations.observe(element, { childList: true });
  observe();
  element.addEventListener('scroll', () => {
    clearTimeout(timer); element.dataset.scrolling = 'true'; update();
    timer = setTimeout(() => { delete element.dataset.scrolling; visible(); }, 800);
  }, { signal, passive: true });
  element.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' && event.clientX >= element.getBoundingClientRect().right - 16) element.dataset.scrollbarEdge = 'true';
    else delete element.dataset.scrollbarEdge;
    visible();
  }, { signal, passive: true });
  const leave = () => { delete element.dataset.scrollbarEdge; visible(); };
  element.addEventListener('pointerleave', leave, { signal });
  rail.addEventListener('pointerenter', () => { element.dataset.scrollbarEdge = 'true'; visible(); }, { signal });
  rail.addEventListener('pointerleave', leave, { signal });
  rail.addEventListener('focus', visible, { signal }); rail.addEventListener('blur', visible, { signal });
  function move(event) {
    if (!drag || !travel) return;
    element.scrollTop = (event.clientY - rail.getBoundingClientRect().top - drag.grab) / travel * limit;
    update();
  }
  rail.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); rail.focus({ preventScroll: true }); update();
    drag = { id: event.pointerId, grab: event.target === thumb ? event.clientY - thumb.getBoundingClientRect().top : thumb.offsetHeight / 2 };
    rail.setPointerCapture(event.pointerId); move(event); visible();
  }, { signal });
  rail.addEventListener('pointermove', move, { signal });
  function stop() { const previous = drag; drag = null; if (previous && rail.hasPointerCapture(previous.id)) rail.releasePointerCapture(previous.id); visible(); }
  rail.addEventListener('pointerup', stop, { signal }); rail.addEventListener('pointercancel', stop, { signal });
  rail.addEventListener('lostpointercapture', stop, { signal });
  rail.addEventListener('keydown', event => {
    const values = { ArrowDown: element.scrollTop + 40, ArrowUp: element.scrollTop - 40,
      PageDown: element.scrollTop + element.clientHeight * .9, PageUp: element.scrollTop - element.clientHeight * .9, Home: 0, End: limit };
    if (values[event.key] === undefined) return;
    event.preventDefault(); element.scrollTop = values[event.key]; update();
  }, { signal });
  rail.addEventListener('wheel', event => { event.preventDefault(); element.scrollTop += event.deltaY; update(); }, { signal, passive: false });
  return { refresh: schedule, destroy() {
    if (destroyed) return;
    destroyed = true;
    stop(); events.abort(); clearTimeout(timer); cancelAnimationFrame(pending); observer.disconnect(); mutations.disconnect();
    delete element.dataset.scrolling; delete element.dataset.scrollbarEdge;
    element.classList.remove('overlay-scroll-content'); if (generatedId) element.removeAttribute('id');
    frame.before(element); frame.remove();
  } };
}
