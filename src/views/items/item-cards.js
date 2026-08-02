import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { createItemDisplayValue } from "./item-display-value.js";
import { createItemEmptyState } from "./item-empty-state.js";
import { getItemDisplayData } from "./item-display-model.js";
import { formatMissingFields } from "./item-missing-warning.js";
import { createItemThumbnail } from "./item-thumbnail.js";
import { createKeyedLayoutMotion } from "./keyed-layout-motion.js";

const CARD_MOTION_FALLBACK_MS = 220;
const MAX_CARD_MOTION_MS = 300;
const VISIBLE_FIELD_COUNT = 3;

function getCardAnimationOptions(element) {
  return {
    duration: Math.min(
      getCustomPropertyDurationMs(
        element,
        "--item-membership-duration",
        CARD_MOTION_FALLBACK_MS
      ),
      MAX_CARD_MOTION_MS
    ),
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fill: "both"
  };
}

function animateCard(element, direction) {
  if (prefersReducedMotion() || typeof element.animate !== "function") {
    return null;
  }
  const visible = { opacity: 1, scale: 1 };
  const hidden = { opacity: 0, scale: 0.96 };
  return element.animate(
    direction === "enter" ? [hidden, visible] : [visible, hidden],
    getCardAnimationOptions(element)
  );
}

function createCardValues(fieldValues) {
  const values = createElement("dl", { className: "item-card-values" });

  fieldValues.slice(0, VISIBLE_FIELD_COUNT).forEach(({ field, value }) => {
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

function createItemCard(item, fields, getAsset, onDeleteItem, onEditItem) {
  const element = createElement("article", {
    attributes: { role: "listitem" },
    className: "item-card",
    dataset: { itemId: item.id }
  });
  let currentItem = item;
  let thumbnail = null;

  function render(nextItem) {
    thumbnail?.destroy();
    currentItem = nextItem;
    const { fieldValues, missingRequiredFields } = getItemDisplayData(nextItem, fields);
    const body = createElement("div", { className: "item-card-body" });
    const heading = createElement("h4", {
      attributes: { title: nextItem.name },
      textContent: nextItem.name
    });
    const controls = createElement("div", { className: "item-card-controls" });
    const editButton = createElement("button", {
      attributes: {
        "aria-label": `Edit ${nextItem.name}`,
        title: "Edit item",
        type: "button"
      },
      className: "item-card-edit"
    });
    const deleteButton = createElement("button", {
      attributes: {
        "aria-label": `Delete ${nextItem.name}`,
        title: "Delete item",
        type: "button"
      },
      className: "item-card-delete"
    });
    thumbnail = createItemThumbnail(nextItem, getAsset, {
      className: "item-card-thumbnail"
    });

    editButton.append(createIcon("edit"));
    deleteButton.append(createIcon("delete"));
    editButton.addEventListener("click", () => onEditItem(nextItem));
    deleteButton.addEventListener("click", () => onDeleteItem(nextItem));
    controls.append(editButton, deleteButton);
    body.append(heading);

    if (missingRequiredFields.length > 0) {
      const message = formatMissingFields(missingRequiredFields);
      body.append(createElement("span", {
        attributes: { title: message },
        className: "item-card-warning",
        textContent: `${missingRequiredFields.length} missing field(s)`
      }));
    }
    if (fieldValues.length > 0) {
      body.append(createCardValues(fieldValues));
    }
    if (fieldValues.length > VISIBLE_FIELD_COUNT) {
      body.append(createElement("p", {
        className: "item-card-more",
        textContent: `+${fieldValues.length - VISIBLE_FIELD_COUNT} more fields`
      }));
    }
    element.replaceChildren(thumbnail.element, body, controls);
  }

  render(item);
  return {
    element,
    get item() {
      return currentItem;
    },
    destroy() {
      thumbnail?.destroy();
    },
    update(nextItem) {
      render(nextItem);
      if (!prefersReducedMotion() && typeof element.animate === "function") {
        element.animate([{ opacity: 0.55 }, { opacity: 1 }], getCardAnimationOptions(element));
      }
    }
  };
}

export function createItemCards(
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
    attributes: { "aria-label": "Collection item cards", role: "list" },
    className: "item-card-grid"
  });
  const cards = new Map();
  const animations = new Map();
  const layoutMotion = createKeyedLayoutMotion((itemId) => cards.get(itemId)?.element);
  let desiredItems = items;
  let desiredIds = new Set(items.map(({ id }) => id));
  let destroyed = false;
  let emptyState = null;
  let sourceItemCount = sourceItems.length;

  function removeEmptyState() {
    emptyState?.remove();
    emptyState = null;
  }

  function showEmptyState() {
    if (destroyed || desiredIds.size > 0 || animations.size > 0 || emptyState) {
      return;
    }
    emptyState = createItemEmptyState({
      hasSourceItems: sourceItemCount > 0,
      onClearFilters
    });
    element.append(emptyState);
    animateCard(emptyState, "enter");
  }

  function cancelAnimation(itemId) {
    animations.get(itemId)?.animation.cancel();
    animations.delete(itemId);
  }

  function hasExitingCards() {
    return [...animations.values()].some(({ direction }) => direction === "exit");
  }

  function freezeGridHeight() {
    if (!hasExitingCards()) {
      element.style.minHeight = `${element.offsetHeight}px`;
    }
  }

  function releaseGridHeight() {
    if (!hasExitingCards()) {
      element.style.minHeight = "";
    }
  }

  function takeCardOutOfFlow(card) {
    const cardRect = card.element.getBoundingClientRect();
    const gridRect = element.getBoundingClientRect();
    Object.assign(card.element.style, {
      height: `${cardRect.height}px`,
      left: `${cardRect.left - gridRect.left}px`,
      position: "absolute",
      top: `${cardRect.top - gridRect.top}px`,
      width: `${cardRect.width}px`,
      zIndex: "2"
    });
  }

  function restoreCardFlow(card) {
    ["height", "left", "position", "top", "width", "z-index"].forEach((property) => {
      card.element.style.removeProperty(property);
    });
  }

  function reorderCards(nextItems) {
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

    nextItems.forEach((item) => {
      const card = cards.get(item.id);
      if (card) {
        element.append(card.element);
      }
    });
  }

  function findInsertionReference(itemId) {
    const itemIndex = desiredItems.findIndex(({ id }) => id === itemId);
    return desiredItems
      .slice(itemIndex + 1)
      .map(({ id }) => cards.get(id)?.element)
      .find(Boolean) ?? null;
  }

  function animateReflow(previousPositions, itemIds) {
    layoutMotion.animate(previousPositions, itemIds.filter((itemId) => cards.has(itemId)));
  }

  function removeCard(itemId) {
    const card = cards.get(itemId);
    if (!card || animations.get(itemId)?.direction === "exit") {
      return;
    }
    cancelAnimation(itemId);
    freezeGridHeight();
    takeCardOutOfFlow(card);
    const animation = animateCard(card.element, "exit");
    if (!animation) {
      card.destroy();
      card.element.remove();
      cards.delete(itemId);
      releaseGridHeight();
      showEmptyState();
      return;
    }
    animations.set(itemId, { animation, direction: "exit" });
    animation.finished.then(() => {
      if (
        destroyed ||
        animations.get(itemId)?.animation !== animation ||
        desiredIds.has(itemId)
      ) {
        return;
      }
      animations.delete(itemId);
      card.destroy();
      card.element.remove();
      cards.delete(itemId);
      animation.cancel();
      releaseGridHeight();
      showEmptyState();
    }, () => {});
  }

  function addOrRestoreCard(item) {
    const existingCard = cards.get(item.id);
    if (existingCard) {
      if (existingCard.item !== item) {
        existingCard.update(item);
      }
      if (animations.has(item.id)) {
        cancelAnimation(item.id);
        restoreCardFlow(existingCard);
        element.insertBefore(existingCard.element, findInsertionReference(item.id));
        releaseGridHeight();
        const animation = animateCard(existingCard.element, "enter");
        if (animation) {
          animations.set(item.id, { animation, direction: "enter" });
          animation.finished.then(() => {
            if (animations.get(item.id)?.animation === animation) {
              animations.delete(item.id);
              animation.cancel();
            }
          }, () => {});
        }
      }
      return;
    }
    const card = createItemCard(item, fields, getAsset, onDeleteItem, onEditItem);
    cards.set(item.id, card);
    element.insertBefore(card.element, findInsertionReference(item.id));
    const animation = animateCard(card.element, "enter");
    if (animation) {
      animations.set(item.id, { animation, direction: "enter" });
      animation.finished.then(() => {
        if (animations.get(item.id)?.animation === animation) {
          animations.delete(item.id);
          animation.cancel();
        }
      }, () => {});
    }
  }

  function update(nextItems, nextSourceItems = nextItems) {
    if (destroyed) {
      return;
    }
    desiredItems = nextItems;
    desiredIds = new Set(nextItems.map(({ id }) => id));
    sourceItemCount = nextSourceItems.length;
    const existingIds = nextItems
      .map(({ id }) => id)
      .filter((itemId) => cards.has(itemId));
    const previousPositions = layoutMotion.capture(existingIds);
    if (desiredIds.size > 0) {
      removeEmptyState();
    }
    cards.forEach((_, itemId) => {
      if (!desiredIds.has(itemId)) {
        removeCard(itemId);
      }
    });
    nextItems.forEach(addOrRestoreCard);
    reorderCards(nextItems);
    animateReflow(previousPositions, existingIds);
    showEmptyState();
  }

  items.forEach((item) => {
    const card = createItemCard(item, fields, getAsset, onDeleteItem, onEditItem);
    cards.set(item.id, card);
    element.append(card.element);
  });
  showEmptyState();

  return {
    element,
    update,
    destroy() {
      destroyed = true;
      animations.forEach(({ animation }) => animation.cancel());
      animations.clear();
      layoutMotion.destroy();
      cards.forEach((card) => card.destroy());
      cards.clear();
      removeEmptyState();
    }
  };
}
