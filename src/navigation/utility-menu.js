function isMenuAction(target) {
  return Boolean(target?.closest?.("button, a"));
}

export function bindUtilityMenu({
  documentTarget = document,
  menu,
  toggle,
  windowTarget = window
}) {
  function isOpen() {
    return menu.dataset.open === "true";
  }

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));

    if (open) {
      menu.dataset.open = "true";
      return;
    }

    delete menu.dataset.open;
  }

  function close({ restoreFocus = false } = {}) {
    if (!isOpen()) {
      return;
    }

    setOpen(false);

    if (restoreFocus) {
      toggle.focus();
    }
  }

  function handleToggleClick() {
    setOpen(!isOpen());
  }

  function handleDocumentPointerDown(event) {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      close();
    }
  }

  function handleDocumentKeyDown(event) {
    if (event.key !== "Escape" || !isOpen()) {
      return;
    }

    event.preventDefault();
    close({ restoreFocus: true });
  }

  function handleMenuClick(event) {
    if (isMenuAction(event.target)) {
      close();
    }
  }

  setOpen(false);
  toggle.addEventListener("click", handleToggleClick);
  menu.addEventListener("click", handleMenuClick);
  documentTarget.addEventListener("pointerdown", handleDocumentPointerDown);
  documentTarget.addEventListener("keydown", handleDocumentKeyDown);
  windowTarget.addEventListener("resize", close);

  return {
    close,
    destroy() {
      toggle.removeEventListener("click", handleToggleClick);
      menu.removeEventListener("click", handleMenuClick);
      documentTarget.removeEventListener("pointerdown", handleDocumentPointerDown);
      documentTarget.removeEventListener("keydown", handleDocumentKeyDown);
      windowTarget.removeEventListener("resize", close);
      setOpen(false);
    }
  };
}
