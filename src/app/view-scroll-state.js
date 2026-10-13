const COMPACT_ENTER_SCROLL_TOP = 96;
const COMPACT_EXIT_SCROLL_TOP = 32;
const COMPACT_ENTER_SCROLL_BOTTOM = COMPACT_ENTER_SCROLL_TOP;

export function getNextViewScrollState({ isCompact, maxScrollTop, scrollTop }) {
  if (isCompact) {
    return scrollTop >= COMPACT_EXIT_SCROLL_TOP;
  }

  const distanceToBottom = maxScrollTop - scrollTop;
  const canScrollEnough =
    maxScrollTop > COMPACT_ENTER_SCROLL_TOP + COMPACT_ENTER_SCROLL_BOTTOM;

  return (
    canScrollEnough &&
    scrollTop > COMPACT_ENTER_SCROLL_TOP &&
    distanceToBottom > COMPACT_ENTER_SCROLL_BOTTOM
  );
}

export function bindViewScrollState(viewPanel) {
  const workspace = viewPanel.closest(".workspace");

  if (!workspace) {
    return;
  }

  let isCompact = false;

  function update() {
    const maxScrollTop = Math.max(0, viewPanel.scrollHeight - viewPanel.clientHeight);
    isCompact = getNextViewScrollState({
      isCompact,
      maxScrollTop,
      scrollTop: viewPanel.scrollTop
    });
    workspace.toggleAttribute("data-view-scrolled", isCompact);
  }

  viewPanel.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}
