import { createElement } from "./dom.js";
import { createIcon } from "./icons.js";
import {
  MAX_UI_MOTION_MS,
  getAnimationDurationMs,
  prefersReducedMotion
} from "./motion.js";

let menuIdSequence = 0;

export function createSelectMenu({ ariaLabel, emptyLabel = "Select..." }) {
  const menuId = `selectMenu${++menuIdSequence}`;
  const element = createElement("div", { className: "select-menu" });
  const trigger = createElement("button", {
    attributes: {
      "aria-controls": menuId,
      "aria-expanded": "false",
      "aria-haspopup": "listbox",
      "aria-label": ariaLabel,
      type: "button"
    },
    className: "select-menu-trigger"
  });
  const triggerLabel = createElement("span", { className: "select-menu-value" });
  const listbox = createElement("div", {
    attributes: { "aria-label": ariaLabel, id: menuId, role: "listbox" },
    className: "select-menu-list"
  });
  let destroyed = false;
  let closeTimer = 0;
  let pendingFocusRestore = false;
  let options = [];
  let selectedValue = "";

  trigger.append(triggerLabel, createIcon("moveDown"));
  element.append(trigger, listbox);

  function getSelectedIndex() {
    return Math.max(0, options.findIndex(({ value }) => value === selectedValue));
  }

  function updateSelection() {
    const selectedIndex = getSelectedIndex();
    const selectedOption = options[selectedIndex];
    selectedValue = selectedOption?.value ?? "";
    triggerLabel.textContent = selectedOption?.label ?? emptyLabel;
    [...listbox.children].forEach((optionElement, index) => {
      optionElement.dataset.selected = String(index === selectedIndex);
      optionElement.setAttribute("aria-selected", String(index === selectedIndex));
    });
  }

  function finishClose() {
    globalThis.clearTimeout(closeTimer);
    listbox.removeEventListener("animationend", handleCloseAnimationEnd);
    delete element.dataset.closing;
    delete element.dataset.open;
    trigger.setAttribute("aria-expanded", "false");
    if (pendingFocusRestore) {
      trigger.focus();
    }
    pendingFocusRestore = false;
  }

  function handleCloseAnimationEnd(event) {
    if (event.target === listbox) {
      finishClose();
    }
  }

  function close({ restoreFocus = false } = {}) {
    if (element.dataset.open !== "true") {
      return;
    }
    pendingFocusRestore ||= restoreFocus;
    if (prefersReducedMotion()) {
      finishClose();
      return;
    }
    if (element.dataset.closing === "true") {
      return;
    }
    element.dataset.closing = "true";
    listbox.addEventListener("animationend", handleCloseAnimationEnd);
    closeTimer = globalThis.setTimeout(
      finishClose,
      getAnimationDurationMs(listbox, MAX_UI_MOTION_MS)
    );
  }

  function focusOption(index) {
    const optionElements = [...listbox.children];
    optionElements[Math.max(0, Math.min(index, optionElements.length - 1))]?.focus();
  }

  function open({ focusSelected = false } = {}) {
    if (destroyed || options.length === 0) {
      return;
    }
    globalThis.clearTimeout(closeTimer);
    listbox.removeEventListener("animationend", handleCloseAnimationEnd);
    delete element.dataset.closing;
    pendingFocusRestore = false;
    element.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    if (focusSelected) {
      focusOption(getSelectedIndex());
    }
  }

  function selectOption(index) {
    const option = options[index];
    if (!option) {
      return;
    }
    selectedValue = option.value;
    updateSelection();
    close({ restoreFocus: true });
    element.dispatchEvent(new Event("change"));
  }

  function handleListboxKeydown(event) {
    const optionElements = [...listbox.children];
    const currentIndex = optionElements.indexOf(document.activeElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(optionElements.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectOption(currentIndex);
        break;
      case "Escape":
        event.preventDefault();
        close({ restoreFocus: true });
        break;
      case "Tab":
        close();
        break;
    }
  }

  function handleDocumentPointerDown(event) {
    if (!element.contains(event.target)) {
      close();
    }
  }

  trigger.addEventListener("click", () => {
    if (element.dataset.open === "true") {
      close();
    } else {
      open();
    }
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && element.dataset.open === "true") {
      event.preventDefault();
      close();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      open({ focusSelected: true });
    }
  });
  listbox.addEventListener("keydown", handleListboxKeydown);
  document.addEventListener("pointerdown", handleDocumentPointerDown);

  return {
    close,
    element,
    focus: () => trigger.focus(),
    get value() {
      return selectedValue;
    },
    set value(nextValue) {
      selectedValue = options.some(({ value }) => value === nextValue)
        ? nextValue
        : options[0]?.value ?? "";
      updateSelection();
    },
    getLabel(value = selectedValue) {
      return options.find((option) => option.value === value)?.label ?? "";
    },
    setOptions(nextOptions) {
      options = nextOptions.map(({ label, value }) => ({ label, value }));
      listbox.replaceChildren(...options.map((option, index) => {
        const optionElement = createElement("button", {
          attributes: { role: "option", tabindex: "-1", type: "button" },
          className: "select-menu-option",
          textContent: option.label
        });
        optionElement.addEventListener("click", () => selectOption(index));
        return optionElement;
      }));
      if (!options.some(({ value }) => value === selectedValue)) {
        selectedValue = options[0]?.value ?? "";
      }
      updateSelection();
    },
    destroy() {
      destroyed = true;
      globalThis.clearTimeout(closeTimer);
      listbox.removeEventListener("animationend", handleCloseAnimationEnd);
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    }
  };
}
