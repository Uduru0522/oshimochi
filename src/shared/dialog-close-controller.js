import {
  MAX_UI_MOTION_MS,
  getAnimationDurationMs,
  prefersReducedMotion
} from "./motion.js";

export function createDialogCloseController(dialog, {
  canClose = () => true,
  onClosed = () => {},
  onCloseRequested = () => {}
} = {}) {
  let closeTimer = 0;
  let destroyed = false;
  let isClosing = false;
  let pendingAction = null;

  function clearCloseAnimation() {
    globalThis.clearTimeout(closeTimer);
    closeTimer = 0;
    dialog.removeEventListener("animationend", handleAnimationEnd);
    delete dialog.dataset.closing;
  }

  function finishClose() {
    if (!isClosing) {
      return;
    }

    const action = pendingAction;
    pendingAction = null;
    clearCloseAnimation();
    isClosing = false;

    if (dialog.open) {
      dialog.close();
    }

    try {
      onClosed();
    } finally {
      action?.();
    }
  }

  function handleAnimationEnd(event) {
    if (event.target === dialog) {
      finishClose();
    }
  }

  function requestClose({ afterClose = null, force = false } = {}) {
    if (
      destroyed ||
      isClosing ||
      !dialog.open ||
      !canClose({ force })
    ) {
      return false;
    }

    pendingAction = afterClose;
    onCloseRequested();
    isClosing = true;

    if (prefersReducedMotion()) {
      finishClose();
      return true;
    }

    dialog.dataset.closing = "true";
    dialog.addEventListener("animationend", handleAnimationEnd);
    closeTimer = globalThis.setTimeout(
      finishClose,
      getAnimationDurationMs(dialog, MAX_UI_MOTION_MS)
    );
    return true;
  }

  function destroy() {
    destroyed = true;
    pendingAction = null;
    clearCloseAnimation();
    isClosing = false;

    if (dialog.open) {
      dialog.close();
    }
  }

  return Object.freeze({ destroy, requestClose });
}
