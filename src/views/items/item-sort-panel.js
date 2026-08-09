import {
  DEFAULT_ITEM_SORT,
  ITEM_SORT_DIRECTIONS,
  ITEM_SORT_METADATA,
  cloneItemSort
} from "../../application/items/sort-items.js";
import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { createSelectMenu } from "../../shared/select-menu.js";
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
    attributes: {
      "aria-label": translate("Sort items"),
      title: translate("Sort items"),
      type: "button"
    },
    className: "secondary-action items-sort-action"
  });
  const buttonLabel = createElement("span", { textContent: translate("Sort") });
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemSortTitle" },
    className: "item-sort-dialog"
  });
  const header = createElement("header", { className: "item-sort-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemSortTitle" },
    textContent: translate("Sort items")
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close item sorting"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const form = createElement("form", { className: "item-sort-form" });
  const fieldLabel = createElement("div", { className: "item-sort-field" });
  const fieldSelect = createSelectMenu({
    ariaLabel: translate("Sort field"),
    emptyLabel: translate("Select...")
  });
  const directionGroup = createElement("fieldset", { className: "item-sort-direction" });
  const directionLegend = createElement("legend", {
    textContent: translate("Direction")
  });
  const ascendingLabel = createElement("label");
  const ascendingInput = createElement("input", {
    attributes: { name: "itemSortDirection", type: "radio", value: ITEM_SORT_DIRECTIONS.ASCENDING }
  });
  const descendingLabel = createElement("label");
  const descendingInput = createElement("input", {
    attributes: { name: "itemSortDirection", type: "radio", value: ITEM_SORT_DIRECTIONS.DESCENDING }
  });
  const footer = createElement("footer", { className: "item-sort-footer" });
  const resetButton = createActionButton(translate("Reset"));
  const cancelButton = createActionButton(translate("Cancel"));
  const applyButton = createActionButton(translate("Apply sort"), {
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
  fieldLabel.append(
    createElement("strong", { textContent: translate("Sort by") }),
    fieldSelect.element
  );
  ascendingLabel.append(
    ascendingInput,
    createElement("span", { textContent: translate("Ascending") })
  );
  descendingLabel.append(
    descendingInput,
    createElement("span", { textContent: translate("Descending") })
  );
  directionGroup.append(directionLegend, ascendingLabel, descendingLabel);
  const footerActions = createElement("div", { className: "item-sort-footer-actions" });
  footerActions.append(cancelButton, applyButton);
  footer.append(resetButton, footerActions);
  header.append(heading, closeButton);
  form.append(fieldLabel, directionGroup, footer);
  dialog.append(header, form);

  function renderOptions() {
    fieldSelect.setOptions([
      { value: UPDATED_AT_VALUE, label: translate("Last updated") },
      { value: CREATED_AT_VALUE, label: translate("Date created") },
      ...fields.filter(isSortableField).map((field) => ({
        value: `field:${field.id}`,
        label: field.displayName
      }))
    ]);
  }

  function updateButton() {
    const currentValue = serializeSort(activeSort);
    const label = fieldSelect.getLabel(currentValue) || translate("Sort");
    button.dataset.active = String(!isDefaultSort(activeSort));
    button.title = translate("Sort items: {field}, {direction}", {
      field: label,
      direction: translate(activeSort.direction)
    });
    button.setAttribute("aria-label", button.title);
  }

  function renderDraft(sort = activeSort) {
    const value = serializeSort(sort);
    fieldSelect.value = value;
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
    fieldSelect.close();
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
      fieldSelect.destroy();
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
