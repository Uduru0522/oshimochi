import {
  DEFAULT_ITEM_SORT,
  ITEM_SORT_DIRECTIONS,
  ITEM_SORT_METADATA,
  cloneItemSort
} from "../../application/items/sort-items.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  MAX_UI_MOTION_MS,
  getAnimationDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";

const CREATED_AT_VALUE = "metadata:createdAt";
const UPDATED_AT_VALUE = "metadata:updatedAt";

function isSortableField(field) {
  return field.dataType !== "image" && (!field.isBuiltIn || field.key === "name");
}

function serializeSort(sort) {
  return sort.type === "field" ? `field:${sort.fieldId}` : `metadata:${sort.key}`;
}

function parseSort(value, direction) {
  if (value.startsWith("field:")) {
    return { direction, fieldId: value.slice("field:".length), type: "field" };
  }

  return { direction, key: value.slice("metadata:".length), type: "metadata" };
}

function isDefaultSort(sort) {
  return sort.type === DEFAULT_ITEM_SORT.type &&
    sort.key === DEFAULT_ITEM_SORT.key &&
    sort.direction === DEFAULT_ITEM_SORT.direction;
}

export function createItemSortPanel({ onApply }) {
  const button = createElement("button", {
    attributes: { "aria-label": "Sort items", title: "Sort items", type: "button" },
    className: "secondary-action items-sort-action"
  });
  const buttonLabel = createElement("span", { textContent: "Sort" });
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemSortTitle" },
    className: "item-sort-dialog"
  });
  const header = createElement("header", { className: "item-sort-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemSortTitle" },
    textContent: "Sort items"
  });
  const closeButton = createElement("button", {
    attributes: { "aria-label": "Close item sorting", title: "Close", type: "button" },
    className: "item-entry-close"
  });
  const form = createElement("form", { className: "item-sort-form" });
  const fieldLabel = createElement("label", { className: "item-sort-field" });
  const fieldSelect = createElement("select", {
    attributes: { "aria-label": "Sort field" }
  });
  const directionGroup = createElement("fieldset", { className: "item-sort-direction" });
  const directionLegend = createElement("legend", { textContent: "Direction" });
  const ascendingLabel = createElement("label");
  const ascendingInput = createElement("input", {
    attributes: { name: "itemSortDirection", type: "radio", value: ITEM_SORT_DIRECTIONS.ASCENDING }
  });
  const descendingLabel = createElement("label");
  const descendingInput = createElement("input", {
    attributes: { name: "itemSortDirection", type: "radio", value: ITEM_SORT_DIRECTIONS.DESCENDING }
  });
  const footer = createElement("footer", { className: "item-sort-footer" });
  const resetButton = createActionButton("Reset");
  const cancelButton = createActionButton("Cancel");
  const applyButton = createActionButton("Apply sort", {
    className: "primary-action",
    type: "submit"
  });
  let activeSort = cloneItemSort();
  let closeTimer = 0;
  let destroyed = false;
  let fields = [];
  let isClosing = false;
  let pendingCloseAction = null;

  button.disabled = true;
  button.append(createIcon("sort"), buttonLabel);
  closeButton.append(createIcon("close"));
  fieldLabel.append(createElement("strong", { textContent: "Sort by" }), fieldSelect);
  ascendingLabel.append(ascendingInput, createElement("span", { textContent: "Ascending" }));
  descendingLabel.append(descendingInput, createElement("span", { textContent: "Descending" }));
  directionGroup.append(directionLegend, ascendingLabel, descendingLabel);
  const footerActions = createElement("div", { className: "item-sort-footer-actions" });
  footerActions.append(cancelButton, applyButton);
  footer.append(resetButton, footerActions);
  header.append(heading, closeButton);
  form.append(fieldLabel, directionGroup, footer);
  dialog.append(header, form);

  function renderOptions() {
    fieldSelect.replaceChildren(
      createElement("option", { attributes: { value: UPDATED_AT_VALUE }, textContent: "Last updated" }),
      createElement("option", { attributes: { value: CREATED_AT_VALUE }, textContent: "Date created" })
    );
    fields.filter(isSortableField).forEach((field) => {
      fieldSelect.append(createElement("option", {
        attributes: { value: `field:${field.id}` },
        textContent: field.displayName
      }));
    });
  }

  function updateButton() {
    const currentValue = serializeSort(activeSort);
    const selectedOption = [...fieldSelect.options].find(({ value }) => value === currentValue);
    const label = selectedOption?.textContent ?? "Sort";
    button.dataset.active = String(!isDefaultSort(activeSort));
    button.title = `Sort items: ${label}, ${activeSort.direction}`;
    button.setAttribute("aria-label", button.title);
  }

  function renderDraft(sort = activeSort) {
    const value = serializeSort(sort);
    fieldSelect.value = [...fieldSelect.options].some((option) => option.value === value)
      ? value
      : UPDATED_AT_VALUE;
    ascendingInput.checked = sort.direction === ITEM_SORT_DIRECTIONS.ASCENDING;
    descendingInput.checked = !ascendingInput.checked;
  }

  function runPendingCloseAction() {
    const action = pendingCloseAction;
    pendingCloseAction = null;
    action?.();
  }

  function finishClose() {
    if (!isClosing) {
      return;
    }
    globalThis.clearTimeout(closeTimer);
    dialog.removeEventListener("animationend", handleAnimationEnd);
    isClosing = false;
    delete dialog.dataset.closing;
    dialog.close();
    runPendingCloseAction();
  }

  function handleAnimationEnd(event) {
    if (event.target === dialog) {
      finishClose();
    }
  }

  function requestClose(afterClose = null) {
    if (isClosing || !dialog.open) {
      return;
    }
    pendingCloseAction = afterClose;
    if (prefersReducedMotion()) {
      dialog.close();
      runPendingCloseAction();
      return;
    }
    isClosing = true;
    dialog.dataset.closing = "true";
    dialog.addEventListener("animationend", handleAnimationEnd);
    closeTimer = globalThis.setTimeout(
      finishClose,
      getAnimationDurationMs(dialog, MAX_UI_MOTION_MS)
    );
  }

  resetButton.addEventListener("click", () => renderDraft(DEFAULT_ITEM_SORT));
  cancelButton.addEventListener("click", () => requestClose());
  closeButton.addEventListener("click", () => requestClose());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const direction = ascendingInput.checked
      ? ITEM_SORT_DIRECTIONS.ASCENDING
      : ITEM_SORT_DIRECTIONS.DESCENDING;
    activeSort = parseSort(fieldSelect.value, direction);
    updateButton();
    const appliedSort = cloneItemSort(activeSort);
    requestClose(() => onApply(appliedSort));
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });
  button.addEventListener("click", () => {
    if (!destroyed && !dialog.open) {
      renderDraft();
      dialog.showModal();
      globalThis.requestAnimationFrame(() => fieldSelect.focus());
    }
  });

  return {
    button,
    dialog,
    destroy() {
      destroyed = true;
      globalThis.clearTimeout(closeTimer);
      pendingCloseAction = null;
      dialog.removeEventListener("animationend", handleAnimationEnd);
      if (dialog.open) {
        dialog.close();
      }
    },
    setData(nextFields) {
      fields = [...nextFields];
      if (
        activeSort.type === "field" &&
        !fields.some((field) => field.id === activeSort.fieldId && isSortableField(field))
      ) {
        activeSort = cloneItemSort();
      }
      renderOptions();
      updateButton();
      button.disabled = false;
    }
  };
}
