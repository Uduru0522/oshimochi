import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  MAX_UI_MOTION_MS,
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { getItemDisplayData } from "./item-display-model.js";
import { createItemDisplayValue } from "./item-display-value.js";
import { createMissingFieldsWarning } from "./item-missing-warning.js";
import { createItemThumbnail } from "./item-thumbnail.js";

const ROW_MOTION_FALLBACK_MS = 140;

function createEmptyState() {
  const element = createElement("section", {
    className: "items-empty-state item-list-empty"
  });
  element.append(
    createElement("h4", { textContent: "No items to display" }),
    createElement("p", { textContent: "Items saved to this collection will appear here." })
  );
  return { destroy() {}, element };
}

function createFilteredEmptyState(onClearFilters) {
  const element = createElement("section", {
    className: "items-empty-state item-list-empty item-list-filter-empty"
  });
  const clearButton = createActionButton("Clear filters", { className: "secondary-action" });

  clearButton.addEventListener("click", onClearFilters);
  element.append(
    createElement("h4", { textContent: "No matching items" }),
    createElement("p", { textContent: "Adjust or clear the active filters." }),
    clearButton
  );
  return element;
}

function createFieldValues(fieldValues) {
  const values = createElement("dl", { className: "item-list-values" });

  fieldValues.forEach(({ field, value }) => {
    const description = createElement("dd");
    description.append(createItemDisplayValue(field, value));
    values.append(
      createElement("dt", {
        attributes: { title: field.displayName },
        textContent: field.displayName
      }),
      description
    );
  });
  return values;
}

function createItemListRow(item, fields, getAsset, onDeleteItem, onEditItem) {
  const element = createElement("article", {
    attributes: { role: "listitem" },
    className: "item-list-row",
    dataset: { itemId: item.id }
  });
  let currentItem = item;
  let thumbnail = null;
  let updateWarning = null;

  function render(nextItem) {
    thumbnail?.destroy();
    currentItem = nextItem;
    const copy = createElement("div", { className: "item-list-copy" });
    const title = createElement("h4");
    const itemName = createElement("span", {
      className: "item-list-name",
      textContent: nextItem.name
    });
    const { fieldValues, missingRequiredFields } = getItemDisplayData(nextItem, fields);
    const controls = createElement("div", { className: "item-list-controls" });
    const editButton = createElement("button", {
      attributes: {
        "aria-label": `Edit ${nextItem.name}`,
        title: "Edit item",
        type: "button"
      },
      className: "item-list-edit"
    });
    const deleteButton = createElement("button", {
      attributes: {
        "aria-label": `Delete ${nextItem.name}`,
        title: "Delete item",
        type: "button"
      },
      className: "item-list-delete"
    });
    thumbnail = createItemThumbnail(nextItem, getAsset);
    updateWarning = null;

    title.append(itemName);
    if (missingRequiredFields.length > 0) {
      const warning = createMissingFieldsWarning(missingRequiredFields, title, itemName);
      updateWarning = warning.updateLayout;
      title.append(warning.element);
    }
    copy.append(title);
    if (fieldValues.length > 0) {
      copy.append(createFieldValues(fieldValues));
    }
    editButton.append(createIcon("edit"));
    editButton.addEventListener("click", () => onEditItem(nextItem));
    deleteButton.append(createIcon("delete"));
    deleteButton.addEventListener("click", () => onDeleteItem(nextItem));
    controls.append(editButton, deleteButton);
    element.replaceChildren(thumbnail.element, copy, controls);
  }

  render(item);
  return {
    element,
    itemId: item.id,
    get item() {
      return currentItem;
    },
    destroy() {
      thumbnail?.destroy();
    },
    update(nextItem) {
      render(nextItem);
      if (!prefersReducedMotion() && typeof element.animate === "function") {
        element.animate([{ opacity: 0.55 }, { opacity: 1 }], getRowAnimationOptions(element));
      }
    },
    updateWarning() {
      updateWarning?.();
    }
  };
}

function getRowAnimationOptions(element) {
  return {
    duration: Math.min(
      getCustomPropertyDurationMs(element, "--motion-fast", ROW_MOTION_FALLBACK_MS),
      MAX_UI_MOTION_MS
    ),
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fill: "both"
  };
}

function animateRow(element, direction) {
  if (prefersReducedMotion() || typeof element.animate !== "function") {
    return null;
  }

  const height = element.offsetHeight;
  const expanded = {
    height: `${height}px`,
    minHeight: getComputedStyle(element).minHeight,
    opacity: 1,
    overflow: "hidden",
    paddingBottom: getComputedStyle(element).paddingBottom,
    paddingTop: getComputedStyle(element).paddingTop
  };
  const collapsed = {
    height: "0px",
    minHeight: "0px",
    opacity: 0,
    overflow: "hidden",
    paddingBottom: "0px",
    paddingTop: "0px"
  };

  return element.animate(
    direction === "enter" ? [collapsed, expanded] : [expanded, collapsed],
    getRowAnimationOptions(element)
  );
}

export function createItemList(
  items,
  fields,
  {
    getAsset,
    onClearFilters = () => {},
    onDeleteItem = () => {},
    onEditItem = () => {},
    sourceItems = items
  }
) {
  const element = createElement("div", {
    attributes: { "aria-label": "Collection items", role: "list" },
    className: "item-list"
  });
  let sourceOrder = new Map(sourceItems.map((item, index) => [item.id, index]));
  const rows = new Map();
  const rowAnimations = new Map();
  const rowMoveAnimations = new Map();
  let desiredIds = new Set(items.map(({ id }) => id));
  let destroyed = false;
  let emptyState = null;
  let sourceItemCount = sourceItems.length;

  const updateWarnings = () => {
    rows.forEach(({ updateWarning }) => updateWarning?.());
  };
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(updateWarnings)
    : null;
  let warningFrame = 0;

  function removeEmptyState() {
    emptyState?.remove();
    emptyState = null;
  }

  function showEmptyStateWhenSettled() {
    if (destroyed || desiredIds.size > 0 || rowAnimations.size > 0 || emptyState) {
      return;
    }
    emptyState = sourceItemCount === 0
      ? createEmptyState().element
      : createFilteredEmptyState(onClearFilters);
    element.append(emptyState);
    if (!prefersReducedMotion() && typeof emptyState.animate === "function") {
      emptyState.animate(
        [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }],
        getRowAnimationOptions(emptyState)
      );
    }
  }

  function cancelRowAnimation(itemId) {
    const transition = rowAnimations.get(itemId);
    if (!transition) {
      return;
    }
    rowAnimations.delete(itemId);
    transition.animation.cancel();
  }

  function cancelRowMoveAnimation(itemId) {
    rowMoveAnimations.get(itemId)?.cancel();
    rowMoveAnimations.delete(itemId);
  }

  function reorderRows(nextItems) {
    const nextIds = nextItems.map(({ id }) => id);
    const currentIds = [...element.children]
      .map((child) => child.dataset?.itemId)
      .filter((itemId) => desiredIds.has(itemId));

    if (
      nextIds.length === currentIds.length &&
      nextIds.every((itemId, index) => itemId === currentIds[index])
    ) {
      return;
    }

    const previousPositions = new Map(nextIds.flatMap((itemId) => {
      const row = rows.get(itemId);
      return row ? [[itemId, row.element.getBoundingClientRect()]] : [];
    }));

    nextIds.forEach((itemId) => {
      const row = rows.get(itemId);
      if (row) {
        element.append(row.element);
      }
    });

    if (prefersReducedMotion()) {
      return;
    }

    nextIds.forEach((itemId) => {
      const row = rows.get(itemId);
      const previousPosition = previousPositions.get(itemId);
      if (!row || !previousPosition || typeof row.element.animate !== "function") {
        return;
      }

      const nextPosition = row.element.getBoundingClientRect();
      const offsetY = previousPosition.top - nextPosition.top;
      if (Math.abs(offsetY) < 1) {
        return;
      }

      cancelRowMoveAnimation(itemId);
      const animation = row.element.animate(
        [{ transform: `translateY(${offsetY}px)` }, { transform: "translateY(0)" }],
        getRowAnimationOptions(row.element)
      );
      rowMoveAnimations.set(itemId, animation);
      animation.finished.then(() => {
        if (rowMoveAnimations.get(itemId) === animation) {
          rowMoveAnimations.delete(itemId);
          animation.cancel();
        }
      }, () => {});
    });
  }

  function finishRemovingRow(itemId, animation) {
    if (
      destroyed ||
      rowAnimations.get(itemId)?.animation !== animation ||
      desiredIds.has(itemId)
    ) {
      return;
    }
    rowAnimations.delete(itemId);
    const row = rows.get(itemId);
    row?.destroy();
    row?.element.remove();
    rows.delete(itemId);
    animation.cancel();
    showEmptyStateWhenSettled();
  }

  function removeRow(itemId) {
    const row = rows.get(itemId);
    if (!row || rowAnimations.get(itemId)?.direction === "exit") {
      return;
    }
    cancelRowAnimation(itemId);
    const animation = animateRow(row.element, "exit");
    if (!animation) {
      row.destroy();
      row.element.remove();
      rows.delete(itemId);
      showEmptyStateWhenSettled();
      return;
    }
    rowAnimations.set(itemId, { animation, direction: "exit" });
    animation.finished
      .then(() => finishRemovingRow(itemId, animation))
      .catch(() => {});
  }

  function findInsertionReference(itemId) {
    const itemIndex = sourceOrder.get(itemId) ?? Number.MAX_SAFE_INTEGER;
    return [...element.children].find((child) => {
      const childId = child.dataset?.itemId;
      return childId && (sourceOrder.get(childId) ?? Number.MAX_SAFE_INTEGER) > itemIndex;
    }) ?? null;
  }

  function addOrRestoreRow(item) {
    const existingRow = rows.get(item.id);
    if (existingRow) {
      if (existingRow.item !== item) {
        existingRow.update(item);
      }
      if (rowAnimations.has(item.id)) {
        cancelRowAnimation(item.id);
        const animation = animateRow(existingRow.element, "enter");
        if (animation) {
          rowAnimations.set(item.id, { animation, direction: "enter" });
          animation.finished.then(() => {
            if (rowAnimations.get(item.id)?.animation === animation) {
              rowAnimations.delete(item.id);
              animation.cancel();
            }
          }, () => {});
        }
      }
      return;
    }

    const row = createItemListRow(item, fields, getAsset, onDeleteItem, onEditItem);
    rows.set(item.id, row);
    element.insertBefore(row.element, findInsertionReference(item.id));
    const animation = animateRow(row.element, "enter");
    if (animation) {
      rowAnimations.set(item.id, { animation, direction: "enter" });
      animation.finished.then(() => {
        if (rowAnimations.get(item.id)?.animation === animation) {
          rowAnimations.delete(item.id);
          animation.cancel();
        }
      }, () => {});
    }
  }

  function update(nextItems, nextSourceItems = nextItems) {
    if (destroyed) {
      return;
    }
    sourceOrder = new Map(nextSourceItems.map((item, index) => [item.id, index]));
    sourceItemCount = nextSourceItems.length;
    desiredIds = new Set(nextItems.map(({ id }) => id));
    if (desiredIds.size > 0) {
      removeEmptyState();
    }
    rows.forEach((_, itemId) => {
      if (!desiredIds.has(itemId)) {
        removeRow(itemId);
      }
    });
    nextItems.forEach(addOrRestoreRow);
    reorderRows(nextItems);
    warningFrame = globalThis.requestAnimationFrame(updateWarnings);
    showEmptyStateWhenSettled();
  }

  items.forEach((item) => {
    const row = createItemListRow(item, fields, getAsset, onDeleteItem, onEditItem);
    rows.set(item.id, row);
    element.append(row.element);
  });
  if (items.length === 0) {
    showEmptyStateWhenSettled();
  }
  resizeObserver?.observe(element);
  warningFrame = globalThis.requestAnimationFrame(updateWarnings);

  return {
    element,
    update,
    destroy() {
      destroyed = true;
      rowAnimations.forEach(({ animation }) => animation.cancel());
      rowAnimations.clear();
      rowMoveAnimations.forEach((animation) => animation.cancel());
      rowMoveAnimations.clear();
      rows.forEach(({ destroy }) => destroy());
      rows.clear();
      resizeObserver?.disconnect();
      globalThis.cancelAnimationFrame(warningFrame);
      removeEmptyState();
    }
  };
}
